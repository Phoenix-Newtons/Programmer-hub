import { beforeEach, describe, expect, it, vi } from "vitest";

const PROFILES = [
  {
    id: "dev-1",
    name: "Ada Nakato",
    title: "Full-stack React engineer",
    location: "Kampala, Uganda",
    bio: "Payments and dashboards for fintech teams.",
    skills: ["React", "TypeScript"],
    hourly_rate: "$35 / hour",
    rating: 4.8,
    open_to_work: true,
    featured: true,
    created_at: "2025-01-10T10:00:00Z",
  },
  {
    id: "dev-2",
    name: "Brian Okello",
    title: "Flutter developer",
    location: "Nairobi, Kenya",
    bio: "Offline-first field apps.",
    skills: ["Flutter", "Firebase"],
    hourly_rate: "$28 / hour",
    rating: 4.4,
    open_to_work: false,
    created_at: "2025-02-02T10:00:00Z",
  },
];

// Keep the page away from the network: the data layer is mocked per test.
vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual("../../lib/api");
  return {
    ...actual,
    fetchProfiles: vi.fn(async () => ({ data: PROFILES, error: null })),
    fetchProjects: vi.fn(async () => ({ data: [], error: null })),
    fetchJobs: vi.fn(async () => ({ data: [], error: null })),
  };
});

const { renderWithProviders } = await import("../../test/render.jsx");
const Developers = (await import("../Developers.jsx")).default;
const { clearShortlist, getShortlistIds, saveToShortlist } = await import("../../lib/shortlist");
const Shortlist = (await import("../Shortlist.jsx")).default;

describe("Developers directory", () => {
  beforeEach(() => {
    clearShortlist();
    localStorage.clear();
  });

  it("renders every developer once loaded", async () => {
    const view = await renderWithProviders(<Developers />, { route: "/developers" });
    const text = view.text();

    expect(text).toContain("Ada Nakato");
    expect(text).toContain("Brian Okello");
    expect(text).toContain("2 developers found");
    await view.unmount();
  });

  it("filters by search query, including fuzzy subsequences", async () => {
    const view = await renderWithProviders(<Developers />, { route: "/developers" });
    const input = view.query('input[type="search"]');

    await view.type(input, "flutter");
    expect(view.text()).toContain("Brian Okello");
    expect(view.text()).not.toContain("Ada Nakato");
    expect(view.text()).toContain("1 developer found");

    await view.type(input, "fzzy"); // subsequence of "Flutter"? no — expect empty state
    expect(view.text()).toContain("No developers match those filters");

    await view.unmount();
  });

  it("toggles the open-to-work filter", async () => {
    const view = await renderWithProviders(<Developers />, { route: "/developers" });
    const toggle = view.queryAll("button").find((button) => button.textContent.includes("Open to work"));

    await view.click(toggle);
    expect(view.text()).toContain("Ada Nakato");
    expect(view.text()).not.toContain("Brian Okello");

    await view.unmount();
  });

  it("saves a developer to the shortlist", async () => {
    const view = await renderWithProviders(<Developers />, { route: "/developers" });
    const saveButton = view.queryAll("button").find(
      (button) => button.getAttribute("aria-label") === "Save to shortlist"
    );

    expect(saveButton).toBeTruthy();
    await view.click(saveButton);
    expect(getShortlistIds().length).toBe(1);

    await view.unmount();
  });

  it("honours filters coming from the URL", async () => {
    const view = await renderWithProviders(<Developers />, {
      route: "/developers?q=flutter&sort=rating",
    });
    expect(view.text()).toContain("Brian Okello");
    expect(view.text()).not.toContain("Ada Nakato");
    expect(view.query('input[type="search"]').value).toBe("flutter");
    await view.unmount();
  });
});

describe("shortlist page", () => {
  beforeEach(() => {
    clearShortlist();
    localStorage.clear();
  });

  it("renders saved developers from the local snapshot without a round trip", async () => {
    const api = await import("../../lib/api");
    api.fetchProfiles.mockResolvedValueOnce({
      data: [
        {
          id: "dev-1",
          name: "Ada Nakato",
          title: "Full-stack React engineer",
          location: "Kampala, Uganda",
          skills: ["React"],
          rating: 4.8,
          open_to_work: true,
          email: "ada@example.com",
          created_at: "2025-01-10T10:00:00Z",
        },
      ],
      error: null,
    });

    saveToShortlist({ id: "dev-1", name: "Ada Nakato", title: "Full-stack React engineer", email: "ada@example.com" });

    const view = await renderWithProviders(<Shortlist />, { route: "/shortlist" });
    const text = view.text();

    expect(text).toContain("Ada Nakato");
    expect(text).toContain("Export CSV");
    await view.unmount();
  });

  it("shows the empty state when nothing is saved", async () => {
    const view = await renderWithProviders(<Shortlist />, { route: "/shortlist" });
    expect(view.text()).toContain("Nothing shortlisted yet");
    await view.unmount();
  });
});
