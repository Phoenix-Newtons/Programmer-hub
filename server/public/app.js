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

// Prefill from ?url= so previews are shareable in local development.
const initial = new URLSearchParams(location.search).get("url");
if (initial) {
  input.value = initial;
  form.requestSubmit();
}
