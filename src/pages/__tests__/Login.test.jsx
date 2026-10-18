import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resend: vi.fn(async () => ({ data: {}, error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      mfa: {
        listFactors: vi.fn(async () => ({ data: { all: [] }, error: null })),
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({
          data: { currentLevel: "aal1", nextLevel: "aal1" },
          error: null,
        })),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: "user-new", name: "Ada", email: "ada@example.com", open_to_work: true },
            error: null,
          }),
        }),
      }),
    }),
  },
  clearLocalAuthStorage: vi.fn(),
  SUPABASE_CONFIGURED: true,
}));

const { renderWithProviders } = await import("../../test/render.jsx");
const Login = (await import("../Login.jsx")).default;
const { supabase } = await import("../../lib/supabase");

async function submitForm(container) {
  const form = container.querySelector("form");
  await act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe("Login & Account creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("creates an account with a 6-character password and default name when fullName is omitted", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "user-new", email: "ada@example.com", identities: [{ id: "id-1" }] },
        session: { user: { id: "user-new", email: "ada@example.com" } },
      },
      error: null,
    });

    const view = await renderWithProviders(<Login />, { route: "/login?mode=signup" });
    const emailInput = view.query('input[type="email"]');
    const passwordInput = view.query('input[type="password"]');

    await view.type(emailInput, "  Ada@Example.com ");
    await view.type(passwordInput, "secret");
    await submitForm(view.container);

    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        password: "secret",
        options: expect.objectContaining({
          data: expect.objectContaining({ full_name: "ada", name: "ada" }),
        }),
      })
    );
    await view.unmount();
  });

  it("falls back to a local session seamlessly when Supabase rejects the API key or requires email confirmation", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error("Invalid API key"),
    });

    const view = await renderWithProviders(<Login />, { route: "/login?mode=signup" });
    const emailInput = view.query('input[type="email"]');
    const passwordInput = view.query('input[type="password"]');

    await view.type(emailInput, "ada@example.com");
    await view.type(passwordInput, "secret12");
    await submitForm(view.container);

    const storedSession = JSON.parse(window.localStorage.getItem("ph:local:session") || "null");
    expect(storedSession?.user?.email).toBe("ada@example.com");
    await view.unmount();
  });

  it("switches to sign-in with a clear message when an email is already registered", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: "user-existing", email: "ada@example.com", identities: [] },
        session: null,
      },
      error: null,
    });
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("Invalid login credentials"),
    });

    const view = await renderWithProviders(<Login />, { route: "/login?mode=signup" });
    await view.type(view.query('input[type="email"]'), "ada@example.com");
    await view.type(view.query('input[type="password"]'), "wrongpass");
    await submitForm(view.container);

    expect(view.text()).toContain("An account with this email already exists");
    await view.unmount();
  });
});
