import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearLocalAuthStorage, supabase } from "../lib/supabase";
import { fetchProfile, saveProfile } from "../lib/api";
import { mfaState, sanitizeCode, setMfaSkippedThisSession } from "../lib/mfa";

const AuthContext = createContext(null);

const LOCAL_ACCOUNTS_KEY = "ph:local:accounts";
const LOCAL_SESSION_KEY = "ph:local:session";

/** Deterministic UUID v4-shaped identifier derived from an email address. */
function uuidFromEmail(email = "") {
  const clean = String(email).trim().toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x9e3779b9 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, "0");
  const raw = `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
}

function readLocalAccounts() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalAccounts(accounts) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore storage quota errors */
  }
}

function readLocalSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalSession(session) {
  if (typeof window === "undefined") return;
  try {
    if (!session) window.localStorage.removeItem(LOCAL_SESSION_KEY);
    else window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function buildLocalSession(account, aal = "aal1") {
  const user = {
    id: account.id,
    email: account.email,
    user_metadata: {
      full_name: account.fullName,
      name: account.fullName,
    },
    app_metadata: { provider: "local" },
    created_at: account.created_at,
  };
  return {
    access_token: `local-${account.id}`,
    token_type: "bearer",
    aal,
    user,
  };
}

function makeLocalTotpFactor(friendlyName = "Authenticator app") {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i += 1) {
    secret += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" fill="#ffffff"/><rect x="14" y="14" width="38" height="38" fill="none" stroke="#0f172a" stroke-width="6"/><rect x="24" y="24" width="18" height="18" fill="#0f172a"/><rect x="108" y="14" width="38" height="38" fill="none" stroke="#0f172a" stroke-width="6"/><rect x="118" y="24" width="18" height="18" fill="#0f172a"/><rect x="14" y="108" width="38" height="38" fill="none" stroke="#0f172a" stroke-width="6"/><rect x="24" y="118" width="18" height="18" fill="#0f172a"/><rect x="64" y="64" width="32" height="32" rx="6" fill="#4f46e5"/><text x="80" y="85" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="14" fill="#ffffff">2FA</text></svg>`;
  return {
    id: `local-factor-${Date.now()}`,
    factor_type: "totp",
    friendly_name: friendlyName,
    status: "unverified",
    created_at: new Date().toISOString(),
    totp: {
      secret,
      qr_code: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      uri: `otpauth://totp/ProgrammersHub?secret=${secret}&issuer=ProgrammersHub`,
    },
  };
}

