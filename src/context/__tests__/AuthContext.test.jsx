import { act } from "react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration tests for the authentication boot sequence.
 *
 * These cover the three production-only failures that were invisible before:
 *
 *  1. `loading` was only ever cleared on the *success* path of `getSession()`.
 *     A rejection stranded the whole app on "Checking your session…".
 *  2. A failed OAuth callback produced no error and left the spent `?code=` in
 *     the address bar, so every refresh replayed the same dead exchange.
 *  3. `signOut()` cleared React state only when the server call succeeded, so a
 *     dead refresh token or an offline network trapped the visitor signed-in.
 *
 * `auth-js` is mocked at the module boundary: the point of these tests is the
 * provider's *contract*, not Supabase's internals.
 */

/** Mutable mock state, hoisted above the `vi.mock` factory. */
const h = vi.hoisted(() => ({
  session: null,
  initError: null,
  sessionError: null,
  rejectGetSession: null,
  throwInitialize: null,
  oauthError: null,
  oauthArgs: null,
  signOutImpl: null,
  signOutCalls: [],
  listeners: [],
  clearedStorage: false,
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      initialize: vi.fn(async () => {
        if (h.throwInitialize) throw h.throwInitialize;
        return { error: h.initError };
      }),
      getSession: vi.fn(async () => {
        if (h.rejectGetSession) throw h.rejectGetSession;
        return { data: { session: h.session }, error: h.sessionError };
      }),
      onAuthStateChange: vi.fn((callback) => {
        h.listeners.push(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOAuth: vi.fn(async (options) => {
        h.oauthArgs = options;
        return { data: { url: "https://google.example" }, error: h.oauthError };
      }),
      signOut: vi.fn(async (options) => {
        h.signOutCalls.push(options);
        return h.signOutImpl ? h.signOutImpl(options) : { error: null };
      }),
    },
  },
  clearLocalAuthStorage: vi.fn(() => {
    h.clearedStorage = true;
    return true;
  }),
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_CONFIGURED: true,
}));

vi.mock("../../lib/api", () => ({
  fetchProfile: vi.fn(async () => ({ data: { id: "u1", name: "Ada" }, error: null })),
  saveProfile: vi.fn(async (payload) => ({ data: payload, error: null })),
}));

const { AuthProvider, useAuth } = await import("../AuthContext.jsx");

/** The most recent context value, so tests can call actions directly. */
let latest = null;

function Probe() {
  latest = useAuth();
  return null;
}

/** Mounts the provider the way `main.jsx` does.
 *
 * `BrowserRouter` (not `MemoryRouter`) is deliberate: the fix under test is
 * that the spent `?code=` disappears from the *real* address bar. A memory
 * router is decoupled from `window.location` and would pass vacuously. Call
 * `setBrowserUrl()` before mounting to choose the route.
 */
async function mount() {
  const { createRoot } = await import("react-dom/client");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <BrowserRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </BrowserRouter>
    );
  });
  // Flush the boot chain (initialize → getSession → state updates).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

/** Emits an auth event to every subscriber, as auth-js would. */
async function emit(event, session) {
  await act(async () => {
    h.listeners.forEach((listener) => listener(event, session));
  });
}

const USER = { id: "u1", email: "ada@example.com", user_metadata: { full_name: "Ada Nakato" } };
const SESSION = { access_token: "jwt", refresh_token: "rt", user: USER };

/** Sets the browser URL, which is what `readAuthCallback()` inspects. */
function setBrowserUrl(url) {
  window.history.replaceState(null, "", url);
}

