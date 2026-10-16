import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Two-factor gate: with a verified authenticator on the account and an `aal1`
 * session the gate must block the app until the code verifies; with nothing
 * enrolled it must push the member through setup.
 *
 * `@supabase/supabase-js` is mocked at the module boundary so the whole auth
 * context (session → factors → assurance level) runs for real.
 */

const state = {
  level: "aal1",
  factors: [],
};

const verifiedFactor = {
  id: "factor-1",
  factor_type: "totp",
  friendly_name: "Authenticator app",
  status: "verified",
};

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "user-1", email: "ada@example.com" } } },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
      refreshSession: vi.fn(async () => ({ data: {}, error: null })),
      mfa: {
        listFactors: vi.fn(async () => ({
          data: {
            all: state.factors,
            totp: state.factors.filter((factor) => factor.factor_type === "totp"),
            phone: [],
          },
          error: null,
        })),
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({
          data: { currentLevel: state.level, nextLevel: state.factors.length ? "aal2" : "aal1" },
          error: null,
        })),
        enroll: vi.fn(async () => ({
          data: {
            id: "factor-new",
            factor_type: "totp",
            status: "unverified",
            totp: {
              qr_code: "data:image/svg+xml;utf8,<svg/>",
              secret: "ABCDEFGHIJKLMNOP",
              uri: "otpauth://totp/x",
            },
          },
          error: null,
        })),
        challengeAndVerify: vi.fn(async () => {
          state.level = "aal2";
          return { data: { access_token: "token" }, error: null };
        }),
        unenroll: vi.fn(async () => ({ data: {}, error: null })),
      },
      from: undefined,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
  SUPABASE_CONFIGURED: true,
}));

const { renderWithProviders } = await import("../../test/render.jsx");
const MfaGate = (await import("../auth/MfaGate.jsx")).default;
const { supabase } = await import("../../lib/supabase");

async function settle(ms = 60) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("MfaGate", () => {
  beforeEach(() => {
    state.level = "aal1";
    state.factors = [];
    window.sessionStorage.clear();
  });

  // The gate renders through a portal, so clean up anything a failing
  // assertion left in the document body.
  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((node) => node.remove());
  });

  it("blocks an aal1 session that already has an authenticator", async () => {
    state.factors = [verifiedFactor];
    const view = await renderWithProviders(<MfaGate />);
    await settle();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("Two-factor verification");
    expect(dialog.textContent).toContain("finish signing in");
    await view.unmount();
  });

  it("verifies the code and gets out of the way", async () => {
    state.factors = [verifiedFactor];
    const view = await renderWithProviders(<MfaGate />);
    await settle();

    const input = document.querySelector('input[autocomplete="one-time-code"]');
    await view.type(input, "123456");
    await settle(10);

    const submit = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent.includes("Verify")
    );
    await view.click(submit);
    await settle(60);

    expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: "factor-1",
      code: "123456",
    });
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    await view.unmount();
  });

  it("walks a member without a factor through enrolment", async () => {
    const view = await renderWithProviders(<MfaGate />);
    await settle();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("Set up an authenticator app");
    expect(dialog.textContent).toContain("ABCD EFGH IJKL MNOP");
    expect(supabase.auth.mfa.enroll).toHaveBeenCalled();

    await view.unmount();
  });

  it("does nothing for guests", async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const view = await renderWithProviders(<MfaGate />);
    await settle();

    expect(document.querySelector('[role="dialog"]')).toBe(null);
    await view.unmount();
  });
});
