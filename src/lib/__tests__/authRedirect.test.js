import { describe, expect, it } from "vitest";
import {
  DEFAULT_REDIRECT,
  absoluteAppUrl,
  describeAuthCallbackError,
  loginRedirectParam,
  readAuthCallback,
  sanitizeRedirectPath,
} from "../authRedirect";

/**
 * The redirect sanitiser is a security boundary, so it is tested against the
 * payloads that actually get used in the wild rather than just happy paths.
 */
describe("sanitizeRedirectPath", () => {
  it("keeps a plain same-origin path", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/developers/abc-123")).toBe("/developers/abc-123");
    expect(sanitizeRedirectPath("/")).toBe("/");
  });

  it("adds the leading slash to a relative path", () => {
    expect(sanitizeRedirectPath("dashboard")).toBe("/dashboard");
  });

  it("preserves a legitimate query string", () => {
    expect(sanitizeRedirectPath("/dashboard?tab=projects")).toBe("/dashboard?tab=projects");
  });

  it("falls back on missing or empty input", () => {
    expect(sanitizeRedirectPath("")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath(null)).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath(42)).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("   ")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects protocol-relative URLs (open redirect)", () => {
    expect(sanitizeRedirectPath("//evil.example/x")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("///evil.example")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects the backslash variant browsers normalise to '//'", () => {
    expect(sanitizeRedirectPath("/\\evil.example")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("\\\\evil.example")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects the percent-encoded variant", () => {
    expect(sanitizeRedirectPath("/%2F%2Fevil.example/x")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects an absolute URL on another origin", () => {
    expect(sanitizeRedirectPath("https://evil.example/dashboard")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("http://localhost:9999/dashboard")).toBe(DEFAULT_REDIRECT);
  });

  it("rejects script and data schemes", () => {
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("JaVaScRiPt:alert(1)")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe(DEFAULT_REDIRECT);
    // Browsers strip control characters before resolving the scheme.
    expect(sanitizeRedirectPath("java\tscript:alert(1)")).toBe(DEFAULT_REDIRECT);
  });

  it("accepts an absolute URL on this origin and reduces it to a path", () => {
    const sameOrigin = `${window.location.origin}/dashboard`;
    expect(sanitizeRedirectPath(sameOrigin)).toBe("/dashboard");
  });

  it("honours a custom fallback, but validates it too", () => {
    expect(sanitizeRedirectPath("//evil.example", "/login")).toBe("/login");
    // A caller-supplied fallback is not trusted either.
    expect(sanitizeRedirectPath("//evil.example", "//other.example")).toBe(DEFAULT_REDIRECT);
    expect(sanitizeRedirectPath("", "no-slash")).toBe(DEFAULT_REDIRECT);
  });

  it("drops a nested redirect param so redirects cannot chain", () => {
    expect(sanitizeRedirectPath("/dashboard?redirect=%2F%2Fevil.example&tab=projects")).toBe(
      "/dashboard?tab=projects"
    );
  });

  it("drops OAuth callback params carried into a redirect", () => {
    expect(sanitizeRedirectPath("/dashboard?code=deadbeef&tab=projects")).toBe("/dashboard?tab=projects");
  });

  it("rejects a double slash inside the pathname", () => {
    expect(sanitizeRedirectPath("/dash//board")).toBe(DEFAULT_REDIRECT);
  });

  it("drops the hash fragment", () => {
    expect(sanitizeRedirectPath("/dashboard#section")).toBe("/dashboard");
  });
});

describe("absoluteAppUrl", () => {
  it("prefixes the current origin", () => {
    expect(absoluteAppUrl("/dashboard")).toBe(`${window.location.origin}/dashboard`);
  });

  it("never emits a cross-origin URL from untrusted input", () => {
    const result = absoluteAppUrl("//evil.example/x");
    expect(result).toBe(`${window.location.origin}${DEFAULT_REDIRECT}`);
    expect(new URL(result).origin).toBe(window.location.origin);
  });
});

describe("loginRedirectParam", () => {
  it("percent-encodes the target", () => {
    expect(loginRedirectParam("/dashboard")).toBe("?redirect=%2Fdashboard");
  });

  it("round-trips back to a safe path", () => {
    const query = loginRedirectParam("/dashboard?tab=projects");
    const value = new URLSearchParams(query.slice(1)).get("redirect");
    expect(sanitizeRedirectPath(value)).toBe("/dashboard?tab=projects");
  });

  it("neutralises an attacker-supplied path", () => {
    const query = loginRedirectParam("//evil.example");
    const value = new URLSearchParams(query.slice(1)).get("redirect");
    expect(sanitizeRedirectPath(value)).toBe(DEFAULT_REDIRECT);
  });
});

describe("readAuthCallback", () => {
  it("detects a PKCE callback and strips it", () => {
    const callback = readAuthCallback("?code=abc123&sb_flow_id=f1&redirect=%2Fdashboard");
    expect(callback.isCallback).toBe(true);
    expect(callback.code).toBe("abc123");
    // The unrelated param survives; the single-use code does not.
    expect(callback.cleanedSearch).toBe("?redirect=%2Fdashboard");
  });

  it("detects a provider error callback", () => {
    const callback = readAuthCallback("?error=access_denied&error_description=User+cancelled");
    expect(callback.isCallback).toBe(true);
    expect(callback.error).toBe("access_denied");
    expect(callback.errorDescription).toBe("User cancelled");
    expect(callback.cleanedSearch).toBe("");
  });

  it("reports no callback for an ordinary URL", () => {
    const callback = readAuthCallback("?tab=projects");
    expect(callback.isCallback).toBe(false);
    expect(callback.cleanedSearch).toBe("?tab=projects");
  });

  it("tolerates an empty search string", () => {
    const callback = readAuthCallback("");
    expect(callback.isCallback).toBe(false);
    expect(callback.cleanedSearch).toBe("");
  });
});

describe("describeAuthCallbackError", () => {
  it("returns nothing when there was no callback", () => {
    expect(describeAuthCallbackError(readAuthCallback(""))).toBeNull();
  });

  it("returns nothing once a session was established", () => {
    const callback = readAuthCallback("?code=abc123");
    expect(describeAuthCallbackError(callback, true)).toBeNull();
  });

  it("explains a code that never became a session", () => {
    const result = describeAuthCallbackError(readAuthCallback("?code=abc123"), false);
    expect(result).toBeTruthy();
    expect(result.title).toMatch(/did not complete/i);
    expect(result.hint).toBeTruthy();
  });

  it("explains a cancelled consent screen", () => {
    const result = describeAuthCallbackError(readAuthCallback("?error=access_denied"), false);
    expect(result.title).toMatch(/cancelled/i);
  });

  it("points at the Supabase allowlist for a rejected redirect", () => {
    const result = describeAuthCallbackError(
      readAuthCallback("?error=invalid_request&error_description=redirect_to+is+not+allowed"),
      false
    );
    expect(result.title).toMatch(/allowlist/i);
    expect(result.hint).toMatch(/Redirect URLs/);
  });
});
