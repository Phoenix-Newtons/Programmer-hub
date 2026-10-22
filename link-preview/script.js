/**
 * Frontend-only link preview.
 *
 * Architecture: there is no backend. The browser asks Microlink's public
 * screenshot API to render the target page and streams the resulting PNG
 * straight into an <img> via the `embed=screenshot.url` parameter, which
 * makes the API return image bytes instead of JSON. That removes the
 * whole class of Vercel failures this replaces:
 *   - no serverless function → no 10–60s execution timeout,
 *   - no Chromium download → no "No Chrome/Chromium found", no 250MB bundle,
 *   - no self-hosted proxy → nothing to 502.
 *
 * The pure helpers (normaliseUrl, buildScreenshotUrl, buildMetaUrl) are
 * exported for unit tests when loaded under Node/Vitest; in the browser
 * the export guard at the bottom is a no-op.
 */

"use strict";

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Cleans user input into an absolute http(s) URL, or returns null.
 * "example.com" → "https://example.com/", "http://a.b/c" stays as-is,
 * anything else (javascript:, ftp:, garbage) is rejected.
 */
function normaliseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".")) return null; // "localhost" alone isn't a public site
    return url.href;
  } catch {
    return null;
  }
}

/**
 * The Microlink screenshot URL. `embed=screenshot.url` makes the API
 * respond with the image itself, so it can be an <img> src directly.
 * (The endpoint is api.microlink.io — microlink.io is the website.)
 */
function buildScreenshotUrl(targetUrl, { apiKey = "" } = {}) {
  const base =
    `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}` +
    `&screenshot=true&embed=screenshot.url`;
  return apiKey ? `${base}&apiKey=${encodeURIComponent(apiKey)}` : base;
}

/** Microlink metadata endpoint (JSON): title, description, publisher… */
function buildMetaUrl(targetUrl) {
  return `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`;
}

/* ------------------------------------------------------------------ */
/*  UI wiring (browser only)                                           */
/* ------------------------------------------------------------------ */

/** Optional: paste a free Microlink API key here for higher rate limits. */
const MICROLINK_API_KEY = "";

/** If neither load nor error fires within this window, fail gracefully. */
const LOAD_TIMEOUT_MS = 30000;

const HAS_UI =
  typeof document !== "undefined" &&
  document.getElementById("preview-form") &&
  document.getElementById("preview-img");

if (HAS_UI) {
  const form = document.getElementById("preview-form");
  const input = document.getElementById("url-input");
  const button = document.getElementById("load-button");
  const img = document.getElementById("preview-img");
  const spinner = document.getElementById("spinner");
  const placeholder = document.getElementById("placeholder");
  const statusLine = document.getElementById("status");
  const errorLine = document.getElementById("error");
  const hostLine = document.getElementById("preview-host");
  const titleLine = document.getElementById("preview-title");
  const descriptionLine = document.getElementById("preview-description");
  const openLink = document.getElementById("open-link");

  let loadTimer = null;

  function setLoading(loading) {
    spinner.hidden = !loading;
    button.disabled = loading;
    button.textContent = loading ? "Rendering…" : "Load Live Preview";
  }

  function showError(message) {
    errorLine.textContent = message;
    errorLine.hidden = false;
  }

  function clearError() {
    errorLine.hidden = true;
    errorLine.textContent = "";
  }

  function fail(message) {
    clearTimeout(loadTimer);
    setLoading(false);
    img.hidden = true;
    placeholder.hidden = false;
    showError(message);
    statusLine.textContent = "Preview failed.";
    titleLine.textContent = "Could not load that site";
    descriptionLine.textContent = message;
  }

  // Native <img> lifecycle: 'load' also fires for Microlink error images,
  // so we additionally require naturalWidth > 0 before calling it success.
  img.onload = () => {
    clearTimeout(loadTimer);
    if (!img.naturalWidth) {
      fail(
        "Microlink could not render that page — it may be offline, blocking bots, or not a public website."
      );
      return;
    }
    setLoading(false);
    img.hidden = false;
    placeholder.hidden = true;
    statusLine.textContent = "Snapshot loaded.";
  };

  img.onerror = () => {
    fail(
      "Could not generate a snapshot for that URL. Check the address and try again — the site may be down or blocking screenshots."
    );
  };

  async function loadMetadata(target) {
    // Best-effort: the snapshot is the product; metadata is decoration.
    try {
      const response = await fetch(buildMetaUrl(target));
      if (!response.ok) return;
      const payload = await response.json();
      const data = payload?.data || {};
      titleLine.textContent = data.title || new URL(target).hostname;
      descriptionLine.textContent =
        data.description ||
        (data.publisher ? `Published by ${data.publisher}` : "No description provided by the site.");
    } catch {
      titleLine.textContent = new URL(target).hostname;
      descriptionLine.textContent = "";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const target = normaliseUrl(input.value);
    if (!target) {
      showError("Please enter a valid website address, e.g. example.com or https://your-site.vercel.app");
      input.focus();
      return;
    }

    const host = new URL(target).hostname;
    hostLine.textContent = host;
    titleLine.textContent = "Rendering…";
    descriptionLine.textContent = "";
    openLink.hidden = false;
    openLink.href = target;
    statusLine.textContent = `Rendering ${host} — first snapshots can take a few seconds…`;

    setLoading(true);
    img.hidden = true;
    placeholder.hidden = true;
    img.alt = `Screenshot of ${host}`;

    // Point the <img> at Microlink; load/error handlers finish the job.
    img.src = buildScreenshotUrl(target, { apiKey: MICROLINK_API_KEY });
    loadMetadata(target);

    // Watchdog: a hung request must not spin forever.
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (spinner.hidden) return;
      fail(
        "That snapshot is taking too long — the site may be slow or blocking screenshots. Try again in a moment."
      );
    }, LOAD_TIMEOUT_MS);
  });

  // Example chips fill + submit.
  document.querySelectorAll("[data-example]").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.getAttribute("data-example") || "";
      form.requestSubmit();
    });
  });

  // Shareable previews: ?url= prefill.
  const initial = new URLSearchParams(location.search).get("url");
  if (initial) {
    input.value = initial;
    form.requestSubmit();
  }
}

/* Test export (harmless in the browser: one small namespaced global). */
if (typeof globalThis !== "undefined") {
  globalThis.LinkPreview = { normaliseUrl, buildScreenshotUrl, buildMetaUrl };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.LinkPreview;
}