describe("AuthProvider boot", () => {
  let view;

  beforeEach(() => {
    Object.assign(h, {
      session: null,
      initError: null,
      sessionError: null,
      rejectGetSession: null,
      throwInitialize: null,
      oauthError: null,
      oauthArgs: null,
      signOutImpl: null,
      signOutCalls: [],
      listeners: [],
      clearedStorage: false,
    });
    setBrowserUrl("/dashboard");
  });

  afterEach(async () => {
    await view?.unmount();
    view = null;
    setBrowserUrl("/");
  });

  it("clears loading on a clean signed-out boot", async () => {
    view = await mount();
    expect(latest.loading).toBe(false);
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.authError).toBeNull();
  });

  it("reports the user on a signed-in boot", async () => {
    h.session = SESSION;
    view = await mount();
    expect(latest.loading).toBe(false);
    expect(latest.isAuthenticated).toBe(true);
    expect(latest.user.id).toBe("u1");
    expect(latest.displayName).toBe("Ada");
  });

  /**
   * Regression: `.then()` with no `.catch()` meant a rejection left `loading`
   * true forever — the "hangs on a loading spinner" symptom.
   */
  it("clears loading and explains itself when getSession() rejects", async () => {
    h.rejectGetSession = new TypeError("Failed to fetch");
    view = await mount();

    expect(latest.loading).toBe(false);
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.authError).toBeTruthy();
    expect(latest.authError.message).toMatch(/network|did not complete|reach supabase/i);
  });

  it("clears loading when initialize() itself throws", async () => {
    h.throwInitialize = new Error("Unexpected error during initialization");
    view = await mount();
    expect(latest.loading).toBe(false);
    expect(latest.authError).toBeTruthy();
  });

  /**
   * Regression: `getSession()` discards the PKCE-exchange error because it
   * reads storage after awaiting `initializePromise`. `initialize()` is the only
   * call that surfaces it.
   */
  it("recovers the error auth-js swallows from initialize()", async () => {
    h.initError = Object.assign(new Error("Invalid PKCE code verifier"), {
      name: "AuthPKCEGrantCodeExchangeError",
    });
    view = await mount();

    expect(latest.loading).toBe(false);
    expect(latest.authError).toBeTruthy();
    expect(latest.authError.title).toMatch(/did not complete/i);
  });

  it("still resolves the session when initialize() reports an error", async () => {
    h.initError = new Error("transient");
    h.session = SESSION;
    view = await mount();
    // A session beats a stale init error.
    expect(latest.isAuthenticated).toBe(true);
  });

  /**
   * Regression: a failed callback landed on the signed-out screen with no
   * message and the spent `?code=` still in the URL, so refreshing replayed it.
   */
  it("surfaces a failed PKCE callback and strips the spent code", async () => {
    setBrowserUrl("/dashboard?code=deadbeef&sb_flow_id=f1");
    view = await mount();

    expect(latest.loading).toBe(false);
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.authError).toBeTruthy();
    expect(latest.authError.title).toMatch(/did not complete/i);
    expect(latest.authError.hint).toBeTruthy();

    // The single-use code must be gone, or the next load replays it.
    expect(window.location.search).not.toContain("code=");
    expect(window.location.search).not.toContain("sb_flow_id=");
  });

  it("keeps unrelated query params while stripping the callback", async () => {
    setBrowserUrl("/dashboard?code=deadbeef&tab=projects");
    view = await mount();
    expect(window.location.search).toContain("tab=projects");
    expect(window.location.search).not.toContain("code=");
  });

  it("leaves an ordinary URL's query string untouched", async () => {
    setBrowserUrl("/developers?category=All&sort=rating");
    view = await mount();
    expect(window.location.search).toBe("?category=All&sort=rating");
    expect(latest.authError).toBeNull();
  });

  it("does not report an error when the callback succeeded", async () => {
    setBrowserUrl("/dashboard?code=good");
    h.session = SESSION;
    view = await mount();
    expect(latest.isAuthenticated).toBe(true);
    expect(latest.authError).toBeNull();
  });

  it("explains a rejected redirect allowlist", async () => {
    setBrowserUrl("/dashboard?error=invalid_request&error_description=redirect_to%20is%20not%20allowed");
    view = await mount();
    expect(latest.authError.title).toMatch(/allowlist/i);
    expect(latest.authError.hint).toMatch(/Redirect URLs/);
  });

  it("explains a cancelled Google consent screen", async () => {
    setBrowserUrl("/dashboard?error=access_denied");
    view = await mount();
    expect(latest.authError.title).toMatch(/cancelled/i);
  });

  it("updates on a later SIGNED_IN event", async () => {
    view = await mount();
    expect(latest.isAuthenticated).toBe(false);

    await emit("SIGNED_IN", SESSION);
    expect(latest.isAuthenticated).toBe(true);
    expect(latest.loading).toBe(false);
  });

  it("clears the user and the cached profile on SIGNED_OUT", async () => {
    h.session = SESSION;
    view = await mount();
    expect(latest.isAuthenticated).toBe(true);

    await emit("SIGNED_OUT", null);
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.profile).toBeNull();
  });

  it("does not let INITIAL_SESSION wipe a pending callback error", async () => {
    setBrowserUrl("/dashboard?code=deadbeef");
    view = await mount();
    expect(latest.authError).toBeTruthy();

    // auth-js emits this off the same internal promise; order is not
    // guaranteed, and it must not erase the failure we just diagnosed.
    await emit("INITIAL_SESSION", null);
    expect(latest.authError).toBeTruthy();
    expect(latest.loading).toBe(false);
  });
});

