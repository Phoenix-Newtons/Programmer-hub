import { describe, expect, it } from "vitest";
import { MFA_REQUIRED, formatSecret, isTotpFactor, isVerifiedFactor, mfaState, sanitizeCode } from "../mfa";

const factor = (overrides = {}) => ({
  id: "factor-1",
  factor_type: "totp",
  friendly_name: "Authenticator app",
  status: "verified",
  ...overrides,
});

describe("mfa helpers", () => {
  it("recognises TOTP factors from either payload shape", () => {
    expect(isTotpFactor({ factor_type: "totp" })).toBe(true);
    expect(isTotpFactor({ type: "totp" })).toBe(true);
    expect(isTotpFactor({ factor_type: "phone" })).toBe(false);
    expect(isVerifiedFactor({ status: "verified" })).toBe(true);
    expect(isVerifiedFactor({ status: "unverified" })).toBe(false);
  });

  it("keeps codes to six digits", () => {
    expect(sanitizeCode("12 34-56")).toBe("123456");
    expect(sanitizeCode("1234567890")).toBe("123456");
    expect(sanitizeCode("abc")).toBe("");
  });

  it("groups the secret for manual entry", () => {
    expect(formatSecret("ABCDEFGH")).toBe("ABCD EFGH");
    expect(formatSecret("")).toBe("");
  });

  it("asks for a challenge when a factor exists but the session is aal1", () => {
    const state = mfaState({ factors: [factor()], currentLevel: "aal1", nextLevel: "aal2" });
    expect(state.isEnrolled).toBe(true);
    expect(state.needsChallenge).toBe(true);
    expect(state.needsSetup).toBe(false);
    expect(state.blockedReason).toBe("challenge");
    expect(state.writesAllowed).toBe(false);
  });

  it("is satisfied at aal2", () => {
    const state = mfaState({ factors: [factor()], currentLevel: "aal2", nextLevel: "aal2" });
    expect(state.needsChallenge).toBe(false);
    expect(state.writesAllowed).toBe(true);
    expect(state.blockedReason).toBe(null);
  });

  it("asks for enrolment when nothing is enrolled yet", () => {
    const state = mfaState({ factors: [], currentLevel: "aal1", nextLevel: "aal1" });
    expect(state.isEnrolled).toBe(false);
    expect(state.needsChallenge).toBe(false);
    expect(state.needsSetup).toBe(MFA_REQUIRED);
    expect(state.writesAllowed).toBe(!MFA_REQUIRED);
    expect(state.blockedReason).toBe(MFA_REQUIRED ? "setup" : null);
  });

  it("ignores unverified enrolments when deciding the challenge", () => {
    const state = mfaState({
      factors: [factor({ status: "unverified" })],
      currentLevel: "aal1",
      nextLevel: "aal1",
    });
    expect(state.pending).toHaveLength(1);
    expect(state.isEnrolled).toBe(false);
    expect(state.needsChallenge).toBe(false);
  });

  it("never claims a guest session is ready to write", () => {
    const state = mfaState({ factors: [], currentLevel: null, nextLevel: null });
    expect(state.needsChallenge).toBe(false);
    expect(state.writesAllowed).toBe(!MFA_REQUIRED);
  });
});
