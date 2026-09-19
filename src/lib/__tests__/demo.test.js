import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDemoMode, setDemoMode, toggleDemoMode, DEMO_DEFAULT } from "../demo";
import { fetchJobs, fetchProfiles, fetchProjects, createJob } from "../api";
import { DEMO_JOBS, DEMO_PROFILES, DEMO_PROJECTS } from "../demoData";

/**
 * Sample-data mode is a documented feature: it must switch the whole data layer
 * between Supabase and the fictional rows, and refuse to write while active.
 */
describe("sample-data mode", () => {
  beforeEach(() => {
    localStorage.clear();
    setDemoMode(false);
  });

  afterEach(() => {
    setDemoMode(false);
  });

  it("starts disabled unless VITE_DEMO_DATA is set", () => {
    expect(DEMO_DEFAULT).toBe(false);
    expect(isDemoMode()).toBe(false);
  });

  it("persists the visitor's choice", () => {
    setDemoMode(true);
    expect(isDemoMode()).toBe(true);
    expect(JSON.parse(localStorage.getItem("ph:demo-data"))).toEqual({ enabled: true });

    toggleDemoMode();
    expect(isDemoMode()).toBe(false);
    expect(JSON.parse(localStorage.getItem("ph:demo-data"))).toEqual({ enabled: false });
  });

  it("serves the fictional rows when it is on", async () => {
    setDemoMode(true);

    const profiles = await fetchProfiles();
    const projects = await fetchProjects();
    const jobs = await fetchJobs();

    expect(profiles.error).toBe(null);
    expect(profiles.data).toHaveLength(DEMO_PROFILES.length);
    expect(projects.data).toHaveLength(DEMO_PROJECTS.length);
    expect(jobs.data).toHaveLength(DEMO_JOBS.length);
  });

  it("filters sample profiles by id, including the empty shortlist", async () => {
    setDemoMode(true);

    const none = await fetchProfiles({ ids: [] });
    expect(none.data).toEqual([]);

    const [first] = DEMO_PROFILES;
    const one = await fetchProfiles({ ids: [first.id, "missing-id"] });
    expect(one.data.map((profile) => profile.id)).toEqual([first.id]);
  });

  it("refuses writes and explains why", async () => {
    setDemoMode(true);
    const { data, error } = await createJob({ title: "React engineer" });

    expect(data).toBe(null);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/sample data/i);
  });
});
