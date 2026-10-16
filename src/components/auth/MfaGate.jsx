import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert } from "lucide-react";

import Button from "../ui/Button";
import MfaChallenge from "./MfaChallenge";
import MfaEnroll from "./MfaEnroll";
import { useAuth } from "../../context/AuthContext";
import useFocusTrap from "../../hooks/useFocusTrap";
import { mfaSkippedThisSession, setMfaSkippedThisSession } from "../../lib/mfa";

/**
 * Two-factor gate, mounted once in the app shell.
 *
 * • The account has an authenticator but this session is still `aal1`
 *   → the challenge is blocking: verify, or sign out.
 * • Two-factor is required and nothing is enrolled yet
 *   → the setup sheet can be postponed for the session; publishing stays
 *     locked until a factor is verified (and the database policies agree).
 */
export default function MfaGate() {
  const { isAuthenticated, mfa, mfaReady, signOut } = useAuth();
  const [skipped, setSkipped] = useState(() => mfaSkippedThisSession());
  const panelRef = useRef(null);

  const mode = !isAuthenticated
    ? null
    : mfa.needsChallenge
      ? "challenge"
      : mfaReady && mfa.needsSetup && !skipped
        ? "setup"
        : null;
  const dismissible = mode === "setup";

  const postpone = () => {
    setMfaSkippedThisSession(true);
    setSkipped(true);
  };

  useFocusTrap(panelRef, Boolean(mode), {
    onEscape: dismissible ? postpone : undefined,
    initialFocus: "[data-autofocus]",
  });

  // Lock the page behind the gate while it is open.
  useEffect(() => {
    if (!mode || typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  if (!mode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-gate-title"
        className="relative max-h-[100dvh] w-full max-w-xl animate-rise overflow-y-auto rounded-t-3xl border border-line-strong bg-surface-solid p-6 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-7"
      >
        <h2 id="mfa-gate-title" className="sr-only">
          Two-factor authentication
        </h2>

        {mode === "challenge" ? (
          <MfaChallenge />
        ) : (
          <div className="grid gap-5">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-amber-100">
                Two-factor authentication is required on {""}
                Programmer&rsquo;s Hub. Add an authenticator app to publish projects, post roles and message
                developers — browsing stays open either way.
              </p>
            </div>

            <MfaEnroll onEnrolled={() => setMfaSkippedThisSession(false)} />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <Button variant="ghost" size="sm" onClick={postpone}>
                Remind me later
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
