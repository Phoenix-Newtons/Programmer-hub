/**
 * Programmer's Hub — website preview reverse proxy (Express + native fetch).
 *
 *   npm run proxy            # http://localhost:8787  (demo UI at /)
 *   GET /proxy?url=https://example.com
 *
 * WHY THIS EXISTS
 * ---------------
 * Many sites send `X-Frame-Options` / CSP `frame-ancestors`, so the hub's
 * project viewer cannot frame them directly. This proxy fetches the page
 * server-side, strips the framing-block headers, rewrites the HTML with a
 * `<base>` tag, and serves it to a *sandboxed* iframe.
 *
 * ⚠ SECURITY — READ BEFORE DEPLOYING (see also server/proxy-core.mjs)
 * ------------------------------------------------------------------
 *  1. Serve this on a SEPARATE origin/subdomain from the authenticated app
 *     (e.g. preview.yourdomain), never the same origin: proxied third-party
 *     scripts must not share your app's origin/cookie context.
 *  2. The consuming iframe must be sandboxed WITHOUT allow-same-origin
 *     (`sandbox="allow-scripts allow-forms allow-popups"`), so proxied
 *     scripts run in an opaque origin and cannot reach the parent page,
 *     its DOM, or its storage.
 *  3. Set PROXY_ALLOWED_HOSTS in production (comma list, `*.example.com`
 *     wildcards supported). Unrestricted, this endpoint is an open proxy:
 *     phishing pages could be hosted under your domain and internal
 *     services probed. Private/loopback/metadata addresses are blocked
 *     regardless (SSRF guard), redirects are re-validated hop by hop,
 *     cookies/auth headers are never forwarded, upstream Set-Cookie is
 *     dropped, and bodies are size- and time-capped.
 *  4. Only GET/HEAD are proxied — this is a read-only preview, not a
 *     general-purpose tunnel.
 *
 * Environment:
 *   PORT                    listen port (default 8787)
 *   PROXY_ALLOWED_HOSTS     e.g. "example.com,*.vercel.app,*.netlify.app"
 *   PROXY_ALLOW_PRIVATE     "true" → allow localhost/private targets (DEV ONLY)
 *   PROXY_FRAME_ANCESTORS   extra origins allowed to frame the output,
 *                           e.g. "https://programmer-hub.example" (default:
 *                           'self' + local Vite dev origins)
 *   PROXY_TIMEOUT_MS        upstream timeout (default 10000)
 *   PROXY_MAX_BYTES         upstream body cap (default 5242880)
 */

