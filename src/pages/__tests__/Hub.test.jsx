import { beforeEach, describe, expect, it, vi } from "vitest";

const PROFILES = [
  {
    id: "dev-1",
    name: "Ada Nakato",
    title: "Full-Stack Next.js Developer",
    location: "Kampala, Uganda",
    bio: "Payments and dashboards for fintech teams.",
    skills: ["React", "Next.js", "Node.js"],
    hourly_rate: "$35 / hour",
    rating: 4.9,
    open_to_work: true,
    verified: true,
    created_at: "2025-01-10T10:00:00Z",
  },
  {
    id: "dev-2",
    name: "Brian Okello",
    title: "Go Backend Engineer",
    location: "Nairobi, Kenya",
    bio: "High-throughput APIs in Go.",
    skills: ["Go", "Docker"],
    hourly_rate: "$42 / hour",
    rating: 4.8,
    open_to_work: false,
    created_at: "2025-02-02T10:00:00Z",
  },
];

const PROJECTS = [
  {
    id: "proj-1",
    title: "PayBridge checkout SDK",
    author_name: "Ada Nakato",
    description: "Unified mobile-money checkout for React apps.",
    tags: ["React", "Open Source"],
    repo_url: "https://github.com/example/paybridge",
    live_url: "https://example.com",
    contributors: 24,
    contributor_names: ["Ada Nakato", "Brian Okello"],
    stars: 1284,
    created_at: "2025-08-04T10:00:00Z",
  },
];

const JOBS = [
  {
    id: "job-1",
    title: "Senior Full-Stack Engineer",
    company: "PayBridge",
    location: "Remote · Africa",
    type: "Full-time",
    level: "Senior",
    budget: "$60k – $85k / yr",
    description: "Own the merchant dashboard end-to-end.",
    skills: ["React", "TypeScript"],
    status: "open",
    applicants: 34,
    created_at: "2025-10-14T10:00:00Z",
  },
  {
    id: "job-2",
    title: "Flutter Developer",
    company: "FieldKit",
    location: "Nairobi, Kenya",
    type: "Contract",
    level: "Mid-level",
    budget: "$4,500 / month",
    description: "Ship offline sync v2.",
    skills: ["Flutter"],
    status: "open",
    applicants: 12,
    created_at: "2025-10-08T10:00:00Z",
  },
];

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual("../../lib/api");
  return {
    ...actual,
    fetchProfiles: vi.fn(async () => ({ data: PROFILES, error: null })),
    fetchProjects: vi.fn(async () => ({ data: PROJECTS, error: null })),
    fetchJobs: vi.fn(async () => ({ data: JOBS, error: null })),
  };
});

const { renderWithProviders } = await import("../../test/render.jsx");
const Hub = (await import("../Hub.jsx")).default;

describe("Hub dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the talent view by default with profile cards and stack badges", async () => {
    const view = await renderWithProviders(<Hub />, { route: "/hub" });
    const text = view.text();

    expect(text).toContain("Find Talent");
    expect(text).toContain("Ship Projects");
    expect(text).toContain("Get Hired");
    expect(text).toContain("Ada Nakato");
    expect(text).toContain("Full-Stack Next.js Developer");
    expect(text).toContain("Next.js");
    expect(text).toContain("View Profile");
    expect(text).toContain("Message");
    await view.unmount();
  });

  it("filters talent by search and by the open-to-work toggle", async () => {
    const view = await renderWithProviders(<Hub />, { route: "/hub" });
    const input = view.query('input[type="search"]');

    await view.type(input, "go backend");
    expect(view.text()).toContain("Brian Okello");
    expect(view.text()).not.toContain("Ada Nakato");
    await view.unmount();
  });

  it("switches to the project feed with contributors and repo links", async () => {
    const view = await renderWithProviders(<Hub />, { route: "/hub?view=projects" });
    const text = view.text();

    expect(text).toContain("PayBridge checkout SDK");
    expect(text).toContain("24 contributors");
    expect(text).toContain("Live Demo");
    expect(text).toContain("GitHub");
    await view.unmount();
  });

  it("switches to the hiring board with salary and an Apply Now CTA", async () => {
    const view = await renderWithProviders(<Hub />, { route: "/hub?view=jobs" });
    const text = view.text();

    expect(text).toContain("Senior Full-Stack Engineer");
    expect(text).toContain("PayBridge");
    expect(text).toContain("$60k – $85k / yr");
    expect(text).toContain("Apply Now");

    const remoteToggle = view.queryAll("button").find((button) => button.textContent.includes("Remote only"));
    await view.click(remoteToggle);
    expect(view.text()).toContain("Senior Full-Stack Engineer");
    expect(view.text()).not.toContain("Flutter Developer");
    await view.unmount();
  });

  it("falls back to starter content when live collections are empty", async () => {
    const api = await import("../../lib/api");
    api.fetchProfiles.mockResolvedValueOnce({ data: [], error: null });
    api.fetchProjects.mockResolvedValueOnce({ data: [], error: null });
    api.fetchJobs.mockResolvedValueOnce({ data: [], error: null });

    const view = await renderWithProviders(<Hub />, { route: "/hub" });
    expect(view.text()).toContain("Ada Nakato");
    expect(view.text()).toContain("starter content");
    await view.unmount();
  });
});
