import { createClient } from "@supabase/supabase-js";

/**
 * Defaults point at the public project that ships with this repo.
 * Override them with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local`.
 */
const FALLBACK_URL = "https://ggfukwknodeqwnitkjvk.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnVrd2tub2RlcXduaXRranZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQwMjMsImV4cCI6MjA5ODgzMDAyM30.oqX9-CyBRox5hgFPjkzzPuCrJvsoFqbbwBgwMuFK7Vw";

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL).trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Required for `flowType: "pkce"` below — the OAuth `code` is read from the
    // callback URL and exchanged for a session. See `lib/authRedirect.js` for
    // the cleanup that stops a spent `?code=` from being replayed on refresh.
    detectSessionInUrl: true,
    flowType: "pkce",
    // Keep the storage key explicit so `clearLocalAuthStorage()` below can find
    // it without guessing at supabase-js internals.
    storageKey: authStorageKey(SUPABASE_URL),
  },
});

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * The `localStorage` prefix `auth-js` uses for this project — `sb-<ref>-auth-token`.
 * Derived from the project URL so it stays correct across environments.
 */
function authStorageKey(url) {
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return ref ? `sb-${ref}-auth-token` : undefined;
  } catch {
    return undefined;
  }
}

const STORAGE_KEY = authStorageKey(SUPABASE_URL);

/**
 * Last-resort local sign-out.
 *
 * `supabase.auth.signOut()` needs the network when the scope is `global`, and
 * `auth-js` deliberately does **not** clear local storage when that call fails
 * with a retryable/network error. The result is a visitor who cannot sign out:
 * the navbar keeps showing their name, `/dashboard` keeps rendering with a dead
 * session, and every write fails Row Level Security. Clearing the persisted
 * session by hand always works, offline or not.
 *
 * Only touches keys belonging to this Supabase project.
 *
 * @returns {boolean} True when storage was cleared (or there was nothing to clear).
 */
export function clearLocalAuthStorage() {
  if (typeof window === "undefined" || !STORAGE_KEY) return false;
  try {
    // `sb-<ref>-auth-token`, plus the PKCE verifier slots auth-js writes next
    // to it (`…-auth-token-code-verifier`, `…-auth-token-flow-<id>`).
    const doomed = Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_KEY));
    doomed.forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    // Private mode / blocked storage — there is nothing we can do, and nothing
    // was persisted in the first place.
    return false;
  }
}
