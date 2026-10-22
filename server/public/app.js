/**
 * Vanilla-JS frontend for the preview proxy demo.
 *
 * Flow: form submit → normalise the URL → point the sandboxed iframe at
 * `/proxy?url=<encoded>` → the server fetches, strips framing headers,
 * injects <base>, and returns the HTML.
 *
 * Loading state is optimistic: an iframe 'load' event also fires for
 * error pages, so a slow-load timer warns when a preview is likely
 * blocked or the target is unreachable (details come back as JSON from
 * /proxy when the proxy itself refuses or fails).
 */

const snapshotButton = document.getElementById("snapshot-button");
const snapshotPanel = document.getElementById("snapshot-panel");
const snapshotImg = document.getElementById("snapshot-img");
const snapshotTitle = document.getElementById("snapshot-title");
const snapshotDescription = document.getElementById("snapshot-description");
const snapshotNote = document.getElementById("snapshot-note");
const snapshotOpen = document.getElementById("snapshot-open");

const form = document.getElementById("preview-form");
const input = document.getElementById("url-input");
const button = document.getElementById("load-button");
const frame = document.getElementById("preview-frame");
const spinner = document.getElementById("spinner");
const statusLine = document.getElementById("status");
const errorLine = document.getElementById("error");

const SLOW_MS = 9000;
let slowTimer = null;

function setLoading(loading) {
  spinner.hidden = !loading;
  button.disabled = loading;
  button.textContent = loading ? "Loading…" : "Load Live Preview";
}

function showError(message) {
  errorLine.textContent = message;
  errorLine.hidden = false;
}

function clearError() {
  errorLine.hidden = true;
  errorLine.textContent = "";
}

/** Accepts "example.com", "www.example.com/path" or a full URL. */
function normaliseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const target = normaliseUrl(input.value);
  if (!target) {
    showError("Please enter a valid URL, e.g. https://example.com");
    input.focus();
    return;
  }

  setLoading(true);
  statusLine.textContent = `Loading ${target} through the proxy…`;

  clearTimeout(slowTimer);
  slowTimer = setTimeout(() => {
    if (!spinner.hidden) {
      statusLine.textContent =
        "Still loading — the target may be slow, offline, or refusing the proxy. You can keep waiting or try another URL.";
    }
  }, SLOW_MS);

  // URL-encode so query strings/& in the target survive as one parameter.
  frame.src = `/proxy?url=${encodeURIComponent(target)}`;
});

// 'load' fires when the proxied document (or an error page) commits.
frame.addEventListener("load", () => {
  clearTimeout(slowTimer);
  if (!frame.src) return;
  setLoading(false);
  statusLine.textContent = "Preview loaded. If it looks blank, the site may still be blocking embeds.";
});

/**
 * Snapshot flow: GET /api/preview renders the page in headless Chrome and
 * returns { title, metadata, screenshotBase64 }. Challenge pages come back
 * as 409 CHALLENGE_DETECTED with a fallback screenshotUrl — rendered as an
 * image, never as a broken <img>.
 */
snapshotButton.addEventListener("click", async () => {
  clearError();
  const target = normaliseUrl(input.value);
  if (!target) {
    showError("Please enter a valid URL, e.g. https://example.com");
    input.focus();
    return;
  }

  setLoading(true);
  snapshotButton.disabled = true;
  snapshotButton.textContent = "Rendering in Chrome…";
  statusLine.textContent = `Rendering ${target} in headless Chrome (can take ~10–30s)…`;
  snapshotPanel.hidden = false;
  snapshotImg.hidden = true;
  snapshotTitle.textContent = "Rendering…";
  snapshotDescription.textContent = "";
  snapshotNote.textContent = "";

  try {
    const response = await fetch(`/api/preview?url=${encodeURIComponent(target)}`);
    const data = await response.json().catch(() => ({}));
    if (!data || (typeof data === "object" && !data.ok && !data.screenshotUrl && !data.error)) {
      throw new Error("Unexpected response from the preview service.");
    }

    snapshotOpen.hidden = false;
    snapshotOpen.href = data.url || target;

    if (data.ok && data.screenshotBase64) {
      snapshotImg.src = `data:${data.mimeType || "image/png"};base64,${data.screenshotBase64}`;
      snapshotImg.hidden = false;
      snapshotTitle.textContent = data.title || data.url || target;
      snapshotDescription.textContent = data.metadata?.description || "";
      snapshotNote.textContent = data.metadata?.siteName ? `Site: ${data.metadata.siteName}` : "";
      statusLine.textContent = "Snapshot ready.";
    } else if (data.screenshotUrl) {
      // Challenge detected (or browser unavailable): show the fallback.
      snapshotImg.src = data.screenshotUrl;
      snapshotImg.hidden = false;
      snapshotTitle.textContent = data.title || "Preview (fallback image)";
      snapshotNote.textContent = data.error || "Showing a fallback screenshot.";
      statusLine.textContent = "Live render was blocked — showing the fallback screenshot instead.";
    } else {
      snapshotTitle.textContent = "Preview failed";
      showError(data.error || "Could not generate a preview for that URL.");
      statusLine.textContent = "Preview failed.";
    }
  } catch (error) {
    snapshotTitle.textContent = "Preview failed";
    showError(error.message || "Could not reach the preview service.");
    statusLine.textContent = "Preview failed.";
  } finally {
    setLoading(false);
    snapshotButton.disabled = false;
    snapshotButton.textContent = "Generate Snapshot";
  }
});

// Prefill from ?url= so previews are shareable in local development.
const initial = new URLSearchParams(location.search).get("url");
if (initial) {
  input.value = initial;
  form.requestSubmit();
}
