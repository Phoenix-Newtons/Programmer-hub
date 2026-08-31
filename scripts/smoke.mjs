/**
 * Headless quality gate: renders every route and every page component in jsdom
 * through Vite's SSR pipeline, then asserts key content is present.
 *
 * Catches render-time crashes (bad imports, invalid hooks, undefined access)
 * without needing a real browser.
 *
 *   node scripts/smoke.mjs
 */
import { JSDOM } from "jsdom";
import { createServer } from "vite";

/** Route wiring + the page module behind it. */
const PAGES = [
  {
    route: "/",
    pattern: "/",
    module: "/src/pages/Home.jsx",
    expects: ["next opportunity", "How it works", "Developers on the hub"],
  },
  { route: "/developers", pattern: "/developers", module: "/src/pages/Developers.jsx", expects: ["Find a developer"] },
  {
    route: "/developers/demo-id",
    pattern: "/developers/:id",
    module: "/src/pages/DeveloperProfile.jsx",
    // Fetches on mount — SSR sees the loader first.
    expects: ["Loading developer profile"],
    loadingOnly: true,
  },
  { route: "/projects", pattern: "/projects", module: "/src/pages/Projects.jsx", expects: ["Built by Luwangula Alpha"] },
  { route: "/hiring", pattern: "/hiring", module: "/src/pages/Hiring.jsx", expects: ["Hire builders"] },
  {
    route: "/about",
    pattern: "/about",
    module: "/src/pages/About.jsx",
    expects: ["Luwangula Alpha", "alphaluwangula@proton.me"],
  },
  { route: "/login", pattern: "/login", module: "/src/pages/Login.jsx", expects: ["Sign in with Google"] },
  {
    route: "/dashboard",
    pattern: "/dashboard",
    module: "/src/pages/Dashboard.jsx",
    expects: ["Checking your session"],
    loadingOnly: true,
  },
  { route: "/nope", pattern: "*", module: "/src/pages/NotFound.jsx", expects: ["404"] },
];

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: "http://localhost:5173/",
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
Object.defineProperty(globalThis, "location", { value: window.location, configurable: true });
globalThis.history = window.history;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
window.matchMedia = globalThis.matchMedia;
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.IntersectionObserver = globalThis.IntersectionObserver;

const consoleErrors = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(" ");
  if (!/Warning: |not wrapped in act|useLayoutEffect does nothing/.test(text)) consoleErrors.push(text);
  originalError(...args);
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.log(`  ✗ ${message}`);
};

try {
  const React = (await import("react")).default;
  const { renderToString } = await import("react-dom/server");
  const { StaticRouter, MemoryRouter, Routes, Route } = await import("react-router");
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { ToastProvider } = await vite.ssrLoadModule("/src/context/ToastContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const App = (await vite.ssrLoadModule("/src/App.jsx")).default;

  /** Providers + a router. memory=true uses MemoryRouter (needed for :params). */
  const wrap = (element, route, memory = false) =>
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        memory ? MemoryRouter : StaticRouter,
        memory ? { initialEntries: [route] } : { location: route },
        React.createElement(ToastProvider, null, React.createElement(AuthProvider, null, element))
      )
    );

  console.log("\nRouting (App shell):");
  for (const page of PAGES) {
    try {
      renderToString(wrap(React.createElement(App), page.route));
      console.log(`  ✓ ${page.route}`);
    } catch (error) {
      fail(`${page.route} → ${error.message}`);
    }
  }

  console.log("\nPage components:");
  for (const page of PAGES) {
    try {
      const Page = (await vite.ssrLoadModule(page.module)).default;
      const element = React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: page.pattern, element: React.createElement(Page) })
      );
      const html = renderToString(wrap(element, page.route, true));
      const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();

      let ok = true;
      for (const needle of page.expects || []) {
        if (!text.includes(needle)) {
          fail(`${page.route} missing expected content: "${needle}"`);
          ok = false;
        }
      }
      if (text.length < 200 && !page.loadingOnly) {
        fail(`${page.route} rendered only ${text.length} chars — page looks empty`);
        ok = false;
      }
      if (ok) console.log(`  ✓ ${page.route.padEnd(22)} ${text.length} chars`);
      if (process.env.SMOKE_DUMP === page.route) console.log(`\n${text.slice(0, 2500)}\n`);
    } catch (error) {
      fail(`${page.route} → ${error.message}`);
      console.log(error.stack?.split("\n").slice(1, 4).join("\n"));
    }
  }
} finally {
  await vite.close();
}

console.log("");
if (consoleErrors.length) {
  console.log(`⚠ ${consoleErrors.length} console error(s):`);
  consoleErrors.slice(0, 10).forEach((error) => console.log("   •", error.slice(0, 300)));
}
console.log(failures || consoleErrors.length ? `✗ ${failures} failure(s)` : "✓ all routes rendered cleanly");
process.exit(failures || consoleErrors.length ? 1 : 0);
