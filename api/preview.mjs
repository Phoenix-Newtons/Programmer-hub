/**
 * Vercel serverless function: GET /api/preview?url=https://example.com
 *
 * This is the production home of the link-preview snapshot endpoint on
 * Vercel (the Express twin lives at the same path in
 * server/preview-proxy.mjs for local/container hosting). It reuses the
 * exact same screenshot service, so behaviour — SSRF gate, metadata,
 * challenge detection, JSON shape — is identical in both worlds.
 *
 * Why it no longer 502s with "No Chrome/Chromium found":
 * on Vercel/Lambda there is no system Chrome and the 150 MB `puppeteer`
 * bundle is the wrong tool. The service auto-detects the serverless
 * runtime and switches to `@sparticuz/chromium-min`: at cold start it
 * downloads the version-matched Chromium pack tarball
 * (CHROMIUM_PACK_URL, default: the Sparticuz GitHub release) to /tmp,
 * extracts it once per warm instance, and launches it via
 * `puppeteer-core`. The browser is closed after every capture.
 *
 * Platform config lives in vercel.json → functions."api/preview.mjs"
 * (maxDuration 60s: a 25s navigation budget + cold-start pack download
 * must fit comfortably inside the function limit).
 *
 * Response: 200 { ok, title, metadata, screenshotBase64, mimeType }
 *           409 { ok:false, code:"CHALLENGE_DETECTED", screenshotUrl }
 *           400/403 invalid or disallowed URL · 502/503 upstream/browser
 */

import { createScreenshotService } from "../server/screenshot-service.mjs";
import { parseTargetUrl } from "../server/proxy-core.mjs";

// One service per warm instance: the extracted Chromium pack in /tmp is
// reused across invocations, while the browser itself is closed after
// every capture (serverless mode never pools browsers).
const screenshots = createScreenshotService({
  config: {
    browserMode: "serverless",
    maxConcurrency: Number(process.env.PREVIEW_MAX_CONCURRENCY) || 2,
    navigationTimeoutMs: Number(process.env.PREVIEW_TIMEOUT_MS) || 25_000,
    settleMs: Number(process.env.PREVIEW_SETTLE_MS) || 1_500,
    perRequestBrowser: true,
  },
});

const GATE = {
  allowedHosts: (process.env.PROXY_ALLOWED_HOSTS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
  allowPrivate: process.env.PROXY_ALLOW_PRIVATE === "true",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const rawUrl = req.query?.url || new URL(req.url || "", "http://localhost").searchParams.get("url") || "";
  const parsed = parseTargetUrl(rawUrl);
  if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.error });

  try {
    const result = await screenshots.capturePreview(parsed.url, { gateConfig: GATE });
    // Snapshots of public pages are cacheable at the edge for a few minutes.
    if (result.ok) res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=60");
    return res.status(result.ok ? 200 : 409).json(result);
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      code: error.code || "PREVIEW_FAILED",
      error: error.message || "Preview failed.",
      url: parsed.url.href,
    });
  }
}
