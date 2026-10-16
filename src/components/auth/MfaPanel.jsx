import { useState } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";

import Badge from "../ui/Badge";
import Button from "../ui/Button";
import MfaEnroll from "./MfaEnroll";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { friendlyError, timeAgo } from "../../lib/utils";
import { MFA_REQUIRED } from "../../lib/mfa";

/**
 * Dashboard → Security: manage the authenticator apps attached to the account.
 * Enrolment itself lives in `MfaEnroll` so the sign-in gate can reuse it.
 */
export default function MfaPanel() {
  const { mfa, mfaLoading, refreshMfa, unenrollFactor } = useAuth();
  const toast = useToast();
  const [enrolling, setEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function handleRemove(factor) {
    setRemovingId(factor.id);
    const { error } = await unenrollFactor(factor.id);
    setRemovingId(null);
    if (error) {
      toast.error(friendlyError(error, "Could not remove that authenticator."));
      return;
    }
    toast.success("Authenticator removed. Two-factor is off until you add another one.");
  }

  return (
    <div className="grid gap-6">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-ink">Two-factor authentication</h2>
              {mfaLoading ? (
                <Badge tone="slate" icon={Loader2}>
                  Checking
                </Badge>
              ) : mfa.isEnrolled ? (
                <Badge tone="emerald" icon={ShieldCheck}>
                  On
                </Badge>
              ) : (
                <Badge tone="amber" icon={ShieldOff}>
                  Off
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {mfa.isEnrolled
                ? "Every new sign-in must confirm a 6-digit code from your authenticator app before you can publish or edit anything."
                : MFA_REQUIRED
                  ? "Two-factor is required on this hub. Add an authenticator app to unlock publishing, roles and applications."
                  : "Optional but recommended — add an authenticator app to protect your account and unlock publishing."}
            </p>
            {mfa.isEnrolled ? (
              <p className="mt-2 text-xs text-muted">
                This session is at{" "}
                <span className="font-mono font-semibold text-ink-soft">{mfa.currentLevel || "aal1"}</span>
                {mfa.currentLevel === "aal2" ? " — fully verified." : " — verify to reach aal2."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={refreshMfa}
            loading={mfaLoading}
            aria-label="Refresh two-factor status"
          >
            Refresh
          </Button>
          {!mfa.isEnrolled && !enrolling ? (
            <Button size="sm" icon={Plus} onClick={() => setEnrolling(true)}>
              Add authenticator
            </Button>
          ) : null}
        </div>
      </div>

      {enrolling ? (
        <div className="card p-6">
          <MfaEnroll
            onEnrolled={() => {
              setEnrolling(false);
              refreshMfa();
            }}
            onCancel={() => setEnrolling(false)}
          />
        </div>
      ) : null}

      {mfa.totp.length ? (
        <div className="card p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Authenticators</h3>
          <ul className="mt-4 grid gap-3">
            {mfa.totp.map((factor) => (
              <li
                key={factor.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {factor.friendly_name || "Authenticator app"}
                    </p>
                    <p className="text-xs text-muted">
                      {factor.status === "verified" ? "Verified" : "Awaiting first code"}
                      {factor.created_at ? ` · added ${timeAgo(factor.created_at)}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  loading={removingId === factor.id}
                  onClick={() => handleRemove(factor)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Removing your last authenticator switches two-factor off and locks publishing until a new one is
            verified.
          </p>
        </div>
      ) : null}
    </div>
  );
}
