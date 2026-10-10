/**
 * Authentication redirect + OAuth-callback helpers.
 *
 * This module exists because two production-only auth bugs both live in the
 * URL, and neither belongs in a React component:
 *
 *  1. Supabase returns from Google with `?code=…` (PKCE) or `?error=…`
 *     (implicit). `auth-js` strips `code` **only when the exchange succeeds**.
 *     When it fails — expired code, cleared localStorage, a verifier that was
 *     clobbered by a second click — the dead `?code=` stays in the address bar
 *     forever, so every refresh replays the same failed exchange and the
 *     visitor is pinned to the signed-out screen with no explanation. We read
 *     those params, turn them into a real error message, and always clean the
 *     URL ourselves.
 *
 *  2. `/login?redirect=…` was passed straight into `navigate()` and into the
 *     OAuth `redirectTo`. That is an open redirect: `?redirect=//evil.example`
 *     is protocol-relative and leaves the origin. Every redirect target now
 *     goes through `sanitizeRedirectPath()` first.
 *
 * Everything here is pure and synchronous so it can be unit-tested in jsdom.
 */

/** Where a signed-in visitor lands when no valid `redirect` was supplied. */
export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Query parameters Supabase/GoTrue can put on a callback URL. They are either
 * single-use secrets (`code`, `access_token`, `refresh_token`) or provider
 * error details — none of them should survive in the address bar, the browser
 * history, or a `Referer` header sent to a third party.
 */
const AUTH_CALLBACK_PARAMS = [
  "code",
  "sb_flow_id",
  "type",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
  "error",
  "error_code",
  "error_description",
  "iss",
];

/** True when running in a browser with a usable `location`. */
function hasLocation() {
  return typeof window !== "undefined" && Boolean(window.location);
}

/** The current origin, or an empty string when there is no browser. */
export function appOrigin() {
  return hasLocation() ? window.location.origin : "";
}

/**
 * Is this string a URL scheme we must never navigate to?
 * Matches `https:`, `javascript:`, `data:`, `vbscript:`, `file:` … and tolerates
 * the whitespace/control-character tricks browsers strip before resolving
 * (e.g. `java\tscript:`).
 */
function hasDangerousScheme(value) {
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[\u0000-\u0020]/g, "");
  return /^[a-z][a-z0-9+.-]*:/i.test(stripped);
}

/**
 * Normalises an untrusted redirect target to a **same-origin path**.
 *
 * Accepts:
 *   "/dashboard"                  → "/dashboard"
 *   "dashboard"                   → "/dashboard"
 *   "/dashboard?tab=projects"     → "/dashboard?tab=projects"
 *   "https://<this origin>/x"     → "/x"          (same-origin absolute URL)
 *
 * Rejects (returns `fallback`):
 *   "//evil.example/x"            → protocol-relative, leaves the origin
 *   "/\\evil.example"             → browsers normalise "\" to "/" → same as above
 *   "/%2F%2Fevil.example"         → percent-encoded variant of the above
 *   "https://evil.example/x"      → cross-origin
 *   "javascript:alert(1)"         → script scheme
 *   "", null, undefined           → missing
 *
 * A nested `redirect` parameter is dropped from the query so a redirect can
 * never smuggle a second redirect, and auth-callback params are stripped so a
 * dead `?code=` cannot be carried into the next navigation.
 *
 * @param {unknown} input  Untrusted value (usually `?redirect=` from a URL).
 * @param {string} fallback Same-origin path to use when `input` is unusable.
 * @returns {string} A path that always begins with exactly one "/".
 */
export function sanitizeRedirectPath(input, fallback = DEFAULT_REDIRECT) {
  const safeFallback = normalizeFallback(fallback);
  if (typeof input !== "string") return safeFallback;

  const trimmed = input.trim();
  if (!trimmed) return safeFallback;

  // Reject scheme-bearing URLs before anything can interpret them…
  if (hasDangerousScheme(trimmed)) {
    // …unless the URL points at *this* origin, in which case keep its path.
    // Callers legitimately build `${window.location.origin}/dashboard`.
    if (!hasLocation()) return safeFallback;
    let parsed;
    try {
      parsed = new URL(trimmed, window.location.origin);
    } catch {
      return safeFallback;
    }
    if (parsed.origin !== window.location.origin) return safeFallback;
    return finishPath(`${parsed.pathname}${parsed.search}`, safeFallback);
  }

  // Protocol-relative ("//evil.example") and its backslash/encoded variants.
  // Decode once so "/%2F%2Fevil.example" cannot slip past the check.
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    /* malformed percent-encoding — fall through and judge the raw value */
  }
  if (/^[/\\]{2}/.test(trimmed) || /^[/\\]{2}/.test(decoded)) return safeFallback;

  return finishPath(decoded, safeFallback);
}

/** Validates a developer-supplied fallback so a bad default can't leak out. */
function normalizeFallback(fallback) {
  if (typeof fallback !== "string") return DEFAULT_REDIRECT;
  const trimmed = fallback.trim();
  if (!trimmed.startsWith("/") || /^[/\\]{2}/.test(trimmed) || hasDangerousScheme(trimmed)) {
    return DEFAULT_REDIRECT;
  }
  return trimmed;
}

