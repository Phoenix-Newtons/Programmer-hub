import { useState } from "react";
import { Loader2 } from "lucide-react";
import GoogleIcon from "../brand/GoogleIcon";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cn, friendlyError } from "../../lib/utils";

/**
 * Real Google OAuth through Supabase.
 * Requires the Google provider to be enabled in Supabase → Authentication → Providers,
 * with the Supabase callback URL registered in Google Cloud Console.
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

  async function handleClick() {
    setBusy(true);
    onStart?.();
    const { error } = await signInWithGoogle(redirectTo);
    if (error) {
      setBusy(false);
      toast.error(friendlyError(error, "Google sign-in is not available yet."));
    }
    // On success the browser navigates to Google, so we keep the spinner on.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "btn border-line-strong bg-surface-solid text-ink hover:border-brand-400/60 hover:bg-brand-500/10",
        size === "sm" ? "px-3 py-2 text-[0.8rem]" : "px-4 py-2.5 text-sm",
        className
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-300" />
      ) : (
        <GoogleIcon className="h-[18px] w-[18px]" />
      )}
      {busy ? "Redirecting to Google…" : label}
    </button>
  );
}
