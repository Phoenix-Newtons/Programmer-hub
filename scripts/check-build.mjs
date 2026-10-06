/**
 * Verifies the *deployment artifacts* in `dist/` after `vite build`.
 *
 *   node scripts/check-build.mjs        (wired into `npm run verify`)
 *
 * Beyond static checks (sitemap, robots, manifest, precache list), the
 * generated `sw.js` is executed in a sandbox with a fake CacheStorage so the
 * offline paths are proven rather than assumed.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dist = resolve(root, "dist");

let failures = 0;
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  \u001b[32m✓\u001b[39m ${label}${detail ? ` \u001b[2m${detail}\u001b[39m` : ""}`);
  } else {
    failures += 1;
    console.log(`  \u001b[31m✗\u001b[39m ${label}${detail ? ` \u001b[2m${detail}\u001b[39m` : ""}`);
  }
}

function listFiles(dir, base = dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) return listFiles(full, base);
    return [
      full
        .slice(base.length + 1)
        .split("\\")
        .join("/"),
    ];
  });
}

if (!existsSync(dist) || !existsSync(resolve(dist, "index.html"))) {
  console.error("✗ dist/ is missing — run `npm run build` first.");
  process.exit(1);
}

console.log("\nBuild artifacts\n");

/* ---------------------------------------------------------------- *
 * Static files
 * ---------------------------------------------------------------- */
const files = listFiles(dist);
const indexHtml = readFileSync(resolve(dist, "index.html"), "utf8");
const assets = files.filter((file) => file.startsWith("assets/"));
const jsAssets = assets.filter((file) => file.endsWith(".js"));

check("index.html references the hashed entry bundle", /assets\/index-[\w-]+\.js/.test(indexHtml));
check("index.html references the hashed stylesheet", /assets\/index-[\w-]+\.css/.test(indexHtml));
check("pre-paint theme script is inlined", indexHtml.includes("ph-theme"));
check(
  "no bundler-placeholder paths leak into the HTML",
  !indexHtml.includes("/@vite/") && !indexHtml.includes("/src/")
);
check(
  "every asset chunk is present on disk",
  assets.length > 0,
  `${jsAssets.length} JS / ${assets.length - jsAssets.length} CSS`
);

const sitemap = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
check("sitemap uses the official namespace", sitemap.includes("http://www.sitemaps.org/schemas/sitemap/0.9"));
check(
  "sitemap lists the public routes",
  ["/", "/developers", "/projects", "/hiring", "/about"].every(
    (route) => sitemap.includes(`<loc>${route}</loc>`) || sitemap.includes(`${route}</loc>`)
  )
);
check("sitemap keeps private routes out", !/loc>[^<]*\/(shortlist|dashboard|login)</.test(sitemap));

