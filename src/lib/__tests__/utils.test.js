import { describe, expect, it } from "vitest";
import {
  clamp,
  cn,
  completionOf,
  csvCell,
  formatDate,
  hostFromUrl,
  initials,
  isMissingTableError,
  isNetworkError,
  isValidUrl,
  normalizeList,
  normalizeUrl,
  parseRate,
  pluralize,
  safeText,
  sortBy,
  stars,
  timeAgo,
  toCsv,
  toTagsInput,
  truncate,
  waLink,
  friendlyError,
} from "../utils";

describe("small helpers", () => {
  it("cn joins only truthy classes", () => {
    expect(cn("a", false, null, ["b", undefined, "c"])).toBe("a b c");
  });

  it("initials takes the first two words", () => {
    expect(initials("Ada Lovelace Nakato")).toBe("AL");
    expect(initials("")).toBe("PH");
  });

  it("safeText falls back for empty values", () => {
    expect(safeText(null, "—")).toBe("—");
    expect(safeText(0)).toBe("0");
  });

  it("pluralize handles singular and plural", () => {
    expect(pluralize(1, "role")).toBe("1 role");
    expect(pluralize(0, "role")).toBe("0 roles");
    expect(pluralize(4, "match", "matches")).toBe("4 matches");
  });

  it("clamp keeps values in range", () => {
    expect(clamp(12, 0, 5)).toBe(5);
    expect(clamp("3", 0, 5)).toBe(3);
  });

  it("truncate adds an ellipsis only when needed", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});

describe("list + url helpers", () => {
  it("normalizeList understands arrays, csv and JSON", () => {
    expect(normalizeList(["React", " Go "])).toEqual(["React", "Go"]);
    expect(normalizeList("React, Node.js")).toEqual(["React", "Node.js"]);
    expect(normalizeList('["a","b"]')).toEqual(["a", "b"]);
    expect(normalizeList(null)).toEqual([]);
  });

  it("toTagsInput round-trips", () => {
    expect(toTagsInput(["React", "Supabase"])).toBe("React, Supabase");
  });

  it("waLink strips punctuation", () => {
    expect(waLink("+256 (700) 000-000")).toBe("https://wa.me/256700000000");
    expect(waLink("")).toBe("");
  });

  it("url helpers normalise and extract hosts", () => {
    expect(normalizeUrl("github.com/you")).toBe("https://github.com/you");
    expect(hostFromUrl("https://www.github.com/you")).toBe("github.com");
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("example.com")).toBe(true);
    expect(isValidUrl("")).toBe(true);
  });

  it("parseRate finds the first number", () => {
    expect(parseRate("$2,500 – $4,000 / month")).toBe(2500);
    expect(parseRate("")).toBe(Number.POSITIVE_INFINITY);
  });

  it("stars clamps to five", () => {
    expect(stars(4.6)).toEqual({ full: 5, empty: 0, value: 4.6 });
    expect(stars(undefined).full).toBe(0);
  });
});

describe("dates", () => {
  it("timeAgo describes the past", () => {
    expect(timeAgo(new Date(Date.now() - 2 * 86400000))).toBe("2 days ago");
    expect(timeAgo(new Date(Date.now() - 1000))).toBe("just now");
    expect(timeAgo(null)).toBe("");
  });

  it("formatDate renders a readable date", () => {
    expect(formatDate("2025-01-15T10:00:00Z")).toMatch(/Jan 2025/);
    expect(formatDate("nonsense")).toBe("");
  });
});

describe("sorting + completion", () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it("sortBy does not mutate the input", () => {
    const sorted = sortBy(rows, (row) => row.n);
    expect(sorted.map((row) => row.n)).toEqual([1, 2, 3]);
    expect(rows[0].n).toBe(3);
  });

  it("sortBy pushes nullish values to the end", () => {
    const sorted = sortBy([{ n: null }, { n: 5 }], (row) => row.n);
    expect(sorted[1].n).toBeNull();
  });

  it("completionOf counts filled keys", () => {
    expect(completionOf({ a: "x", b: "", c: "z" }, ["a", "b", "c"])).toBe(67);
  });
});

describe("errors", () => {
  it("friendlyError translates supabase messages", () => {
    expect(friendlyError(new Error("Failed to fetch"))).toMatch(/Can't reach Supabase/);
    expect(friendlyError({ message: "Invalid login credentials" })).toMatch(/Wrong email or password/);
    expect(friendlyError({ message: 'relation "profiles" does not exist' })).toMatch(/schema\.sql/);
    expect(friendlyError(null)).toMatch(/Something went wrong/);
  });

  it("isNetworkError and isMissingTableError classify errors", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("permission denied"))).toBe(false);
    expect(isMissingTableError({ code: "42P01", message: "does not exist" })).toBe(true);
    expect(isMissingTableError({ code: "23505", message: "duplicate" })).toBe(false);
  });
});

describe("csv export", () => {
  it("csvCell quotes when needed", () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvCell("plain")).toBe("plain");
  });

  it("toCsv builds a header and rows with custom values", () => {
    const csv = toCsv(
      [{ name: "Ada", skills: ["React", "Go"] }],
      [
        { key: "name", label: "Name" },
        { key: "skills", label: "Skills", value: (row) => row.skills.join("; ") },
      ]
    );
    expect(csv).toBe("Name,Skills\nAda,React; Go");
  });
});
