import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile, saveProfile } from "../lib/api";
import { mfaState, sanitizeCode } from "../lib/mfa";

const AuthContext = createContext(null);

/**
 * Authentication + profile state.
 *
 * Auth is email + password through Supabase. Every session is expected to carry
 * a second factor: this provider exposes the TOTP MFA helpers (enroll, verify,
 * unenroll) and the derived `mfa` state the gate and dashboard render from.
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
  // False until the factor list has been read successfully — the gate stays
  // quiet on a flaky network instead of claiming two-factor is missing.
  const [mfaReady, setMfaReady] = useState(false);

  /** Reads the enrolled factors + this session's assurance level. */
  const refreshMfa = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setFactors([]);
      setLevels({ currentLevel: null, nextLevel: null });
      setMfaReady(false);
      return;
    }

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
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      // Let the auth client release its lock before hitting the MFA endpoints.
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
    const { data } = await fetchProfile(user.id);
    setProfileLoading(false);
    setProfile(data || null);
    return data || null;
  }, [user?.id]);

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

  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signUpWithPassword = useCallback(async (email, password, meta = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: meta,
      },
    });
    return { data, error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setProfile(null);
      setSession(null);
      setUser(null);
      setFactors([]);
      setLevels({ currentLevel: null, nextLevel: null });
      setMfaReady(false);
    }
    return { error };
  }, []);

  /* ------------------------------------------------------------------ *
   * Two-factor authentication (Supabase TOTP MFA)
   * ------------------------------------------------------------------ */

  /**
   * Starts a TOTP enrolment. Abandoned (unverified) enrolments are cleaned up
   * first, because Supabase rejects a second factor with the same name.
   */
  const enrollTotp = useCallback(async (friendlyName = "Authenticator app") => {
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = (existing?.all || []).filter((factor) => factor.status !== "verified");
    await Promise.all(
      stale.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => null))
    );

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });
    return { data, error };
  }, []);

  /**
   * Verifies a 6-digit code against a factor. On success Supabase promotes the
   * session to `aal2`, so we refresh the derived state.
   */
  const verifyMfaCode = useCallback(
    async (factorId, code) => {
      const clean = sanitizeCode(code);
      if (clean.length !== 6) return { error: new Error("Enter the 6-digit code from your app.") };

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: clean });
      if (!error) await refreshMfa();
      return { data, error };
    },
    [refreshMfa]
  );

  /** Removes a factor. `refreshSession` applies the AAL downgrade immediately. */
  const unenrollFactor = useCallback(
    async (factorId) => {
      const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
      if (!error) {
        await supabase.auth.refreshSession().catch(() => null);
        await refreshMfa();
      }
      return { data, error };
    },
    [refreshMfa]
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
