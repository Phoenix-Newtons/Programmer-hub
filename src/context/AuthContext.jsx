import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearLocalAuthStorage, supabase } from "../lib/supabase";
import { fetchProfile, saveProfile } from "../lib/api";
import {
  DEFAULT_REDIRECT,
  absoluteAppUrl,
  describeAuthCallbackError,
  readAuthCallback,
} from "../lib/authRedirect";

const AuthContext = createContext(null);

/**
 * Upper bound on the session boot.
 *
 * `getSession()` awaits `auth-js`'s internal `initializePromise`, which in turn
 * performs the PKCE code exchange — a real network round trip. If that promise
 * never settles (cross-tab lock contention, a hung request, a browser extension
 * swallowing the response) the app would otherwise sit on "Checking your
 * session…" forever. The watchdog guarantees the UI always becomes interactive.
 */
const SESSION_BOOT_TIMEOUT_MS = 10000;

/** Auth events that mean "this visitor is signed in right now". */
const SIGNED_IN_EVENTS = new Set(["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"]);

/**
 * Owns the whole authentication lifecycle for the SPA.
 *
 * There is no server here — this is a static Vite bundle on Vercel, so every
 * session decision is made in the browser against Supabase. Three invariants
 * the old implementation broke, and this one holds:
 *
 *  1. `loading` is only ever cleared by an *authoritative* answer (a resolved
 *     `getSession()`/`initialize()`, an `INITIAL_SESSION` event, or the
 *     watchdog) — and it is cleared on the error path too, so a rejection can
 *     never strand the app on a spinner.
 *  2. A failed OAuth callback is *surfaced* and the dead `?code=` / `?error=`
 *     params are *removed*, so refreshing recovers instead of replaying.
 *  3. `signOut()` always leaves the visitor signed out locally, even when the
 *     server call fails.
 *
 * Must be mounted inside a Router (it cleans the callback URL via `navigate`).
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  // A human-readable description of a failed sign-in attempt, or null.
  const [authError, setAuthError] = useState(null);

  const navigate = useNavigate();

  // Guard so the one-shot boot work (URL cleanup, watchdog) happens exactly once
  // even though `getSession()`, `INITIAL_SESSION` and the watchdog all race.
  const bootRef = useRef({ finished: false, active: true, watchdog: 0 });

  useEffect(() => {
    const boot = bootRef.current;
    boot.active = true;
    boot.finished = false;

    /* ------------------------------------------------------------------ *
     * 1. Snapshot the OAuth callback BEFORE auth-js consumes it.
     *
     * Supabase returns from Google as `/dashboard?code=<one-time code>` for the
     * PKCE flow. `auth-js` strips `code` itself — but only on success. On
     * failure the dead code stays in the address bar, `_isPKCECallback()` keeps
     * matching it on every subsequent load, and the visitor is pinned to the
     * signed-out screen with no message and no way to recover by refreshing.
     * ------------------------------------------------------------------ */
    const callback = readAuthCallback();

    /* ------------------------------------------------------------------ *
     * 2. Single place that ends the boot phase.
     * ------------------------------------------------------------------ */
    const finishBoot = (nextSession, error) => {
      if (!boot.active || boot.finished) return;
      boot.finished = true;
      window.clearTimeout(boot.watchdog);

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setAuthError(error ?? null);
      setLoading(false);

      /* ---------------------------------------------------------------- *
       * 3. Clean the address bar, whatever the outcome.
       *
       * Dropping `code`/`error` here is what makes a failed sign-in
       * recoverable: the next refresh starts a clean flow instead of
       * replaying a spent code. `navigate(..., { replace: true })` keeps
       * React Router's state in sync with the URL (a bare
       * `history.replaceState` would desync `useSearchParams`) and keeps the
       * dead code out of the browser history and the next `Referer`.
       *
       * This re-reads the **live** URL rather than reusing the boot snapshot,
       * which makes it self-limiting: on success auth-js has already stripped
       * `code` and there is nothing to do, and if the visitor has since
       * navigated elsewhere we never rewrite an unrelated route's query
       * string. The snapshot is still what we *diagnose* from, so the failure
       * reason survives the cleanup.
       * ---------------------------------------------------------------- */
      const live = readAuthCallback();
      if (live.isCallback && live.cleanedSearch !== live.search) {
        navigate({ pathname: window.location.pathname, search: live.cleanedSearch }, { replace: true });
      }
    };

    /* ------------------------------------------------------------------ *
     * 4. Watchdog — the UI must never hang on the spinner.
     * ------------------------------------------------------------------ */
    boot.watchdog = window.setTimeout(() => {
      finishBoot(null, {
        title: "We couldn't confirm your session",
        message:
          "Checking your sign-in took too long. You may still be signed in — refresh the page, or sign in again.",
      });
    }, SESSION_BOOT_TIMEOUT_MS);

    /* ------------------------------------------------------------------ *
     * 5. Resolve the session.
     *
     * `initialize()` is awaited first because it is the only call that returns
     * the PKCE-exchange error: `getSession()` awaits the same internal promise
     * but then reads storage and reports `{ session: null, error: null }`,
     * silently discarding why. Feature-detected so an older auth-js still works.
     * ------------------------------------------------------------------ */
    const initPromise =
      typeof supabase.auth.initialize === "function"
        ? supabase.auth.initialize().catch((caught) => ({ error: caught }))
        : Promise.resolve({ error: null });

    initPromise
      .then((init) =>
        supabase.auth
          .getSession()
          .then(({ data, error }) => ({ init, session: data?.session ?? null, error }))
      )
      .then(({ init, session: nextSession, error }) => {
        // Prefer an explicit error; otherwise infer one from a callback that
        // arrived but did not produce a session.
        const reported = error || init?.error;
        const callbackFailure = describeAuthCallbackError(callback, Boolean(nextSession));
        finishBoot(nextSession, normalizeAuthError(reported) || callbackFailure);
      })
      .catch((caught) => finishBoot(null, normalizeAuthError(caught)));

    /* ------------------------------------------------------------------ *
     * 6. Subscribe to every later change.
     *
     * Note the deliberate asymmetry: this handler never *completes* the boot
     * and never clears `authError` on `INITIAL_SESSION`. `INITIAL_SESSION` and
     * the `initialize()/getSession()` chain above resolve off the same internal
     * promise, so their relative order is not guaranteed. If the subscription
     * won that race and reported "no session", it would wipe the OAuth failure
     * reason we are about to compute — the exact silent-failure bug this
     * refactor exists to remove. Boot completion therefore belongs to the
     * chain (and its watchdog) alone; the subscription only reports genuine
     * transitions that happen after it.
     * ------------------------------------------------------------------ */
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!boot.active) return;

      // Mirror the session so late-arriving state is never stale, but let the
      // boot chain own `loading` / `authError` for the very first answer.
      if (event === "INITIAL_SESSION" && !boot.finished) {
        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? null);
        return;
      }

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        // Drop the cached profile too, or the next visitor on this device
        // briefly sees the previous account's data.
        setProfile(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      // A successful sign-in supersedes any earlier callback error.
      if (SIGNED_IN_EVENTS.has(event)) setAuthError(null);
      setLoading(false);
    });

    return () => {
      boot.active = false;
      window.clearTimeout(boot.watchdog);
      subscription?.subscription?.unsubscribe();
    };
    // Boot runs once per mount. `navigate` is stable across renders in
    // react-router v7, and depending on it would restart the whole OAuth flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Loads the signed-in visitor's profile row.
   *
   * Errors are kept rather than dropped: a 401/RLS failure here used to look
   * exactly like "this account has an empty profile", so the dashboard offered
   * a blank form and saving appeared to do nothing.
   */
  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setProfileError(null);
      return null;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await fetchProfile(user.id);
      setProfile(data || null);
      if (error) setProfileError(error);
      return data || null;
    } catch (caught) {
      setProfile(null);
      setProfileError(caught);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /**
   * Starts the Google OAuth flow.
   *
   * `redirectTo` is sanitised and re-based on *this* origin, so a
   * `/login?redirect=//evil.example` can never be used to bounce a visitor
   * somewhere else after they authenticate. The resolved target is returned so
   * callers can tell the visitor where they were trying to go.
   */
  const signInWithGoogle = useCallback(async (redirectTo) => {
    const target = absoluteAppUrl(redirectTo, DEFAULT_REDIRECT);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: target,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      return { data, error: error ? normalizeAuthError(error) : null, redirectTo: target };
    } catch (caught) {
      // signInWithOAuth performs a top-level navigation; if the browser blocks
      // it we land here. Surface it instead of leaving a stuck spinner.
      return { data: null, error: normalizeAuthError(caught), redirectTo: target };
    }
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) setAuthError(null);
      return { data, error: error ? normalizeAuthError(error) : null };
    } catch (caught) {
      return { data: null, error: normalizeAuthError(caught) };
    }
  }, []);

  const signUpWithPassword = useCallback(async (email, password, meta = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // The email-confirmation link must also be on the Supabase redirect
          // allowlist, and must be absolute — hence `absoluteAppUrl`.
          emailRedirectTo: absoluteAppUrl(DEFAULT_REDIRECT, DEFAULT_REDIRECT),
          data: meta,
        },
      });
      if (!error) setAuthError(null);
      return { data, error: error ? normalizeAuthError(error) : null };
    } catch (caught) {
      return { data: null, error: normalizeAuthError(caught) };
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: absoluteAppUrl("/login", "/login"),
      });
      return { data, error: error ? normalizeAuthError(error) : null };
    } catch (caught) {
      return { data: null, error: normalizeAuthError(caught) };
    }
  }, []);

  /**
   * Signs out, and always succeeds locally.
   *
   * The previous version cleared React state only when the server call
   * returned no error. `auth-js` propagates retryable/network failures without
   * removing the stored session, so an offline or expired-refresh-token
   * visitor got "Could not sign out. Try again." forever and could not escape
   * a session that no longer worked. Now: try the server, fall back to a local
   * sign-out, and clear React state unconditionally.
   */
  const signOut = useCallback(async () => {
    let serverError = null;

    try {
      // `global` revokes the refresh token server-side so a stolen one dies too.
      const { error } = await supabase.auth.signOut({ scope: "global" });
      serverError = error ?? null;
    } catch (caught) {
      serverError = caught;
    }

    if (serverError) {
      try {
        // Offline / dead refresh token: drop the local session instead.
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Storage itself is failing — remove the keys by hand as a last resort.
        clearLocalAuthStorage();
      }
    }

    setProfile(null);
    setProfileError(null);
    setSession(null);
    setUser(null);
    setAuthError(null);

    // The visitor IS signed out at this point, so no error is reported to the
    // UI. A failed *server-side* revocation is not actionable for them.
    return { error: null };
  }, []);

  const updateProfile = useCallback(
    async (values) => {
      if (!user?.id) return { data: null, error: new Error("Not signed in") };
      const payload = {
        id: user.id,
        email: user.email,
        ...(profile?.id === user.id ? profile : {}),
        ...values,
      };
      const { data, error } = await saveProfile(payload);
      if (data) {
        setProfile(data);
        setProfileError(null);
      } else if (error) {
        setProfileError(error);
      }
      return { data, error };
    },
    [profile, user?.id, user?.email]
  );

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoading,
      profileError,
      authError,
      isAuthenticated: Boolean(user),
      displayName:
        profile?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        (user?.email ? user.email.split("@")[0] : ""),
      avatarUrl: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
      loadProfile,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
      signOut,
      updateProfile,
      clearAuthError: () => setAuthError(null),
    }),
    [
      session,
      user,
      profile,
      loading,
      profileLoading,
      profileError,
      authError,
      loadProfile,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
      signOut,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Coerces anything thrown by the auth stack into the `{ title, message, hint }`
 * shape the UI renders, so a raw `AuthApiError` never reaches a visitor.
 */
function normalizeAuthError(error) {
  if (!error) return null;
  // Already normalised by `describeAuthCallbackError`.
  if (error.title && error.message) return error;

  const message = String(error.message || error.error_description || error || "");

  if (/redirect.*not allowed|invalid.*redirect|unauthorized.*redirect/i.test(message)) {
    return {
      title: "Sign-in was blocked by the redirect allowlist",
      message: "Supabase rejected this site's return address.",
      hint: "Add this origin to Supabase → Authentication → URL Configuration → Redirect URLs.",
    };
  }
  if (/pkce|code_verifier|code verifier|invalid_grant|expired/i.test(message)) {
    return {
      title: "Sign-in did not complete",
      message:
        "The authorisation code from Google could not be exchanged for a session. It was already used, had expired, or the flow started in a different browser or tab.",
      hint: "Sign in again from this same tab.",
    };
  }
  if (/failed to fetch|networkerror|load failed|timeout/i.test(message)) {
    return {
      title: "Can't reach Supabase",
      message: "The network request to the authentication server did not complete.",
      hint: "Check your connection and try again.",
    };
  }

  return { title: "Sign-in did not complete", message: message || "Please try again." };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
