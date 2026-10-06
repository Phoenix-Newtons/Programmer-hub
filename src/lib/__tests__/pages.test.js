import { describe, expect, it } from "vitest";
import {
  canPrefetch,
  lazyPage,
  loadPage,
  PAGE_NAMES,
  prefetchLinkProps,
  prefetchPage,
  prefetchPath,
} from "../pages";

describe("page registry", () => {
  it("registers every route in the app", () => {
    expect(PAGE_NAMES).toEqual([
      "Home",
      "Developers",
      "DeveloperProfile",
      "Projects",
      "Hiring",
      "Shortlist",
      "About",
      "Login",
      "Dashboard",
      "NotFound",
    ]);
  });

  it("resolves every registered loader to a component", async () => {
    const modules = await Promise.all(PAGE_NAMES.map((name) => loadPage(name)));
    modules.forEach((module, index) => {
      expect(module.default, `${PAGE_NAMES[index]} has no default export`).toBeTruthy();
      expect(["function", "object"]).toContain(typeof module.default);
    });
  });

  it("creates lazy components and rejects unknown names", () => {
    expect(lazyPage("Home")).toBeTruthy();
    expect(() => lazyPage("Settings")).toThrow(/Unknown page/);
  });

  it("prefetches a route once and ignores unknown paths", async () => {
    prefetchPage("Home");
    prefetchPage("Home"); // second call is a no-op, not an error
    prefetchPath("/developers");
    prefetchPath("https://example.com/external");
    prefetchPath(undefined);
    expect(typeof canPrefetch()).toBe("boolean");
    expect(typeof prefetchLinkProps("/hiring").onMouseEnter).toBe("function");
  });
});
