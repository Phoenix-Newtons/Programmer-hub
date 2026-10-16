import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/**
 * One place to ask "is this session allowed to write yet?".
 *
 * Writes go through Supabase row level security, which refuses `aal1` sessions
 * that have an authenticator enrolled. This hook mirrors that rule in the UI so
 * people get a sentence instead of a policy violation:
 *
 *   const { guard } = useMfaGuard();
 *   if (!guard("publish a project")) return;
 */
export default function useMfaGuard() {
  const { mfa } = useAuth();
  const toast = useToast();

  const guard = useCallback(
    (action = "do that") => {
      if (mfa.writesAllowed) return true;
      toast.warning(
        mfa.needsChallenge
          ? "Confirm your two-factor code before you continue."
          : `Set up two-factor authentication to ${action}.`
      );
      return false;
    },
    [mfa.needsChallenge, mfa.writesAllowed, toast]
  );

  return useMemo(
    () => ({
      guard,
      canWrite: mfa.writesAllowed,
      needsSetup: mfa.needsSetup,
      needsChallenge: mfa.needsChallenge,
      isEnrolled: mfa.isEnrolled,
    }),
    [guard, mfa.isEnrolled, mfa.needsChallenge, mfa.needsSetup, mfa.writesAllowed]
  );
}
