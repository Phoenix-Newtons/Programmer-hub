import { describe, expect, it } from "vitest";

await import("../../../link-preview/script.js");
const { normaliseUrl, buildScreenshotUrl, buildMetaUrl } = globalThis.LinkPreview;

describe("link-preview (frontend-only Microlink) helpers", () => {
  it("normalises bare domains and rejects non-web input", () => {
    expect(normaliseUrl("example.com")).toBe("https://example.com/");
    expect(normaliseUrl("  www.example.com/docs ")).toBe("https://www.example.com/docs");
    expect(normaliseUrl("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
    expect(normaliseUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseUrl("ftp://example.com")).toBeNull();
    expect(normaliseUrl("not a url at all")).toBeNull();
    expect(normaliseUrl("")).toBeNull();
  });

  it("builds the Microlink embedded-screenshot URL with a fully encoded target", () => {
    const target = "https://example.com/search?q=a b&lang=en";
    expect(buildScreenshotUrl(target)).toBe(
      `https://api.microlink.io/?url=${encodeURIComponent(target)}&screenshot=true&embed=screenshot.url`
    );
    expect(buildScreenshotUrl(target, { apiKey: "key 123" })).toContain("&apiKey=key%20123");
  });

  it("builds the metadata URL", () => {
    expect(buildMetaUrl("https://example.com")).toBe(
      "https://api.microlink.io/?url=https%3A%2F%2Fexample.com"
    );
  });
});
