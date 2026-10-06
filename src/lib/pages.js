import { lazy } from "react";

/**
 * Single registry of the lazily-loaded pages.
 *
 * Keeping every `import()` in one module means the route definitions, the
 * hover/focus prefetching and the idle warm-up all share the same chunks —
 * Vite still emits one file per page, but the app never downloads a route twice
 * and never ends up with two spellings of the same import.
 */
const LOADERS = {
  Home: () => import("../pages/Home"),
  Developers: () => import("../pages/Developers"),
  DeveloperProfile: () => import("../pages/DeveloperProfile"),
  Projects: () => import("../pages/Projects"),
  Hiring: () => import("../pages/Hiring"),
  Shortlist: () => import("../pages/Shortlist"),
  About: () => import("../pages/About"),
  Login: () => import("../pages/Login"),
  Dashboard: () => import("../pages/Dashboard"),
  NotFound: () => import("../pages/NotFound"),
};

/** Every registered page name — handy for tests and tooling. */
export const PAGE_NAMES = Object.keys(LOADERS);

/** Loads a page module (the same promise `lazy()` uses). */
export function loadPage(name) {
  const loader = LOADERS[name];
  if (!loader) throw new Error(`Unknown page: ${name}`);
  return loader();
}

/** `lazy(() => import(...))` for a registered page name. */
export function lazyPage(name) {
  // Fail loudly at module scope rather than mid-render when a name is wrong.
  if (!LOADERS[name]) throw new Error(`Unknown page: ${name}`);
  return lazy(() => loadPage(name));
}

const started = new Set();

/**
 * Warms a route's chunk in the background.
 *
 * Called on hover/focus of navigation links (and once the browser is idle), so
 * a click usually lands on an already-downloaded page. Safe to call repeatedly:
 * each page is requested at most once, and failures are ignored — the lazy
 * import will retry when the user actually navigates there.
 */
export function prefetchPage(name) {
  const loader = LOADERS[name];
  if (!loader || started.has(name)) return;
  started.add(name);
  loader().catch(() => started.delete(name));
}

/** Route path → page name, so links can prefetch without knowing the registry. */
const PATH_PAGES = {
  "/": "Home",
  "/developers": "Developers",
  "/projects": "Projects",
  "/hiring": "Hiring",
  "/shortlist": "Shortlist",
  "/about": "About",
  "/login": "Login",
  "/dashboard": "Dashboard",
};

/** Warms the page behind a route path (ignores unknown/external paths). */
export function prefetchPath(path) {
  const name = PATH_PAGES[String(path || "").split(/[?#]/)[0]];
  if (name) prefetchPage(name);
}

/** Props for a router link: warm the destination on hover, focus or tap. */
export function prefetchLinkProps(path) {
  const warm = () => prefetchPath(path);
  return { onMouseEnter: warm, onFocus: warm, onTouchStart: warm };
}

/** True when the visitor's connection can afford a background download. */
export function canPrefetch() {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !/^(slow-)?2g$/.test(connection.effectiveType || "");
}
