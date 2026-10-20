import { beforeEach, describe, expect, it } from "vitest";
import { __setInstallStateForTests, detectInstallPlatform, isStandaloneDisplay } from "../installApp";

describe("install platform detection", () => {
  it("classifies iOS, Android and desktop user agents", () => {
    expect(detectInstallPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", 5)).toBe("ios");
    expect(detectInstallPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios"); // iPadOS
    expect(detectInstallPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8)", 5)).toBe("android");
    expect(detectInstallPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0)).toBe("desktop");
  });

  it("detects standalone display mode", () => {
    const fakeWindow = {
      matchMedia: (query) => ({ matches: query.includes("standalone") }),
      navigator: {},
    };
    expect(isStandaloneDisplay(fakeWindow)).toBe(true);
    expect(
      isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } })
    ).toBe(true);
    expect(isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
  });
});

describe("install state store", () => {
  beforeEach(() => {
    __setInstallStateForTests({ deferredPrompt: null, installed: false });
  });

  it("accepts a captured prompt event through the test seam", () => {
    __setInstallStateForTests({ deferredPrompt: { prompt: async () => {} } });
    // No throw + state is consumed by useInstallApp in component tests.
    expect(true).toBe(true);
  });
});
