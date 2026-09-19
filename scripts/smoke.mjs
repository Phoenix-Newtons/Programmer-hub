/**
 * Headless quality gate: renders every route and every page component in jsdom
 * through Vite's SSR pipeline, then asserts key content is present.
 *
 * Also runs a structural accessibility audit (one h1 per screen, no skipped
 * heading levels, labelled controls, named buttons, valid ARIA references) and
 * fails on unexpected console errors.
 *
 * Catches render-time crashes (bad imports, invalid hooks, undefined access)
 * without needing a real browser.
 *
 *   node scripts/smoke.mjs
 *   SMOKE_DUMP=/developers node scripts/smoke.mjs   # print rendered text
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
  {
    route: "/developers",
    pattern: "/developers",
    module: "/src/pages/Developers.jsx",
    expects: ["Find a developer", "Best match", "Open to work"],
  },
  {
    route: "/developers/demo-id",
    pattern: "/developers/:id",
    module: "/src/pages/DeveloperProfile.jsx",
    // Fetches on mount — SSR sees the profile skeleton first.
    expects: ["Loading developer profile"],
    loadingOnly: true,
  },
  {
    route: "/projects",
    pattern: "/projects",
    module: "/src/pages/Projects.jsx",
    expects: ["Proof of work", "Featured"],
  },
  {
    route: "/hiring",
    pattern: "/hiring",
    module: "/src/pages/Hiring.jsx",
    expects: ["Hire builders", "Open roles"],
  },
  {
    route: "/shortlist",
    pattern: "/shortlist",
    module: "/src/pages/Shortlist.jsx",
    expects: ["Nothing shortlisted yet"],
  },
  {
    route: "/about",
    pattern: "/about",
    module: "/src/pages/About.jsx",
    expects: ["Luwangula Alpha", "alphaluwangula@proton.me", "What shipped in this upgrade"],
  },
  {
    route: "/login",
    pattern: "/login",
    module: "/src/pages/Login.jsx",
    expects: ["Sign in with Google", "Forgot your password"],
  },
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
globalThis.CustomEvent = window.CustomEvent;
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
window.scrollTo = () => {};
globalThis.scrollTo = window.scrollTo;

// localStorage stub — the app persists theme, shortlist and sample-data state.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
  key: (index) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(window, "localStorage", { value: globalThis.localStorage, configurable: true });
globalThis.Blob = window.Blob;
globalThis.URL.createObjectURL = () => "blob:smoke";

/**
 * Lightweight accessibility audit for a rendered document.
 *
 * Not a replacement for axe, but it catches the structural mistakes that
 * actually happen in this codebase: missing/duplicated h1s, skipped heading
 * levels, unlabelled controls, nameless buttons, dangling ARIA references and
 * unsafe external links.
 */
