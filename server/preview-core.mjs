/**
 * Pure helpers for the headless-Chrome preview endpoint (`/api/preview`).
 *
 * Deliberate scope: this renders pages that permit automated access and
 * extracts their public link-preview metadata. It does NOT spoof browser
 * fingerprints or solve/evade bot challenges — when a Cloudflare (or
 * similar) interstitial is detected, callers surface that honestly with a
 * fallback instead of trying to defeat it. For your own properties, the
 * supported fixes are a Cloudflare WAF/bot allowlist rule for your
 * preview service, an origin/staging URL, or the provider's official API.
 */

/** Markers that reliably identify a bot-challenge interstitial. */
const CHALLENGE_MARKERS = [
  "just a moment...",
  "checking your browser",
  "verify you are human",
  "challenges.cloudflare.com",
  "cf-challenge",
  "attention required! | cloudflare",
  "please complete the security check",
  "ddos protection by cloudflare",
];

/** True when the rendered page is a bot-challenge interstitial, not content. */
export function isChallengePage({ title = "", url = "", html = "" } = {}) {
  const haystack = `${title}\n${url}\n${String(html).slice(0, 20000)}`.toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => haystack.includes(marker));
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html, names) {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match?.[1]) return decodeEntities(match[1]);
    }
  }
  return "";
}

/**
 * Extracts link-preview metadata from raw HTML (used before/without a
 * browser render, and as the shape the browser path returns too).
 */
export function extractMetadata(html = "", pageUrl = "") {
  const source = String(html);
  const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(source);
  const title = metaContent(source, ["og:title", "twitter:title"]) || decodeEntities(titleMatch?.[1] || "");
  const metadata = {
    title,
    description: metaContent(source, ["og:description", "twitter:description", "description"]),
    image: metaContent(source, ["og:image", "twitter:image"]),
    siteName: metaContent(source, ["og:site_name"]),
    type: metaContent(source, ["og:type"]),
    themeColor: metaContent(source, ["theme-color"]),
  };
  // Resolve a relative og:image against the page URL.
  if (metadata.image && pageUrl) {
    try {
      metadata.image = new URL(metadata.image, pageUrl).href;
    } catch {
      /* keep as-is */
    }
  }
  return metadata;
}

/** Public screenshot-service fallback (same provider the React viewer uses). */
export function fallbackScreenshotUrl(url, width = 1280) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return `https://s0.wp.com/mshots/v1/${encodeURIComponent(parsed.href)}?w=${width}`;
  } catch {
    return "";
  }
}

/**
 * Shapes the `/api/preview` JSON response.
 *
 * Success:  { ok: true, url, title, metadata, screenshotBase64, mimeType }
 * Blocked:  { ok: false, code: "CHALLENGE_DETECTED", error, url,
 *             screenshotUrl } — the client renders screenshotUrl instead of
 *             a blank/broken image, and the message tells the site owner
 *             how to allowlist their own property legitimately.
 */
export function buildPreviewResult({ url, metadata = {}, screenshotBase64 = null, challenge = false }) {
  if (challenge) {
    return {
      ok: false,
      code: "CHALLENGE_DETECTED",
      error:
        "This site is showing a bot-protection challenge to automated browsers, so no snapshot was captured. " +
        "If this is your site, allowlist the preview service in your Cloudflare WAF/Bot settings or preview its origin/staging URL; otherwise use the fallback image.",
      url,
      screenshotUrl: fallbackScreenshotUrl(url),
    };
  }
  return {
    ok: true,
    url,
    title: metadata.title || "",
    metadata,
    screenshotBase64,
    mimeType: screenshotBase64 ? "image/png" : null,
    screenshotUrl: screenshotBase64 ? null : fallbackScreenshotUrl(url),
  };
}
