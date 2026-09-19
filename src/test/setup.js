/**
 * Vitest setup: jsdom lacks a few browser APIs the app uses, so we stub the
 * ones that matter (media queries, observation, clipboard).
 */
import { afterEach, vi } from "vitest";

// Tell React 19 that this environment supports `act()` (jsdom + Vitest).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

if (!window.scrollTo) window.scrollTo = () => {};

if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

// Each test starts from a clean browser store.
afterEach(() => {
  localStorage.clear();
});
