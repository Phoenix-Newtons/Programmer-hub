import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import GoogleIcon from "../brand/GoogleIcon";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cn, friendlyError } from "../../lib/utils";

/**
 * How long to keep the "Redirecting to Google…" spinner before assuming the
 * navigation never happened. `signInWithOAuth()` resolves without an error as
 * soon as it has *scheduled* the top-level navigation — if the browser blocks
 * it (some in-app webviews, a lost user gesture, an aggressive extension) the
 * promise still succeeds and the old button spun forever with no way back.
 */
const REDIRECT_GRACE_MS = 8000;

/**
 * Real Google OAuth through Supabase.
 *
 * Requires:
 *  1. The Google provider enabled in Supabase → Authentication → Providers,
 *     with the Supabase callback URL registered in Google Cloud Console.
 *  2. **This deployment's origin** listed in Supabase → Authentication →
 *     URL Configuration → Redirect URLs (e.g.
 *     `https://programmer-hub-orcin.vercel.app/**`). If it is missing,
 *     `signInWithOAuth` still returns no error — Supabase quietly substitutes
 *     the configured Site URL and the visitor lands somewhere unexpected.
 *     That mismatch is the classic "works on localhost, breaks in production".
 *
 * `redirectTo` may be a relative path or an absolute same-origin URL; both are
 * sanitised in `AuthContext.signInWithGoogle`, so an untrusted `?redirect=`
 * value can never be used to bounce a visitor to another origin.
 */
export default function GoogleButton({
  label = "Continue with Google",
  redirectTo,
  className,
  onStart,
  size = "md",
}) {
  const { signInWithGoogle } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const graceTimer = useRef(0);

  // Always clear the pending timer, including on unmount mid-redirect.
  useEffect(() => () => window.clearTimeout(graceTimer.current), []);

  async function handleClick() {
    window.clearTimeout(graceTimer.current);
    setBusy(true);
    onStart?.();

    // Arm the recovery timer *before* awaiting: the navigation, if it happens,
    // tears the page down and the timer simply never fires.
    graceTimer.current = window.setTimeout(() => {
      setBusy(false);
      toast.warning(
        "Still here? The redirect to Google was blocked. Allow pop-ups and redirects for this site, then try again."
      );
    }, REDIRECT_GRACE_MS);

    const { error } = await signInWithGoogle(redirectTo);

    if (error) {
      window.clearTimeout(graceTimer.current);
      setBusy(false);
      toast.error(
        error.title && error.message
          ? `${error.title} — ${error.message}`
          : friendlyError(error, "Google sign-in is not available yet.")
      );
    }
    // On success the browser navigates to Google, so we keep the spinner on
    // until either the page unloads or the grace timer above fires.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "btn border-line-strong bg-surface-solid text-ink hover:border-brand-400/60 hover:bg-brand-500/10",
        size === "sm" ? "px-3 py-2 text-[0.8rem]" : "px-4 py-2.5 text-sm",
        className
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-300" aria-hidden="true" />
      ) : (
        <GoogleIcon className="h-[18px] w-[18px]" />
      )}
      {busy ? "Redirecting to Google…" : label}
    </button>
  );
}
