import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { friendlyError } from "../../lib/utils";
import { sanitizeCode } from "../../lib/mfa";

/**
 * Second step of the sign-in flow: a verified authenticator is attached to the
 * account, so the session stays at `aal1` until the TOTP code is verified.
 */
export default function MfaChallenge() {
  const { mfa, verifyMfaCode, signOut, displayName } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!mfa.verifiedFactor?.id) return;
    setBusy(true);
    setError("");
    const { error: verifyError } = await verifyMfaCode(mfa.verifiedFactor.id, code);
    setBusy(false);
    if (verifyError) {
      setError(friendlyError(verifyError, "That code did not match. Try the next one."));
      setCode("");
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-ink">Two-factor verification</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {displayName ? `${displayName}, ` : ""}enter the 6-digit code from your authenticator app to
            finish signing in.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field
          label="Authentication code"
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
        <Button type="submit" icon={ShieldCheck} loading={busy} disabled={code.length !== 6}>
          Verify and continue
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>Lost your device? Contact support to recover the account.</span>
        <Button variant="ghost" size="sm" icon={LogOut} onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
