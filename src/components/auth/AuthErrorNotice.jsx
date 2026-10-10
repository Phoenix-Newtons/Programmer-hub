import { ShieldAlert, X } from "lucide-react";

/**
 * Renders a failed sign-in attempt.
 *
 * Before this existed, a failed OAuth callback produced *no UI at all* — the
 * visitor was simply shown the signed-out screen again, with the dead `?code=`
 * still in the address bar, and had no idea the sign-in had been attempted,
 * let alone why it failed. This is the surface for `authError` from
 * `AuthContext` (see `describeAuthCallbackError` in `lib/authRedirect.js`).
 *
 * @param {{ title: string, message: string, hint?: string } | null} error
 * @param {() => void} [onDismiss]
 * @param {string} [className]
 */
export default function AuthErrorNotice({ error, onDismiss, className = "" }) {
  if (!error?.message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{error.title || "Sign-in did not complete"}</p>
        <p className="mt-1 leading-relaxed text-muted">{error.message}</p>
        {error.hint ? (
          <p className="mt-2 border-t border-rose-400/20 pt-2 text-xs leading-relaxed text-muted">
            {error.hint}
          </p>
        ) : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this message"
          className="-m-1 shrink-0 rounded-lg p-1 text-muted transition hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