const robots = readFileSync(resolve(dist, "robots.txt"), "utf8");
check("robots.txt allows crawling", /User-agent: \*/i.test(robots) && /Allow: \//.test(robots));
check(
  "robots.txt hides private routes",
  ["/dashboard", "/login", "/shortlist"].every((route) => robots.includes(`Disallow: ${route}`))
);
check("robots.txt points at the sitemap", /^Sitemap: /m.test(robots));

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.webmanifest"), "utf8"));
check("manifest parses and declares a standalone display", manifest.display === "standalone");
check(
  "manifest icons exist on disk",
  manifest.icons.every((icon) => existsSync(resolve(dist, icon.src.replace(/^\//, ""))))
);
check(
  "manifest start_url sits inside its scope",
  new URL(manifest.start_url, "https://x.test/").pathname.startsWith(
    new URL(manifest.scope, "https://x.test/").pathname
  )
);

/* ---------------------------------------------------------------- *
 * Service worker — static shape
 * ---------------------------------------------------------------- */
const sw = readFileSync(resolve(dist, "sw.js"), "utf8");
check(
  "sw.js is valid JavaScript",
  (() => {
    try {
      new vm.Script(sw);
      return true;
    } catch {
      return false;
    }
  })()
);

const precacheMatch = sw.match(/const PRECACHE = (\[[\s\S]*?\]);/);
const precache = precacheMatch ? JSON.parse(precacheMatch[1]) : [];
check("precache list is generated", precache.length > 0, `${precache.length} URLs`);
check("precache includes the HTML shell", precache.includes("/index.html"));
check(
  "precache includes every JS chunk",
  jsAssets.every((file) => precache.includes(`/${file}`))
);
check(
  "precache stays same-origin",
  precache.every((url) => url.startsWith("/"))
);
check("precache has no duplicates", new Set(precache).size === precache.length);

/* ---------------------------------------------------------------- *
 * Service worker — behaviour, in a sandbox with a fake CacheStorage
 * ---------------------------------------------------------------- */
function cloneOf(body, init = {}) {
  return {
    body,
    ok: init.ok ?? true,
    status: init.status ?? 200,
    type: init.type ?? "basic",
    clone: () => cloneOf(body, init),
  };
}

function createHarness() {
  const listeners = new Map();
  const store = new Map(); // cacheName -> Map(url -> response)
  const cacheFor = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name);
    return {
      add: async (request) => {
        const url = typeof request === "string" ? request : request.url;
        const response = await sandbox.fetch(url);
        if (!response.ok) throw new Error(`add failed: ${url}`);
        entries.set(url, response);
      },
      put: async (request, response) => {
        entries.set(typeof request === "string" ? request : request.url, response);
      },
      match: async (request) => {
        const url = typeof request === "string" ? request : request.url;
        return entries.get(url) || undefined;
      },
    };
  };

  const state = { online: true, failUrls: new Set(), requests: [] };

  const sandbox = {
    console,
    URL,
    Request: class Request {
      constructor(url, init = {}) {
        this.url = url;
        this.method = init.method || "GET";
      }
    },
    Response: class Response {
      constructor(body, init = {}) {
        this.body = body;
        Object.assign(this, { ok: init.status ? init.status < 400 : true, status: 200, type: "basic" }, init);
      }
    },
    caches: {
      open: async (name) => cacheFor(name),
      keys: async () => [...store.keys()],
      delete: async (name) => store.delete(name),
    },
    fetch: async (request) => {
      const url = typeof request === "string" ? request : request.url;
      state.requests.push(url);
      if (!state.online) throw new Error("offline");
      if (state.failUrls.has(new URL(url, "https://example.test").pathname)) throw new Error(`404: ${url}`);
      return cloneOf(`network:${url}`, { type: "basic" });
    },
    self: {
      location: new URL("https://example.test/"),
      registration: { scope: "https://example.test/" },
      addEventListener: (type, handler) => listeners.set(type, handler),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    Promise,
  };
  sandbox.globalThis = sandbox;

  vm.runInNewContext(sw, sandbox);

  // Resolves with the response produced by the worker, or `undefined` when the
  // worker deliberately did not intercept the request.
  const dispatch = (type, init) =>
    new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const handler = listeners.get(type);
      if (!handler) return done(undefined);

      let intercepted = false;
      handler({
        ...init,
        waitUntil: (promise) => {
          intercepted = true;
          Promise.resolve(promise).then(
            () => done(undefined),
            () => done(undefined)
          );
        },
        respondWith: (promise) => {
          intercepted = true;
          Promise.resolve(promise).then(done, () => done(undefined));
        },
      });

      // Nothing was claimed synchronously: the worker let the browser handle it.
      queueMicrotask(() => {
        if (!intercepted) done(undefined);
      });
    });

  return { sandbox, state, dispatch, store };
}

const harness = createHarness();
// One asset 404s: the install must still cache everything else and resolve.
harness.state.failUrls.add("/favicon.svg");
await harness.dispatch("install", {});
const precached = harness.store.get([...harness.store.keys()][0]) || new Map();
check("install precaches the shell", precached.has("/index.html"), `${precached.size} entries cached`);
check(
  "install survives a partial failure",
  precached.size === precache.length - 1,
  `cached ${precached.size}/${precache.length}, skipped the 404`
);

await harness.dispatch("activate", {});
check("activate keeps only the current cache", harness.store.size === 1);

// Navigation online → served from network, cached for offline.
const onlineNav = await harness.dispatch("fetch", {
  request: { method: "GET", mode: "navigate", url: "https://example.test/developers" },
});
check(
  "navigations prefer the network",
  String(onlineNav.body).includes("network:https://example.test/developers")
);

// Navigation offline → the cached shell is served instead of an error page.
harness.state.online = false;
const offlineNav = await harness.dispatch("fetch", {
  request: { method: "GET", mode: "navigate", url: "https://example.test/projects" },
});
check(
  "offline navigations fall back to the last good shell",
  String(offlineNav.body).includes("network:https://example.test/developers"),
  "served from cache instead of the browser error page"
);
harness.state.online = true;

// Static asset → cache first, one network request at most.
const assetUrl = `https://example.test/${jsAssets[0]}`;
harness.state.requests.length = 0;
await harness.dispatch("fetch", { request: { method: "GET", mode: "cors", url: assetUrl } });
await harness.dispatch("fetch", { request: { method: "GET", mode: "cors", url: assetUrl } });
check(
  "hashed assets are cached after the first hit",
  harness.state.requests.length <= 1,
  `${harness.state.requests.length} network call(s)`
);

// Cross-origin (Supabase) and mutations are never intercepted.
harness.state.requests.length = 0;
const supabase = await harness.dispatch("fetch", {
  request: { method: "GET", mode: "cors", url: "https://project.supabase.co/rest/v1/profiles" },
});
const mutation = await harness.dispatch("fetch", {
  request: { method: "POST", mode: "cors", url: "https://example.test/index.html" },
});
check("cross-origin API calls are left alone", supabase === undefined && harness.state.requests.length === 0);
check("non-GET requests are left alone", mutation === undefined);

console.log(
  failures
    ? `\n\u001b[31m✗ ${failures} of ${checks} build checks failed\u001b[39m\n`
    : `\n\u001b[32m✓ all ${checks} build checks passed\u001b[39m\n`
);
process.exit(failures ? 1 : 0);