function auditA11y(html) {
  const doc = new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window.document;
  const issues = [];

  const h1s = doc.querySelectorAll("h1");
  if (h1s.length !== 1) issues.push(`${h1s.length} <h1> element(s) — expected exactly 1`);

  let previousLevel = 0;
  for (const heading of doc.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
    const level = Number(heading.tagName[1]);
    if (previousLevel && level > previousLevel + 1) {
      issues.push(`heading jump h${previousLevel} → h${level} at "${heading.textContent.trim().slice(0, 40)}"`);
    }
    previousLevel = level;
  }

  for (const img of doc.querySelectorAll("img")) {
    if (img.getAttribute("alt") === null) issues.push(`<img> without alt (${(img.getAttribute("src") || "").slice(0, 40)})`);
  }

  const accessibleName = (element) =>
    Boolean(
      element.getAttribute("aria-label")?.trim() ||
        element.getAttribute("title")?.trim() ||
        element.textContent.trim() ||
        (element.getAttribute("aria-labelledby") || "")
          .split(/\s+/)
          .some((id) => id && doc.getElementById(id)?.textContent.trim())
    );

  for (const button of doc.querySelectorAll("button")) {
    if (!accessibleName(button)) issues.push(`button without an accessible name (${button.className || "no class"})`);
  }

  const labelledControls = new Set([...doc.querySelectorAll("label[for]")].map((label) => label.getAttribute("for")));
  for (const control of doc.querySelectorAll("input, select, textarea")) {
    const type = (control.getAttribute("type") || "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "checkbox", "radio"].includes(type)) continue;
    const labelled =
      labelledControls.has(control.id) ||
      control.closest("label") ||
      control.getAttribute("aria-label") ||
      control.getAttribute("aria-labelledby");
    if (!labelled) issues.push(`unlabelled <${control.tagName.toLowerCase()}${control.id ? ` id="${control.id}"` : ""}>`);
  }

  const ids = [...doc.querySelectorAll("[id]")].map((element) => element.id);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) issues.push(`duplicate id(s): ${duplicates.join(", ")}`);

  for (const element of doc.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls]")) {
    for (const attribute of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      for (const id of value.split(/\s+/)) {
        if (id && !doc.getElementById(id)) issues.push(`${attribute}="${id}" points at a missing id`);
      }
    }
  }

  for (const link of doc.querySelectorAll('a[target="_blank"]')) {
    const rel = link.getAttribute("rel") || "";
    if (!/noopener|noreferrer/.test(rel)) issues.push(`target=_blank without rel="noopener": ${link.getAttribute("href")}`);
  }

  return issues;
}

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
      const html = renderToString(wrap(React.createElement(App), page.route));
      const issues = auditA11y(html);
      if (issues.length) {
        fail(`${page.route} a11y → ${issues.join("; ")}`);
      } else {
        console.log(`  ✓ ${page.route}`);
      }
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
      const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;|&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();

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
      for (const issue of auditA11y(html)) {
        fail(`${page.route} a11y → ${issue}`);
        ok = false;
      }
      if (ok) console.log(`  ✓ ${page.route.padEnd(22)} ${text.length} chars`);
      if (process.env.SMOKE_DUMP === page.route) console.log(`\n${text.slice(0, 3000)}\n`);
    } catch (error) {
      fail(`${page.route} → ${error.message}`);
      console.log(error.stack?.split("\n").slice(1, 4).join("\n"));
    }
  }

  /* ---------------- Component-level checks ---------------- */
  console.log("\nComponents:");
  const componentChecks = [
    { module: "/src/components/layout/CommandPalette.jsx", props: {} },
    { module: "/src/components/layout/Navbar.jsx", props: {} },
    { module: "/src/components/layout/Footer.jsx", props: {} },
    { module: "/src/components/feedback/ErrorBoundary.jsx", props: {} },
    {
      module: "/src/components/cards/DeveloperCard.jsx",
      props: { profile: { id: "x", name: "Ada Nakato", skills: ["React"], rating: 4.5 } },
    },
    {
      module: "/src/components/cards/JobCard.jsx",
      props: { job: { id: "j", title: "React Engineer", company: "Acme", skills: ["React"] } },
    },
    {
      module: "/src/components/cards/ProjectCard.jsx",
      props: { project: { id: "p", title: "Dashboard", tags: ["Web"] } },
    },
  ];

  for (const check of componentChecks) {
    try {
      const Component = (await vite.ssrLoadModule(check.module)).default;
      const html = renderToString(wrap(React.createElement(Component, check.props), "/", true));
      console.log(`  ✓ ${check.module.replace("/src/components/", "").padEnd(32)} ${html.length} chars`);
    } catch (error) {
      fail(`${check.module} → ${error.message}`);
    }
  }

  /* ---------------- Pure helpers ---------------- */
  console.log("\nUtilities:");
  const search = await vite.ssrLoadModule("/src/lib/search.js");
  const utils = await vite.ssrLoadModule("/src/lib/utils.js");
  const shortlistLib = await vite.ssrLoadModule("/src/lib/shortlist.js");

  const assertions = [
    ["fuzzy subsequence match", search.scoreItem({ query: "fzzy", fields: { name: "Fuzzy Finder" } }) > 0],
    ["token miss rejects", search.scoreItem({ query: "zzzz", fields: { name: "React" } }) === 0],
    ["initials match", search.scoreItem({ query: "rn", fields: { skills: "React Native" } }) > 0],
    ["highlight splits", search.highlight("React Native", "react").some((chunk) => chunk.match)],
    ["pluralize singular", utils.pluralize(1, "developer") === "1 developer"],
    ["pluralize plural", utils.pluralize(3, "developer") === "3 developers"],
    ["parseRate reads numbers", utils.parseRate("$1,200 / month") === 1200],
    ["normalizeList splits csv", utils.normalizeList("React, Node.js").length === 2],
    ["timeAgo handles past", utils.timeAgo(new Date(Date.now() - 3600_000)) === "1 hour ago"],
    ["shortlist add", shortlistLib.addEntry({ ids: [], items: {} }, { id: "a", name: "Ada" }).ids.length === 1],
    [
      "shortlist dedupe",
      shortlistLib.addEntry(shortlistLib.addEntry({ ids: [], items: {} }, { id: "a" }), { id: "a" }).ids.length === 1,
    ],
    [
      "shortlist remove",
      shortlistLib.removeEntry({ ids: ["a"], items: { a: { id: "a" } } }, "a").ids.length === 0,
    ],
  ];

  for (const [label, passed] of assertions) {
    if (passed) console.log(`  ✓ ${label}`);
    else fail(label);
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
