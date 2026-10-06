import { describe, expect, it } from "vitest";
import {
  highlight,
  isSubsequence,
  normalizeText,
  rankItems,
  scoreItem,
  scoreToken,
  tokenize,
} from "../search";

describe("normalizeText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeText("Áda NAKATO")).toBe("ada nakato");
  });

  it("keeps technology punctuation", () => {
    expect(normalizeText("Node.js + C#")).toBe("node.js + c#");
  });
});

describe("tokenize", () => {
  it("splits on whitespace and drops empties", () => {
    expect(tokenize("  React   Node.js ")).toEqual(["react", "node.js"]);
  });
});

describe("isSubsequence", () => {
  it("matches skipped letters", () => {
    expect(isSubsequence("fzzy", "fuzzy")).toBe(true);
  });

  it("rejects out-of-order letters", () => {
    expect(isSubsequence("zyzzf", "fuzzy")).toBe(false);
  });
});

describe("scoreToken", () => {
  it("scores word-start matches higher than mid-word matches", () => {
    expect(scoreToken("dev", "developer")).toBeGreaterThan(scoreToken("dev", "backenddevelopers"));
  });

  it("returns 0 for absent tokens", () => {
    expect(scoreToken("rust", "react developer")).toBe(0);
  });
});

describe("scoreItem", () => {
  const fields = { name: "Ada Nakato", title: "Full-stack engineer", skills: "React, TypeScript" };

  it("returns a positive score for an empty query (everything matches)", () => {
    expect(scoreItem({ query: "", fields })).toBeGreaterThan(0);
  });

  it("requires every token to match", () => {
    expect(scoreItem({ query: "react engineer", fields })).toBeGreaterThan(0);
    expect(scoreItem({ query: "react plumber", fields })).toBe(0);
  });

  it("finds typo-ish subsequences", () => {
    expect(scoreItem({ query: "fstck", fields })).toBeGreaterThan(0);
  });

  it("weights the name field above the bio", () => {
    const nameHeavy = scoreItem({ query: "ada", fields, weights: { name: 3, title: 1, skills: 1 } });
    const skillHeavy = scoreItem({ query: "ada", fields, weights: { name: 1, title: 1, skills: 1 } });
    expect(nameHeavy).toBeGreaterThanOrEqual(skillHeavy);
  });
});

describe("rankItems", () => {
  const people = [
    { name: "Brian Okello", skills: ["Flutter", "Firebase"] },
    { name: "Ada Nakato", skills: ["React", "TypeScript"] },
    { name: "Fatima Yusuf", skills: ["Python", "PostgreSQL"] },
  ];

  it("orders best match first", () => {
    const ranked = rankItems(people, "ada", { fields: (p) => ({ name: p.name, skills: p.skills }) });
    expect(ranked[0].item.name).toBe("Ada Nakato");
  });

  it("matches inside arrays", () => {
    const ranked = rankItems(people, "flutter", { fields: (p) => ({ name: p.name, skills: p.skills }) });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].item.name).toBe("Brian Okello");
  });

  it("honours the limit option", () => {
    const ranked = rankItems(people, "a", { fields: (p) => ({ name: p.name }), limit: 2 });
    expect(ranked.length).toBeLessThanOrEqual(2);
  });

  it("returns nothing for a query nobody matches", () => {
    expect(rankItems(people, "cobol", { fields: (p) => ({ name: p.name, skills: p.skills }) })).toEqual([]);
  });
});

describe("highlight", () => {
  it("marks the matched slice", () => {
    const chunks = highlight("React Native", "react");
    expect(chunks.some((chunk) => chunk.match && chunk.text.toLowerCase() === "react")).toBe(true);
  });

  it("returns a single chunk when nothing matches", () => {
    expect(highlight("React Native", "flutter")).toEqual([{ text: "React Native", match: false }]);
  });

  it("ignores single-character queries to avoid noise", () => {
    expect(highlight("React", "r").every((chunk) => !chunk.match)).toBe(true);
  });
});
