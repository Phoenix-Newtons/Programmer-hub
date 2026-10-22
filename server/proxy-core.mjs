/**
 * Pure helpers for the preview reverse proxy (server/preview-proxy.mjs).
 *
 * Kept dependency-free and side-effect-free (DNS is injected) so the
 * security-critical decisions — what may be proxied, which headers are
 * stripped, how HTML is rewritten — are unit-testable without a network.
 *
 * ⚠ SECURITY CONTEXT
 * ------------------
 * This proxy deliberately removes framing protections (X-Frame-Options /
 * CSP frame-ancestors) from third-party pages so the hub can preview them.
 * That is safe ONLY inside a sandboxed iframe on an isolated origin:
 *  - never serve the proxy from the same origin as the authenticated app
 *    (use a separate subdomain, e.g. preview.example.com), because proxied
 *    scripts would otherwise share your app's origin context;
 *  - the frontend iframe must use sandbox="allow-scripts allow-forms"
 *    WITHOUT allow-same-origin (see server/public/index.html);
 *  - in production, pin PROXY_ALLOWED_HOSTS to the hosts you actually
 *    preview. An open proxy that strips framing headers is a phishing and
 *    SSRF toolkit if left unrestricted — the guards below (protocol check,
 *    private-IP blocking, redirect re-validation, size/time limits) are
 *    the minimum, not a substitute for an allowlist.
 */

import { lookup } from "node:dns/promises";
import net from "node:net";

/** Response headers that would stop the browser framing the preview. */
export const STRIPPED_RESPONSE_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-webkit-csp",
  "x-content-security-policy",
  "clear-site-data",
  // Hop-by-hop / length headers are re-derived by Express from the body.
  "content-length",
  "transfer-encoding",
  "connection",
  // Cookies from a third-party site must never be planted on the proxy origin.
  "set-cookie",
];

/**
 * Request headers we never forward: `host` (breaks the target's virtual
 * hosting and leaks our origin), credentials, and hop-by-hop headers.
 */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "cookie",
  "authorization",
  "connection",
  "content-length",
  "transfer-encoding",
  "proxy-authorization",
  "proxy-connection",
]);

export function isPrivateAddress(address) {
  if (!address) return true;
  const family = net.isIP(address);
  if (!family) return true; // unparseable → treat as unsafe
  const ip = address.toLowerCase();

  if (family === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || // 0.0.0.0/8 "this host"
      a === 10 || // 10.0.0.0/8
      a === 127 || // loopback
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      a >= 224 // multicast / reserved
    );
  }
  // IPv6
  return (
    ip === "::1" ||
    ip === "::" ||
    ip.startsWith("fe8") ||
    ip.startsWith("fe9") ||
    ip.startsWith("fea") ||
    ip.startsWith("feb") || // link-local fe80::/10
    ip.startsWith("fc") ||
    ip.startsWith("fd") || // unique-local fc00::/7
    ip.startsWith("::ffff:") // IPv4-mapped — resolved by callers before this
  );
}

/** Expands an IPv4-mapped IPv6 address to its IPv4 form, else returns input. */
function unmapAddress(address) {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address || "");
  return match ? match[1] : address;
}

/**
 * Parses + protocol-checks a user-supplied target URL.
 * @returns {{ ok: true, url: URL } | { ok: false, error: string }}
 */
export function parseTargetUrl(raw) {
  if (!raw || typeof raw !== "string") return { ok: false, error: "Missing ?url= parameter." };
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "Only http:// and https:// URLs can be previewed." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }
  return { ok: true, url };
}

/**
 * Host allowlist check. Entries are exact hosts or `*.example.com`
 * wildcards. An empty list means "any public host" (dev default) — the
 * private-IP guard still applies.
 */
