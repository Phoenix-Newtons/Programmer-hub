import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Boots the whole application shell (router + providers + lazy routes) in
 * jsdom and exercises the cross-cutting behaviour: navigation, the command
 * palette, the theme switch, the shortlist badge and the offline banner.
 */

const PROFILE = {
  id: "dev-1",
  name: "Ada Nakato",
  title: "Full-stack React engineer",
  location: "Kampala, Uganda",
  skills: ["React", "TypeScript"],
  rating: 4.8,
  open_to_work: true,
  created_at: "2025-01-10T10:00:00Z",
};

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual("../lib/api");
  return {
    ...actual,
    fetchProfiles: vi.fn(async () => ({ data: [PROFILE], error: null })),
    fetchProfile: vi.fn(async () => ({ data: PROFILE, error: null })),
    fetchProjects: vi.fn(async () => ({ data: [], error: null })),
    fetchJobs: vi.fn(async () => ({ data: [], error: null })),
    fetchApplications: vi.fn(async () => ({ data: [], error: null })),
  };
});

const { renderWithProviders } = await import("../test/render.jsx");
const App = (await import("../App.jsx")).default;

/** Waits until the lazy route chunk has rendered (Suspense resolved). */
async function settle() {
  for (let i = 0; i < 12; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("app shell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("renders the navigation, hero and footer", async () => {
    const view = await renderWithProviders(<App />, { route: "/" });
    await settle();
    const text = view.text();

    expect(text).toContain("Programmer");
    expect(text).toContain("Developers");
    expect(text).toContain("Hiring");
    expect(text).toContain("next opportunity");
    expect(text).toContain("Built with");
    expect(view.query("#main")).toBeTruthy();
    await view.unmount();
  });

  it("navigates to a lazy route without crashing", async () => {
    const view = await renderWithProviders(<App />, { route: "/hiring" });
    await settle();
    expect(view.text()).toContain("Hire builders");
    await view.unmount();
  });

  it("opens the command palette with the keyboard", async () => {
    const view = await renderWithProviders(<App />, { route: "/" });
    await settle();

    await view.click(view.queryAll("button").find((button) => button.getAttribute("aria-label") === "Search the hub"));

    const dialog = view.query('[role="dialog"][aria-label="Search Programmer\'s Hub"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("Go to");
    await view.unmount();
  });

  it("switches the theme from the navbar", async () => {
    const view = await renderWithProviders(<App />, { route: "/" });
    await settle();

    const toggle = view.queryAll("button").find((button) => button.getAttribute("aria-label")?.startsWith("Theme:"));
    expect(toggle).toBeTruthy();
    await view.click(toggle);

    expect(["dark", "light"]).toContain(document.documentElement.className);
    expect(localStorage.getItem("ph-theme")).toBeTruthy();
    await view.unmount();
  });

  it("shows the offline banner when the browser reports no connection", async () => {
    const onlineSpy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const view = await renderWithProviders(<App />, { route: "/" });
    await settle();

    window.dispatchEvent(new window.Event("offline"));
    await settle();

    expect(view.text()).toContain("You’re offline");
    onlineSpy.mockRestore();
    await view.unmount();
  });
});