/** Adds the leading "/", then sanitises the query string. */
function finishPath(candidate, safeFallback) {
  const path = candidate.startsWith("/") ? candidate : `/${candidate}`;

  // Split off the query so we can inspect it without breaking the path.
  const hashIndex = path.indexOf("#");
  const withoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");

  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : withoutHash.slice(queryIndex + 1);

  // A pathname must stay a single, relative path. "//" anywhere in it means
  // the browser can resolve it against a different origin.
  if (!pathname || pathname.includes("//") || pathname.includes("\\")) return safeFallback;

  let cleanSearch = "";
  if (search) {
    const params = new URLSearchParams(search);
    // Never let a redirect carry another redirect, or a spent OAuth code.
    params.delete("redirect");
    for (const key of AUTH_CALLBACK_PARAMS) params.delete(key);
    cleanSearch = params.toString();
  }

  return cleanSearch ? `${pathname}?${cleanSearch}` : pathname;
}

/**
 * Resolves a sanitised path to an absolute URL on this origin — the shape
 * Supabase requires for `redirectTo` / `emailRedirectTo`.
 *
 * @param {unknown} path Untrusted path or absolute same-origin URL.
 * @param {string} fallback Used when `path` is unusable.
 */
export function absoluteAppUrl(path, fallback = DEFAULT_REDIRECT) {
  const safe = sanitizeRedirectPath(path, fallback);
  const origin = appOrigin();
  // Without an origin (SSR/pre-render) the relative path is the best we can do.
  return origin ? `${origin}${safe}` : safe;
}

/**
 * Builds the `?redirect=` query string for a link to `/login`, so a route guard
 * can send the visitor back where they came from after they sign in.
 *
 * The path is sanitised *and* percent-encoded here so the value that comes back
 * out of `searchParams.get("redirect")` can never be an off-origin URL.
 *
 * @param {string} path Same-origin path to return to, e.g. "/dashboard".
 * @param {string} [fallback] Used when `path` is unusable.
 */
export function loginRedirectParam(path, fallback = DEFAULT_REDIRECT) {
  return `?redirect=${encodeURIComponent(sanitizeRedirectPath(path, fallback))}`;
}

/**
 * Reads the OAuth callback out of the current URL.
 *
 * Called once, at boot, *before* `auth-js` has a chance to consume or strip
 * anything. Returns the provider error verbatim so the UI can explain a failed
 * sign-in instead of silently showing the signed-out screen.
 *
 * @param {string} [search] Defaults to `window.location.search`.
 * @returns {{
 *   isCallback: boolean,
 *   code: string | null,
 *   error: string | null,
 *   errorDescription: string | null,
 *   type: string | null,
 *   search: string,
 *   cleanedSearch: string,
 * }}
 */
export function readAuthCallback(search) {
  const rawSearch = typeof search === "string" ? search : hasLocation() ? window.location.search : "";
  const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);

  const code = params.get("code");
  const error = params.get("error") || params.get("error_code");
  const errorDescription = params.get("error_description");
  const type = params.get("type");

  const isCallback = Boolean(code || error || type);

  // Rebuild the query without any auth-callback parameter.
  for (const key of AUTH_CALLBACK_PARAMS) params.delete(key);
  const cleanedSearch = params.toString();

  return {
    isCallback,
    code,
    error,
    errorDescription,
    type,
    search: rawSearch,
    cleanedSearch: cleanedSearch ? `?${cleanedSearch}` : "",
  };
}

/**
 * Turns a callback (or a failed PKCE exchange) into a message a person can act
 * on. `code` with no session means the exchange failed — `auth-js` swallows
 * that error, so we reconstruct it here.
 *
 * @param {ReturnType<typeof readAuthCallback>} callback
 * @param {boolean} sessionEstablished Did the exchange actually produce a session?
 * @returns {{ title: string, message: string, hint?: string } | null}
 */
export function describeAuthCallbackError(callback, sessionEstablished = false) {
  if (!callback?.isCallback) return null;
  if (sessionEstablished) return null;

  const description = callback.errorDescription ? String(callback.errorDescription) : "";

  // Supabase refused the redirectTo because it isn't on the allowlist.
  if (/redirect(_to)?|invalid.*url|not allowed|unauthorized/i.test(`${callback.error} ${description}`)) {
    return {
      title: "Sign-in was blocked by the redirect allowlist",
      message: "Supabase rejected this site's return address, so Google could not hand the session back.",
      hint: "Add this deployment's origin to Supabase → Authentication → URL Configuration → Redirect URLs, and set the Site URL to the same origin.",
    };
  }

  // The visitor (or Google) cancelled the consent screen.
  if (/^(access_denied|user_cancelled|interaction_required)$/i.test(String(callback.error || ""))) {
    return {
      title: "Sign-in was cancelled",
      message: description || "Google did not return permission to sign you in.",
    };
  }

  if (callback.error) {
    return {
      title: "Sign-in did not complete",
      message: description || String(callback.error).replace(/[_-]+/g, " "),
      hint: "Try signing in again. If it keeps happening, clear the site's cookies and storage.",
    };
  }

  // A `code` was present but no session came out of it: the exchange failed.
  if (callback.code) {
    return {
      title: "Sign-in did not complete",
      message:
        "Google sent an authorisation code back, but this browser could not exchange it for a session. This usually means the code was already used, had expired, or the sign-in was started in a different browser or tab.",
      hint: "Sign in again from this same tab — a fresh code is issued each time.",
    };
  }

  return null;
}
