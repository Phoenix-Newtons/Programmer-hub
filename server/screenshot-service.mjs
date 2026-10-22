/**
 * Headless-Chrome snapshot service behind `GET /api/preview?url=`.
 *
 * Design:
 *  - ONE pooled browser (launched lazily), a fresh page per request, and
 *    the page is closed in `finally` — no zombie Chrome processes. The
 *    browser itself is closed on process shutdown, or per request when
 *    PREVIEW_BROWSER_PER_REQUEST=true.
 *  - A small semaphore caps concurrent pages so a burst of previews can't
 *    exhaust container memory.
 *  - Navigation uses the browser's genuine UA/UA-CH (a real Chromium sends
 *    coherent headers on its own; hand-forging `sec-ch-ua` to impersonate
 *    a different browser is both detectable and out of scope). Only
 *    Accept-Language is pinned.
 *  - Bot-challenge interstitials are DETECTED and reported
 *    (CHALLENGE_DETECTED + fallback image). They are not evaded.
 *
 * Browser resolution order:
 *  1. `puppeteer` (full package, if the operator installed it),
 *  2. `puppeteer-core` + PUPPETEER_EXECUTABLE_PATH,
 *  3. `puppeteer-core` + common system Chrome/Chromium paths.
 */

import { existsSync } from "node:fs";
import { isChallengePage, extractMetadata, buildPreviewResult } from "./preview-core.mjs";
import { assertSafeTarget } from "./proxy-core.mjs";

const SYSTEM_BROWSERS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const LAUNCH_ARGS = [
  // Required to run as root / inside containers & CI (runtime flags, and
  // the standard set every Docker Puppeteer image uses).
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1280,720",
];

async function loadBrowserFactory() {
  // Full puppeteer first: it manages its own Chromium download. Loaded via
  // a variable specifier so bundlers/test runners don't try to resolve the
  // optional package at build time.
  try {
    const fullSpec = "puppeteer";
    const full = await import(/* @vite-ignore */ fullSpec);
    return { launch: (options) => (full.default || full).launch(options), needsPath: false };
  } catch {
    /* fall through to puppeteer-core */
  }
  const core = await import("puppeteer-core");
  const executablePath = SYSTEM_BROWSERS.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    const error = new Error(
      "No Chrome/Chromium found for snapshots. Install it with `npm install puppeteer` " +
        "(downloads Chromium) or set PUPPETEER_EXECUTABLE_PATH to a system Chrome."
    );
    error.status = 503;
    error.code = "BROWSER_UNAVAILABLE";
    throw error;
  }
  return {
    launch: (options) => (core.default || core).launch({ ...options, executablePath }),
    needsPath: true,
  };
}

/** Minimal counting semaphore with a bounded wait queue. */
function createSemaphore(max, queueTimeoutMs = 15000) {
  let active = 0;
  const waiters = [];
  return async function acquire() {
    if (active < max) {
      active += 1;
      return () => release();
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Preview queue is full — try again shortly.")),
        queueTimeoutMs
      );
      waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    active += 1;
    return () => release();
  };
  function release() {
    active -= 1;
    waiters.shift()?.();
  }
}

export function createScreenshotService({
  launchBrowser, // injectable for tests: async () => browser
  config = {},
} = {}) {
  const maxConcurrency = Number(config.maxConcurrency) || 3;
  const navigationTimeoutMs = Number(config.navigationTimeoutMs) || 30_000;
  const settleMs = Number(config.settleMs) || 1_500;
  const perRequestBrowser = Boolean(config.perRequestBrowser);
  const acquire = createSemaphore(maxConcurrency);

  let browserPromise = null;

  async function getBrowser() {
    if (launchBrowser) return launchBrowser();
    if (!browserPromise) {
      browserPromise = loadBrowserFactory()
        .then((factory) => factory.launch({ headless: true, args: LAUNCH_ARGS }))
        .catch((error) => {
          browserPromise = null; // never cache a failed launch
          throw error;
        });
    }
    const browser = await browserPromise;
    if (browser.isConnected?.() === false) {
      browserPromise = null;
      return getBrowser();
    }
    return browser;
  }

  async function closeBrowser() {
    if (!browserPromise) return;
    const pending = browserPromise;
    browserPromise = null;
    try {
      const browser = await pending;
      await browser.close();
    } catch {
      /* already gone */
    }
  }

  /**
   * Captures one preview. Always closes its page (and the browser too in
   * per-request mode), whatever happens.
   */
  async function capturePreview(targetUrl, { gateConfig = {} } = {}) {
    // SSRF/allowlist gate before a browser ever touches the URL.
    const gate = await assertSafeTarget(targetUrl, gateConfig);
    if (!gate.ok) {
      const error = new Error(gate.error);
      error.status = 403;
      throw error;
    }

    const release = await acquire();
    let browser;
    let page;
    try {
      browser = await getBrowser();
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      // Pin language; UA/UA-CH come from the real Chromium itself.
      await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });

      const response = await page.goto(targetUrl.href, {
        waitUntil: "networkidle2",
        timeout: navigationTimeoutMs,
      });
      // Let late JS / consent banners / challenge scripts settle.
      await new Promise((resolve) => setTimeout(resolve, settleMs));

      const [title, html, metadata] = await Promise.all([
        page.title().catch(() => ""),
        page.content().catch(() => ""),
        page
          .evaluate(() => {
            const pick = (selector) => document.querySelector(selector)?.getAttribute("content") || "";
            return {
              title: pick('meta[property="og:title"]') || document.title || "",
              description:
                pick('meta[property="og:description"]') ||
                pick('meta[name="description"]') ||
                pick('meta[name="twitter:description"]'),
              image: pick('meta[property="og:image"]') || pick('meta[name="twitter:image"]'),
              siteName: pick('meta[property="og:site_name"]'),
              type: pick('meta[property="og:type"]'),
              themeColor: pick('meta[name="theme-color"]'),
            };
          })
          .catch(() => extractMetadata("", targetUrl.href)),
      ]);

      const finalUrl = page.url() || targetUrl.href;
      const mergedMetadata = {
        ...extractMetadata(html, finalUrl),
        ...Object.fromEntries(Object.entries(metadata).filter(([, value]) => value)),
        title: metadata.title || title || extractMetadata(html, finalUrl).title,
      };
      if (mergedMetadata.image) {
        try {
          mergedMetadata.image = new URL(mergedMetadata.image, finalUrl).href;
        } catch {
          /* keep */
        }
      }

      // A challenge interstitial is not the page: report, don't capture.
      if (isChallengePage({ title: mergedMetadata.title, url: finalUrl, html })) {
        return buildPreviewResult({ url: finalUrl, metadata: mergedMetadata, challenge: true });
      }
      if (response && response.status() >= 400) {
        const error = new Error(`The target responded with HTTP ${response.status()}.`);
        error.status = 502;
        throw error;
      }

      const screenshot = await page.screenshot({ type: "png" });
      const screenshotBase64 = Buffer.from(screenshot).toString("base64");
      return buildPreviewResult({ url: finalUrl, metadata: mergedMetadata, screenshotBase64 });
    } finally {
      // The anti-zombie guarantee: the page always closes; in per-request
      // mode the browser does too.
      await page?.close().catch(() => {});
      if (perRequestBrowser || launchBrowser) await browser?.close().catch(() => {});
      release();
    }
  }

  return { capturePreview, closeBrowser };
}

export default createScreenshotService;
