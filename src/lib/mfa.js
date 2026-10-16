/**
 * Two-factor authentication helpers (Supabase Auth TOTP MFA).
 *
 * Supabase expresses the strength of a session with an Authenticator Assurance
 * Level (AAL) carried in the access-token JWT:
 *
 *   aal1 → email + password (or any other single factor) only
 *   aal2 → the session also passed a TOTP challenge from an authenticator app
 *
 * Everything in this file is pure/SSR-safe so it can be unit tested and shared
 * by the context, the gate and the dashboard panel.
 */

/**
 * `VITE_REQUIRE_MFA=false` downgrades 2FA from "required" to "opt-in":
 * the challenge still runs for members who enrolled a factor, but new members
 * are not pushed through enrolment. Default: required.
 */
export const MFA_REQUIRED = import.meta.env.VITE_REQUIRE_MFA !== "false";

/** sessionStorage key remembering "set this up later" for the current tab. */
const SKIP_KEY = "ph:mfa-skipped";

/** `listFactors()` returns `factor_type`; older payloads used `type`. */
export function factorType(factor) {
  return factor?.factor_type || factor?.type || "";
}

export function isTotpFactor(factor) {
  return factorType(factor) === "totp";
}

export function isVerifiedFactor(factor) {
  return factor?.status === "verified";
}

/** Keep only digits, at most `length` of them (TOTP codes are 6 digits). */
export function sanitizeCode(value = "", length = 6) {
  return String(value).replace(/\D/g, "").slice(0, length);
}

export function formatSecret(secret = "") {
  return String(secret)
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * Derives everything the UI needs to know from the enrolled factors and the
 * current AAL pair.
 *
 * @param {{ factors?: object[], currentLevel?: string|null, nextLevel?: string|null }} input
 */
export function mfaState({ factors = [], currentLevel = null, nextLevel = null } = {}) {
  const list = Array.isArray(factors) ? factors : [];
  const totp = list.filter(isTotpFactor);
  const verified = totp.filter(isVerifiedFactor);
  const pending = totp.filter((factor) => !isVerifiedFactor(factor));
  const verifiedFactor = verified[0] || null;

  // Signed in with a factor on the account, but this session is still aal1.
  const needsChallenge = Boolean(verifiedFactor) && currentLevel !== "aal2";
  // No factor at all while two-factor is required.
  const needsSetup = MFA_REQUIRED && !verified.length;

  return {
    factors: list,
    totp,
    verified,
    pending,
    verifiedFactor,
    currentLevel,
    nextLevel,
    /** A verified authenticator app is attached to the account. */
    isEnrolled: verified.length > 0,
    /** The account must prove the second factor before it can write. */
    needsChallenge,
    /** Two-factor is required and the account has not enrolled yet. */
    needsSetup,
    required: MFA_REQUIRED,
    /** Publishing, applying and profile edits are allowed from here on. */
    writesAllowed: !needsChallenge && !needsSetup,
    /** `"challenge"` | `"setup"` | null — what the gate should ask for. */
    blockedReason: needsChallenge ? "challenge" : needsSetup ? "setup" : null,
  };
}

/* ------------------------------------------------------------------ *
 * "Remind me later" — session scoped, so a fresh sign-in asks again.
 * ------------------------------------------------------------------ */
export function mfaSkippedThisSession() {
  try {
    return window.sessionStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMfaSkippedThisSession(skipped) {
  try {
    if (skipped) window.sessionStorage.setItem(SKIP_KEY, "1");
    else window.sessionStorage.removeItem(SKIP_KEY);
  } catch {
    /* private mode / no storage — the gate simply keeps asking */
  }
}