import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertSafeTarget,
  buildForwardHeaders,
  filterResponseHeaders,
  parseTargetUrl,
  rewriteHtml,
} from "./proxy-core.mjs";
import { createScreenshotService } from "./screenshot-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_FRAME_ANCESTORS = [
  "'self'",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function configFromEnv(env = process.env) {
  return {
    allowedHosts: (env.PROXY_ALLOWED_HOSTS || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    allowPrivate: env.PROXY_ALLOW_PRIVATE === "true",
    timeoutMs: Number(env.PROXY_TIMEOUT_MS) || 10_000,
    maxBytes: Number(env.PROXY_MAX_BYTES) || 5 * 1024 * 1024,
    frameAncestors: env.PROXY_FRAME_ANCESTORS
      ? env.PROXY_FRAME_ANCESTORS.split(/\s+/).filter(Boolean)
      : DEFAULT_FRAME_ANCESTORS,
    // /api/preview headless-Chrome snapshots
    screenshotMaxConcurrency: Number(env.PREVIEW_MAX_CONCURRENCY) || 3,
    screenshotTimeoutMs: Number(env.PREVIEW_TIMEOUT_MS) || 30_000,
    screenshotSettleMs: Number(env.PREVIEW_SETTLE_MS) || 1_500,
    perRequestBrowser: env.PREVIEW_BROWSER_PER_REQUEST === "true",
  };
}

/* Tiny fixed-window rate limit: previews are expensive upstream fetches. */
function rateLimit({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const bucket = hits.get(key) || { start: now, count: 0 };
    if (now - bucket.start > windowMs) {
      bucket.start = now;
      bucket.count = 0;
    }
    bucket.count += 1;
    hits.set(key, bucket);
    if (bucket.count > max) {
      return res.status(429).json({ error: "Too many preview requests — slow down." });
    }
    return next();
  };
}

/** Reads an upstream body with a hard byte cap (never buffers unboundedly). */
async function readBodyCapped(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      const error = new Error("Upstream response is too large to preview.");
      error.status = 413;
      throw error;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches the target, following redirects manually so EVERY hop goes
 * through the SSRF/allowlist gate again (a public URL must not be able to
 * bounce the proxy into the internal network).
 */
async function fetchTarget(initialUrl, config, incomingHeaders, fetchFn) {
  let url = initialUrl;
  for (let hop = 0; hop <= 5; hop += 1) {
    const gate = await assertSafeTarget(url, config);
    if (!gate.ok) {
      const error = new Error(gate.error);
      error.status = 403;
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    let response;
    try {
      response = await fetchFn(url, {
        method: "GET",
        headers: buildForwardHeaders(incomingHeaders),
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (cause) {
      const error = new Error(
        cause?.name === "AbortError"
          ? "The target site took too long to respond."
          : "Could not reach the target site."
      );
      error.status = 502;
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) {
      url = new URL(response.headers.get("location"), url);
      continue; // loop re-validates the new host before fetching it
    }
    return { response, finalUrl: url };
  }
  const error = new Error("Too many redirects.");
  error.status = 502;
  throw error;
}

/**
 * Builds the Express app. `fetchFn` / `config` are injectable so tests can
 * run the whole proxy against a stub upstream without a network.
 */
export function createProxyApp({
  fetchFn = fetch,
  config = configFromEnv(),
  serveDemo = true,
  screenshotService = null,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);

  const screenshots =
    screenshotService ||
    createScreenshotService({
      config: {
        maxConcurrency: config.screenshotMaxConcurrency,
        navigationTimeoutMs: config.screenshotTimeoutMs,
        settleMs: config.screenshotSettleMs,
        perRequestBrowser: config.perRequestBrowser,
      },
    });
  app.locals.closeScreenshotBrowser = screenshots.closeBrowser;

  app.get("/healthz", (req, res) => res.json({ ok: true, service: "programmers-hub-preview-proxy" }));

  if (serveDemo) {
    app.use(express.static(path.join(__dirname, "public"), { index: "index.html", maxAge: "1h" }));
  }

  /**
   * GET /api/preview?url= — headless-Chrome snapshot + OG metadata as JSON.
   * Bot-challenge interstitials return 409 CHALLENGE_DETECTED with a
   * fallback image URL (detected, never evaded). Stricter rate limit:
   * every call launches real page renders.
   */
  app.get("/api/preview", rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
    const parsed = parseTargetUrl(req.query.url);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });
    try {
      const result = await screenshots.capturePreview(parsed.url, { gateConfig: config });
      return res.status(result.ok ? 200 : 409).json(result);
    } catch (error) {
      return res.status(error.status || 502).json({
        ok: false,
        code: error.code || "PREVIEW_FAILED",
        error: error.message || "Preview failed.",
        url: parsed.url.href,
      });
    }
  });

  app.get("/proxy", rateLimit(), async (req, res) => {
    const parsed = parseTargetUrl(req.query.url);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    try {
      const { response, finalUrl } = await fetchTarget(parsed.url, config, req.headers, fetchFn);
      const upstreamHeaders = {};
      response.headers.forEach((value, key) => {
        upstreamHeaders[key] = value;
      });
      const headers = filterResponseHeaders(upstreamHeaders);

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const isHtml = /text\/html/i.test(contentType);

      const body = await readBodyCapped(response, config.maxBytes);

      for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);

      // Our own framing policy replaces the stripped one: only the hub
      // (and local dev origins) may frame the preview — not the open web.
      res.setHeader("content-security-policy", `frame-ancestors ${config.frameAncestors.join(" ")}`);
      res.setHeader("x-content-type-options", "nosniff");
      res.setHeader("cache-control", "no-store");

      if (!isHtml) {
        // CSS/JS/images/fonts pass through untouched (headers still stripped).
        res.setHeader("content-type", contentType);
        return res.status(response.status).send(body);
      }

      const html = body.toString("utf8");
      const rewritten = rewriteHtml(html, finalUrl.href);
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.status(200).send(rewritten);
    } catch (error) {
      const status = error.status || 502;
      return res.status(status).json({ error: error.message || "Preview failed." });
    }
  });

  // JSON 404 for everything else (the demo UI is served by static above).
  app.use((req, res) => res.status(404).json({ error: "Not found." }));

  return app;
}

/* ------------------------------------------------------------------ */
/*  Standalone entry point                                             */
/* ------------------------------------------------------------------ */

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT) || 8787;
  const app = createProxyApp();
  const server = app.listen(port, "0.0.0.0", () => {
    console.info(`Programmer's Hub preview proxy → http://localhost:${port}`);
    console.info(`Demo UI:  http://localhost:${port}/`);
    console.info(`Endpoint: http://localhost:${port}/proxy?url=https://example.com`);
    if (!process.env.PROXY_ALLOWED_HOSTS) {
      console.warn(
        "⚠ PROXY_ALLOWED_HOSTS is unset — any public host may be proxied (fine for local dev, set it in production)."
      );
    }
    // Keep the demo page next to this file even if cwd differs.
    readFile(path.join(__dirname, "public", "index.html"), "utf8").catch(() =>
      console.warn("⚠ server/public/index.html not found — demo UI disabled.")
    );
  });

  // Never leak the pooled Chrome on shutdown.
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await app.locals.closeScreenshotBrowser?.().catch(() => {});
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    });
  }
}

export default createProxyApp;
