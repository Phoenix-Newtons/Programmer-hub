import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/**
 * One place to ask "is this session allowed to write yet?".
 *
 * Writes go through Supabase row level security (`public.mfa_satisfied()` in
 * `supabase/schema.sql`), which:
 *   • requires `aal2` when the account has a verified TOTP factor enrolled
 *   • accepts `aal1` when the account has no factor enrolled yet, so new
 *     members are never locked out of saving their profile or projects
 */
export default function useMfaGuard() {
  const { mfa } = useAuth();
  const toast = useToast();

  const canWrite = !mfa.needsChallenge;

  const guard = useCallback(
    (action = "do that") => {
      if (canWrite) return true;
      toast.warning(`Confirm your two-factor code before you ${action}.`);
      return false;
    },
    [canWrite, toast]
  );

  return useMemo(
    () => ({
      guard,
      canWrite,
      needsSetup: mfa.needsSetup,
      needsChallenge: mfa.needsChallenge,
      isEnrolled: mfa.isEnrolled,
    }),
    [canWrite, guard, mfa.isEnrolled, mfa.needsChallenge, mfa.needsSetup]
  );
}
