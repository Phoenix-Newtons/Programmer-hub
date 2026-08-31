import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile, saveProfile } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

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

  const signInWithGoogle = useCallback(async (redirectTo) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo || `${window.location.origin}/dashboard`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    return { data, error };
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signUpWithPassword = useCallback(
    async (email, password, meta = {}) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: meta,
        },
      });
      return { data, error };
    },
    []
  );

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
    }
    return { error };
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
      if (data) setProfile(data);
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
    }),
    [
      session,
      user,
      profile,
      loading,
      profileLoading,
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