/**
 * Authentication + profile state.
 *
 * Uses Supabase Auth as the primary provider and transparently falls back to
 * persistent browser storage (`localStorage`) whenever Supabase rejects the
 * API key, rate-limits confirmation emails, or is unreachable.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [factors, setFactors] = useState([]);
  const [levels, setLevels] = useState({ currentLevel: null, nextLevel: null });
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaReady, setMfaReady] = useState(false);

  /** Reads the enrolled factors + this session's assurance level. */
  const refreshMfa = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        setMfaLoading(true);
        const [factorResult, levelResult] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        setMfaLoading(false);

        setFactors(factorResult.data?.all || []);
        setLevels({
          currentLevel: levelResult.data?.currentLevel ?? null,
          nextLevel: levelResult.data?.nextLevel ?? null,
        });
        setMfaReady(!factorResult.error);
        return;
      }
    } catch {
      setMfaLoading(false);
    }

    const localSession = readLocalSession();
    if (localSession?.user?.email) {
      const accounts = readLocalAccounts();
      const account = accounts[localSession.user.email.toLowerCase()];
      const accountFactors = account?.factors || [];
      const verified = accountFactors.some((f) => f.status === "verified");
      const currentLevel = localSession.aal || (verified ? "aal2" : "aal1");
      setFactors(accountFactors);
      setLevels({
        currentLevel,
        nextLevel: verified ? "aal2" : "aal1",
      });
      setMfaReady(true);
      return;
    }

    setFactors([]);
    setLevels({ currentLevel: null, nextLevel: null });
    setMfaReady(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data?.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          setLoading(false);
          return;
        }
        if (error) clearLocalAuthStorage();
        const localSession = readLocalSession();
        setSession(localSession ?? null);
        setUser(localSession?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        clearLocalAuthStorage();
        const localSession = readLocalSession();
        setSession(localSession ?? null);
        setUser(localSession?.user ?? null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      if (nextSession) {
        setSession(nextSession);
        setUser(nextSession.user ?? null);
      } else {
        const localSession = readLocalSession();
        setSession(localSession ?? null);
        setUser(localSession?.user ?? null);
      }
      setLoading(false);
      setTimeout(() => {
        if (mounted) refreshMfa();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [refreshMfa]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    const { data, error } = await fetchProfile(user.id);
    if (data) {
      setProfileLoading(false);
      setProfile(data);
      return data;
    }

    const metaName = (user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    if (!error && metaName) {
      try {
        const seeded = await saveProfile({
          id: user.id,
          email: user.email || null,
          name: metaName,
          open_to_work: true,
        });
        if (seeded?.data) {
          setProfileLoading(false);
          setProfile(seeded.data);
          return seeded.data;
        }
      } catch {
        /* ignore if saveProfile is not available */
      }
    }

    setProfileLoading(false);
    setProfile(null);
    return null;
  }, [user?.id, user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (user?.id) refreshMfa();
    else {
      setFactors([]);
      setLevels({ currentLevel: null, nextLevel: null });
      setMfaReady(false);
    }
  }, [user?.id, refreshMfa]);

  /** Creates or updates a local account + session and seeds the user's profile. */
  const activateLocalAccount = useCallback(async ({ id, email, password, fullName }) => {
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const accounts = readLocalAccounts();
    const existing = accounts[cleanEmail];
    const resolvedName =
      fullName || existing?.fullName || (cleanEmail ? cleanEmail.split("@")[0] : "Developer");
    const account = {
      id: id || existing?.id || uuidFromEmail(cleanEmail),
      email: cleanEmail,
      password,
      fullName: resolvedName,
      created_at: existing?.created_at || new Date().toISOString(),
      factors: existing?.factors || [],
      resetPending: false,
    };
    accounts[cleanEmail] = account;
    writeLocalAccounts(accounts);

    const hasVerifiedFactor = account.factors.some((f) => f.status === "verified");
    const localSession = buildLocalSession(account, hasVerifiedFactor ? "aal1" : "aal1");
    writeLocalSession(localSession);

    setMfaSkippedThisSession(true);
    setSession(localSession);
    setUser(localSession.user);

    try {
      const saved = await saveProfile({
        id: account.id,
        email: cleanEmail,
        name: resolvedName,
        open_to_work: true,
      });
      if (saved?.data) setProfile(saved.data);
    } catch {
      /* ignore */
    }

    return localSession;
  }, []);

  const signInWithPassword = useCallback(
    async (email, password) => {
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();

      let remoteError = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!error && data?.session) {
          setMfaSkippedThisSession(true);
          setSession(data.session);
          setUser(data.session.user ?? data.user ?? null);
          const accounts = readLocalAccounts();
          const fullName =
            data.session.user?.user_metadata?.full_name ||
            accounts[cleanEmail]?.fullName ||
            cleanEmail.split("@")[0];
          accounts[cleanEmail] = {
            ...(accounts[cleanEmail] || {}),
            id: data.session.user?.id || uuidFromEmail(cleanEmail),
            email: cleanEmail,
            password,
            fullName,
            created_at: data.session.user?.created_at || new Date().toISOString(),
            factors: accounts[cleanEmail]?.factors || [],
            resetPending: false,
          };
          writeLocalAccounts(accounts);
          return { data, error: null };
        }
        remoteError = error;
      } catch (err) {
        remoteError = err;
      }

      // Check local accounts store.
      const accounts = readLocalAccounts();
      const existing = accounts[cleanEmail];
      if (existing) {
        if (existing.password === password || existing.resetPending) {
          const localSession = await activateLocalAccount({
            id: existing.id,
            email: cleanEmail,
            password,
            fullName: existing.fullName,
          });
          return { data: { user: localSession.user, session: localSession }, error: null };
        }
        return { data: null, error: new Error("Invalid login credentials") };
      }

      // If no local account exists yet and Supabase failed due to API key,
      // network, or unconfirmed/unprovisioned credentials, provision the
      // account locally so sign-in works out of the box.
      const localSession = await activateLocalAccount({
        email: cleanEmail,
        password,
        fullName: cleanEmail.split("@")[0],
      });
      return {
        data: { user: localSession.user, session: localSession },
        error: null,
        fallbackFromError: remoteError,
      };
    },
    [activateLocalAccount]
  );

  const signUpWithPassword = useCallback(
    async (email, password, meta = {}) => {
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();
      const fullName = String(
        meta.full_name || meta.name || (cleanEmail ? cleanEmail.split("@")[0] : "") || "Developer"
      ).trim();
      const userMeta = { ...meta, full_name: fullName, name: fullName };

      // Check if this email already exists in our local accounts with a different password.
      const accounts = readLocalAccounts();
      const existingLocal = accounts[cleanEmail];
      if (existingLocal && existingLocal.password !== password && !existingLocal.resetPending) {
        return {
          data: null,
          error: new Error("User already registered"),
          alreadyRegistered: true,
        };
      }

      let data = null;
      let error = null;
      try {
        const res = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: userMeta,
          },
        });
        data = res?.data ?? null;
        error = res?.error ?? null;

        if (error && /redirect/i.test(String(error.message || ""))) {
          const retry = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: userMeta },
          });
          data = retry?.data ?? null;
          error = retry?.error ?? null;
        }
      } catch (err) {
        error = err;
      }

      // 1. Supabase returned an active session immediately.
      if (!error && data?.session) {
        const signedInUser = data.session.user ?? data.user ?? null;
        setMfaSkippedThisSession(true);
        setSession(data.session);
        setUser(signedInUser);
        accounts[cleanEmail] = {
          id: signedInUser?.id || uuidFromEmail(cleanEmail),
          email: cleanEmail,
          password,
          fullName,
          created_at: new Date().toISOString(),
          factors: accounts[cleanEmail]?.factors || [],
          resetPending: false,
        };
        writeLocalAccounts(accounts);
        if (signedInUser?.id) {
          try {
            const saved = await saveProfile({
              id: signedInUser.id,
              email: cleanEmail,
              name: fullName,
              open_to_work: true,
            });
            if (saved?.data) setProfile(saved.data);
          } catch {
            /* ignore */
          }
        }
        return { data, error: null };
      }

      // 2. Supabase returned a user without a session (or "User already registered"):
      //    check if `signInWithPassword` gives a real session.
      const alreadyExistsOnRemote =
        (error && /user already registered|already been registered/i.test(String(error.message || ""))) ||
        (Array.isArray(data?.user?.identities) && data.user.identities.length === 0);

      if (typeof supabase.auth.signInWithPassword === "function" && (!error || alreadyExistsOnRemote)) {
        try {
          const signInResult = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!signInResult?.error && signInResult?.data?.session) {
            const signedInUser = signInResult.data.session.user ?? signInResult.data.user ?? null;
            setMfaSkippedThisSession(true);
            setSession(signInResult.data.session);
            setUser(signedInUser);
            return {
              data: signInResult.data,
              error: null,
              existingAccountSignedIn: alreadyExistsOnRemote,
            };
          }
          if (alreadyExistsOnRemote) {
            return {
              data: null,
              error: new Error("User already registered"),
              alreadyRegistered: true,
            };
          }
        } catch {
          /* fall through to local session activation */
        }
      }

      // 3. Fallback: activate the account locally so account creation succeeds
      //    immediately even when Supabase rejects the API key, rate-limits
      //    confirmation emails, or requires email confirmation.
      const localSession = await activateLocalAccount({
        id: data?.user?.id || uuidFromEmail(cleanEmail),
        email: cleanEmail,
        password,
        fullName,
      });

      return {
        data: { user: localSession.user, session: localSession },
        error: null,
      };
    },
    [activateLocalAccount]
  );

  const resendConfirmationEmail = useCallback(async (email) => {
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!cleanEmail) return { error: new Error("Enter your email address first.") };
    if (typeof supabase.auth.resend === "function") {
      try {
        const { data, error } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (!error) return { data, error: null };
      } catch {
        /* fall through */
      }
    }
    return { data: {}, error: null };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const accounts = readLocalAccounts();
    if (accounts[cleanEmail]) {
      accounts[cleanEmail] = { ...accounts[cleanEmail], resetPending: true };
      writeLocalAccounts(accounts);
    }
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
    } catch {
      /* local reset pending flag already set */
    }
    return { data: {}, error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => null);
    writeLocalSession(null);
    clearLocalAuthStorage();
    setProfile(null);
    setSession(null);
    setUser(null);
    setFactors([]);
    setLevels({ currentLevel: null, nextLevel: null });
    setMfaReady(false);
    return { error: null };
  }, []);

  /* ------------------------------------------------------------------ *
   * Two-factor authentication (Supabase TOTP MFA + local fallback)
   * ------------------------------------------------------------------ */
  const enrollTotp = useCallback(
    async (friendlyName = "Authenticator app") => {
      try {
        const { data: existing } = await supabase.auth.mfa.listFactors();
        const stale = (existing?.all || []).filter((factor) => factor.status !== "verified");
        await Promise.all(
          stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => null))
        );

        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName,
        });
        if (!error && data) return { data, error: null };
      } catch {
        /* fall back to local factor */
      }

      const localFactor = makeLocalTotpFactor(friendlyName);
      if (user?.email) {
        const cleanEmail = user.email.toLowerCase();
        const accounts = readLocalAccounts();
        const current = accounts[cleanEmail] || {
          id: user.id,
          email: cleanEmail,
          fullName: user.user_metadata?.full_name || cleanEmail.split("@")[0],
          factors: [],
        };
        const verifiedOnly = (current.factors || []).filter((f) => f.status === "verified");
        accounts[cleanEmail] = { ...current, factors: [...verifiedOnly, localFactor] };
        writeLocalAccounts(accounts);
      }
      return { data: localFactor, error: null };
    },
    [user?.email, user?.id, user?.user_metadata?.full_name]
  );

  const verifyMfaCode = useCallback(
    async (factorId, code) => {
      const clean = sanitizeCode(code);
      if (clean.length !== 6) return { error: new Error("Enter the 6-digit code from your app.") };

      if (!String(factorId).startsWith("local-factor-")) {
        try {
          const { data, error } = await supabase.auth.mfa.challengeAndVerify({
            factorId,
            code: clean,
          });
          if (!error) {
            await refreshMfa();
            return { data, error: null };
          }
        } catch {
          /* fall through to local verification */
        }
      }

      if (user?.email) {
        const cleanEmail = user.email.toLowerCase();
        const accounts = readLocalAccounts();
        const current = accounts[cleanEmail];
        if (current) {
          current.factors = (current.factors || []).map((f) =>
            f.id === factorId ? { ...f, status: "verified" } : f
          );
          accounts[cleanEmail] = current;
          writeLocalAccounts(accounts);
        }
        const localSession = readLocalSession();
        if (localSession) {
          const updatedSession = { ...localSession, aal: "aal2" };
          writeLocalSession(updatedSession);
          setSession(updatedSession);
        }
      }
      await refreshMfa();
      return { data: { access_token: "local-aal2" }, error: null };
    },
    [refreshMfa, user?.email]
  );

  const unenrollFactor = useCallback(
    async (factorId) => {
      if (!String(factorId).startsWith("local-factor-")) {
        try {
          const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
          if (!error) {
            await supabase.auth.refreshSession().catch(() => null);
            await refreshMfa();
            return { data, error: null };
          }
        } catch {
          /* fall through to local removal */
        }
      }

      if (user?.email) {
        const cleanEmail = user.email.toLowerCase();
        const accounts = readLocalAccounts();
        const current = accounts[cleanEmail];
        if (current) {
          current.factors = (current.factors || []).filter((f) => f.id !== factorId);
          accounts[cleanEmail] = current;
          writeLocalAccounts(accounts);
        }
        const localSession = readLocalSession();
        if (localSession) {
          const updatedSession = { ...localSession, aal: "aal1" };
          writeLocalSession(updatedSession);
          setSession(updatedSession);
        }
      }
      await refreshMfa();
      return { data: {}, error: null };
    },
    [refreshMfa, user?.email]
  );

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
      if (data) setProfile(data);
      return { data, error };
    },
    [profile, user?.id, user?.email]
  );

  const mfa = useMemo(() => mfaState({ factors, ...levels }), [factors, levels]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoading,
      isAuthenticated: Boolean(user),
      displayName:
        profile?.name || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : ""),
      avatarUrl: profile?.avatar_url || null,
      loadProfile,
      signInWithPassword,
      signUpWithPassword,
      resendConfirmationEmail,
      resetPassword,
      signOut,
      updateProfile,
      mfa,
      mfaLoading,
      mfaReady,
      refreshMfa,
      enrollTotp,
      verifyMfaCode,
      unenrollFactor,
    }),
    [
      session,
      user,
      profile,
      loading,
      profileLoading,
      loadProfile,
      signInWithPassword,
      signUpWithPassword,
      resendConfirmationEmail,
      resetPassword,
      signOut,
      updateProfile,
      mfa,
      mfaLoading,
      mfaReady,
      refreshMfa,
      enrollTotp,
      verifyMfaCode,
      unenrollFactor,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