export function isHostAllowed(hostname, allowedHosts = []) {
  if (!allowedHosts.length) return true;
  const host = String(hostname || "").toLowerCase();
  return allowedHosts.some((entry) => {
    const rule = String(entry).trim().toLowerCase();
    if (!rule) return false;
    if (rule.startsWith("*.")) return host.endsWith(rule.slice(1)) && host !== rule.slice(2);
    return host === rule;
  });
}

/**
 * Full SSRF gate: allowlist → DNS resolution → every resolved address must
 * be public (unless `allowPrivate` is set for local development).
 *
 * NOTE (residual risk): DNS is checked here and again by fetch, so a
 * hostile DNS server could rebind between the two (TOCTOU). The allowlist
 * is the real production control; this check is defence in depth.
 *
 * @param {URL} url
 * @param {{ allowedHosts?: string[], allowPrivate?: boolean,
 *           lookupFn?: typeof lookup }} [options]
 */
export async function assertSafeTarget(
  url,
  { allowedHosts = [], allowPrivate = false, lookupFn = lookup } = {}
) {
  if (!isHostAllowed(url.hostname, allowedHosts)) {
    return { ok: false, error: `Host ${url.hostname} is not on the preview allowlist.` };
  }
  if (allowPrivate) return { ok: true };

  // Literal IPs need no DNS round-trip.
  if (net.isIP(url.hostname)) {
    return isPrivateAddress(unmapAddress(url.hostname))
      ? { ok: false, error: "Refusing to proxy a private or loopback address." }
      : { ok: true };
  }

  let records;
  try {
    records = await lookupFn(url.hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: `Could not resolve ${url.hostname}.` };
  }
  if (!records?.length) return { ok: false, error: `Could not resolve ${url.hostname}.` };

  const blocked = records.some((record) => isPrivateAddress(unmapAddress(record.address)));
  return blocked
    ? { ok: false, error: "Refusing to proxy a host that resolves to a private address." }
    : { ok: true };
}

/** Copies upstream response headers minus everything in the strip list. */
export function filterResponseHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (!STRIPPED_RESPONSE_HEADERS.includes(key.toLowerCase())) out[key] = value;
  }
  return out;
}

/** Builds the small, safe request-header set forwarded to the target. */
export function buildForwardHeaders(incoming = {}) {
  const out = {
    // A realistic desktop UA: some CDNs 403 blank/library user-agents.
    // (This identifies the proxy honestly via the product token; it is not
    // credential spoofing — no cookies or auth headers are ever forwarded.)
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ProgrammersHubPreview/1.0",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  };
  // Safe, non-identifying headers worth keeping.
  for (const name of ["accept-encoding", "if-none-match", "if-modified-since", "range"]) {
    if (incoming[name]) out[name] = incoming[name];
  }
  for (const name of Object.keys(incoming)) {
    if (STRIPPED_REQUEST_HEADERS.has(name.toLowerCase())) delete out[name];
  }
  return out;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Rewrites proxied HTML so it renders inside our iframe:
 *  1. removes <meta http-equiv="Content-Security-Policy"> tags (the header
 *     was already stripped — a meta copy would re-block the document);
 *  2. drops any existing <base> (we inject the authoritative one);
 *  3. injects <base href="TARGET"> so relative CSS/JS/img/font URLs
 *     resolve against the origin host instead of the proxy origin.
 */
export function rewriteHtml(html, targetUrl) {
  let out = String(html ?? "");

  out = out.replace(/<meta[^>]+http-equiv\s*=\s*["']?\s*content-security-policy\s*["']?[^>]*>/gi, "");
  out = out.replace(/<base\b[^>]*>/gi, "");

  const base = `<base href="${escapeAttribute(targetUrl)}">`;

  if (/<head(\s[^>]*)?>/i.test(out)) {
    out = out.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${base}`);
  } else if (/<html(\s[^>]*)?>/i.test(out)) {
    out = out.replace(/<html(\s[^>]*)?>/i, (match) => `${match}<head>${base}</head>`);
  } else {
    out = `${base}${out}`;
  }
  return out;
}