describe("signInWithGoogle", () => {
  let view;

  beforeEach(() => {
    Object.assign(h, { oauthArgs: null, oauthError: null, signOutCalls: [] });
    setBrowserUrl("/login");
  });

  afterEach(async () => {
    await view?.unmount();
    view = null;
    setBrowserUrl("/");
  });

  it("re-bases a relative redirectTo on the live origin", async () => {
    setBrowserUrl("/login");
    view = await mount();
    await act(async () => {
      await latest.signInWithGoogle("/dashboard");
    });
    expect(h.oauthArgs.options.redirectTo).toBe(`${window.location.origin}/dashboard`);
  });

  it("refuses to send an off-origin redirectTo", async () => {
    setBrowserUrl("/login");
    view = await mount();
    await act(async () => {
      await latest.signInWithGoogle("//evil.example/steal");
    });
    const target = new URL(h.oauthArgs.options.redirectTo);
    expect(target.origin).toBe(window.location.origin);
    expect(target.pathname).toBe("/dashboard");
  });

  it("normalises an OAuth error instead of throwing", async () => {
    h.oauthError = Object.assign(new Error("redirect_to is not allowed"), { name: "AuthApiError" });
    setBrowserUrl("/login");
    view = await mount();

    let result;
    await act(async () => {
      result = await latest.signInWithGoogle("/dashboard");
    });
    expect(result.error).toBeTruthy();
    expect(result.error.title).toBeTruthy();
  });
});

describe("signOut", () => {
  let view;

  beforeEach(() => {
    Object.assign(h, { session: SESSION, signOutImpl: null, signOutCalls: [], clearedStorage: false });
    setBrowserUrl("/dashboard");
  });

  afterEach(async () => {
    await view?.unmount();
    view = null;
    setBrowserUrl("/");
  });

  it("revokes globally and clears state on success", async () => {
    view = await mount();
    expect(latest.isAuthenticated).toBe(true);

    let result;
    await act(async () => {
      result = await latest.signOut();
    });

    expect(result.error).toBeNull();
    expect(latest.isAuthenticated).toBe(false);
    expect(latest.session).toBeNull();
    expect(h.signOutCalls[0]).toEqual({ scope: "global" });
  });

  /**
   * Regression: a failed server call left the visitor permanently signed in
   * with a dead session, and the navbar only said "Could not sign out."
   */
  it("still signs out locally when the server returns an error", async () => {
    h.signOutImpl = async (options) =>
      options?.scope === "global" ? { error: new Error("Network request failed") } : { error: null };

    view = await mount();
    expect(latest.isAuthenticated).toBe(true);

    let result;
    await act(async () => {
      result = await latest.signOut();
    });

    expect(result.error).toBeNull();
    expect(latest.isAuthenticated).toBe(false);
    // It must have fallen back to a local sign-out.
    expect(h.signOutCalls.map((call) => call?.scope)).toContain("local");
  });

  it("wipes storage by hand when even a local sign-out throws", async () => {
    h.signOutImpl = async () => {
      throw new Error("storage exploded");
    };

    view = await mount();
    await act(async () => {
      await latest.signOut();
    });

    expect(latest.isAuthenticated).toBe(false);
    expect(h.clearedStorage).toBe(true);
  });
});
