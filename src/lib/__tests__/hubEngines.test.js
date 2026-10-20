import { beforeEach, describe, expect, it } from "vitest";
import { availabilityInfo, hasVerifiedGithub, topLanguages } from "../githubMetrics";
import { baseUpvotes, clearUpvotes, isUpvoted, toggleUpvote, upvoteCount } from "../upvotes";

describe("githubMetrics", () => {
  it("prefers synced GitHub metrics and normalises them to 100", () => {
    const profile = {
      id: "dev-1",
      github: "https://github.com/ada",
      github_metrics: [
        { language: "JavaScript", percent: 60 },
        { language: "Go", percent: 40 },
      ],
    };
    expect(topLanguages(profile)).toEqual([
      { language: "JavaScript", percent: 60 },
      { language: "Go", percent: 40 },
    ]);
    expect(hasVerifiedGithub(profile)).toBe(true);
  });

  it("infers stable language metrics from declared skills", () => {
    const profile = { id: "dev-2", skills: ["Go", "Node.js", "Docker"] };
    const first = topLanguages(profile);
    const second = topLanguages(profile);
    expect(first).toEqual(second); // deterministic per profile
    expect(first.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
    expect(first[0].language).toBe("Go");
    expect(hasVerifiedGithub(profile)).toBe(false);
  });

  it("describes availability for the tooltip", () => {
    expect(availabilityInfo({ open_to_work: true, available_from: "2026-11-01" }).detail).toContain(
      "Available for contract starting"
    );
    expect(availabilityInfo({ open_to_work: false }).tone).toBe("busy");
    expect(
      availabilityInfo({ open_to_work: true, availability_note: "Available for contract starting Nov 1" })
        .detail
    ).toContain("Nov 1");
  });
});

describe("upvote economy", () => {
  beforeEach(() => {
    clearUpvotes();
    localStorage.clear();
  });

  it("uses explicit counts and toggles the local overlay", () => {
    const project = { id: "proj-1", upvotes: 342 };
    expect(baseUpvotes(project)).toBe(342);
    expect(upvoteCount(project, {})).toBe(342);

    expect(toggleUpvote("proj-1")).toBe(true);
    expect(isUpvoted("proj-1")).toBe(true);
    expect(upvoteCount(project, { "proj-1": true })).toBe(343);

    expect(toggleUpvote("proj-1")).toBe(false);
    expect(upvoteCount(project, {})).toBe(342);
  });

  it("derives a stable base score when a project has no upvotes column", () => {
    const project = { id: "proj-legacy", title: "Legacy" };
    expect(baseUpvotes(project)).toBe(baseUpvotes(project));
    expect(baseUpvotes(project)).toBeGreaterThan(0);
  });
});
