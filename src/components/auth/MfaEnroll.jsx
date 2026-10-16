import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, QrCode, RefreshCw, ShieldCheck } from "lucide-react";

import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { cn, copyToClipboard, friendlyError } from "../../lib/utils";
import { formatSecret, sanitizeCode } from "../../lib/mfa";

/**
 * TOTP enrolment: asks Supabase for a secret, shows the QR code (plus the
 * plain secret for manual entry) and verifies the first 6-digit code.
 *
 * Used by the sign-in gate and by Dashboard → Security.
 */
export default function MfaEnroll({ onEnrolled, onCancel, className }) {
  const { enrollTotp, verifyMfaCode } = useAuth();
  const toast = useToast();

  const [factor, setFactor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = useCallback(async () => {
    setLoading(true);
    setError("");
    setCode("");
    const { data, error: enrollError } = await enrollTotp();
    setLoading(false);
    if (enrollError) {
      setError(friendlyError(enrollError, "Could not start two-factor setup."));
      return;
    }
    setFactor(data);
  }, [enrollTotp]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (alive) await start();
    })();
    return () => {
      alive = false;
    };
  }, [start]);

  async function handleVerify(event) {
    event?.preventDefault();
    if (!factor?.id) return;
    setVerifying(true);
    setError("");
    const { error: verifyError } = await verifyMfaCode(factor.id, code);
    setVerifying(false);

    if (verifyError) {
      setError(friendlyError(verifyError, "That code did not match. Try the next one."));
      return;
    }
    toast.success("Two-factor authentication is on.");
    onEnrolled?.();
  }

  async function handleCopy() {
    const ok = await copyToClipboard(factor?.totp?.secret || "");
    if (!ok) {
      toast.error("Copy failed — select the code manually.");
      return;
    }
    setCopied(true);
    toast.success("Secret copied.");
  }

  return (
    <div className={cn("grid gap-5", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">Set up an authenticator app</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Scan the QR code with Google Authenticator, Authy, 1Password or any TOTP app, then enter the
            6-digit code it shows for Programmer&rsquo;s Hub.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-line-strong bg-white p-3">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" aria-label="Generating QR code" />
          ) : factor?.totp?.qr_code ? (
            <img
              src={factor.totp.qr_code}
              alt="QR code that adds this account to your authenticator app"
              className="h-full w-full"
            />
          ) : (
            <QrCode className="h-10 w-10 text-slate-400" aria-hidden="true" />
          )}
        </div>

        <div className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Or type the secret</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-line-strong bg-surface px-3 py-2.5 font-mono text-sm text-ink-soft">
                {factor?.totp?.secret ? formatSecret(factor.totp.secret) : "—"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!factor?.totp?.secret}
                aria-label="Copy secret"
                title="Copy secret"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <form onSubmit={handleVerify} className="grid gap-3">
            <Field
              label="6-digit code"
              required
              value={code}
              onChange={(event) => setCode(sanitizeCode(event.target.value))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              error={error || undefined}
              data-autofocus
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                icon={ShieldCheck}
                loading={verifying}
                disabled={loading || !factor?.id || code.length !== 6}
              >
                Turn on 2FA
              </Button>
              <Button
                variant="ghost"
                icon={RefreshCw}
                onClick={start}
                disabled={loading || verifying}
                type="button"
              >
                New QR code
              </Button>
              {onCancel ? (
                <Button variant="ghost" onClick={onCancel} disabled={verifying} type="button">
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Keep the secret somewhere safe. If you lose your authenticator you can remove the factor from
        Dashboard → Security while you still have a session, otherwise contact support.
      </p>
    </div>
  );
}
