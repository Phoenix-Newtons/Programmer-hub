import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Progressive enhancement for `sitemap.xml` / `robots.txt`.
 *
 * Those two files live in `public/` so they work with zero config, but there
 * the URLs can only be relative. When the deployment knows its own origin
 * (`VITE_SITE_URL`, or `VITE_BASE` for sub-path hosting) this plugin rewrites
 * them into absolute URLs — which crawlers prefer — and drops a `lastmod`
 * stamp into the sitemap. With no origin configured the files are shipped
 * untouched.
 */
function seoFiles() {
  return {
    name: "programmers-hub:seo-files",
    apply: "build",
    closeBundle() {
      const outDir = resolve(process.cwd(), "dist");
      const base = (process.env.VITE_BASE || "/").replace(/\/+$/, "");
      const origin = (process.env.VITE_SITE_URL || "").replace(/\/+$/, "");
      if (!origin) return; // nothing absolute to write — keep the shipped files

      const prefix = `${origin}${base}`;
      const lastmod = new Date().toISOString().slice(0, 10);
      const sitemapPath = resolve(outDir, "sitemap.xml");
      const robotsPath = resolve(outDir, "robots.txt");

      if (existsSync(sitemapPath)) {
        const sitemap = readFileSync(sitemapPath, "utf8")
          .replace(/<loc>(\/[^<]*)<\/loc>/g, (_, path) => `<loc>${prefix}${path === "/" ? "/" : path}</loc>`)
          .replace(/<changefreq>/g, `<lastmod>${lastmod}</lastmod><changefreq>`);
        writeFileSync(sitemapPath, sitemap);
      }

      if (existsSync(robotsPath)) {
        const robots = readFileSync(robotsPath, "utf8")
          .replace(/^Sitemap: .*$/m, `Sitemap: ${prefix}/sitemap.xml`);
        writeFileSync(robotsPath, robots);
      }
    },
  };
}

export default defineConfig({
  // Set VITE_BASE when hosting under a sub-path (e.g. GitHub Pages).
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss(), seoFiles()],
  // `legacy/` holds the original vanilla HTML/CSS version, kept for reference only.
  optimizeDeps: {
    entries: ["index.html", "src/**/*.{js,jsx}"],
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: "index.html",
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide")) return "icons";
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) {
            return "react";
          }
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Allow the sandboxed / proxied preview hosts (e.g. *.e2b.app) to reach the dev server.
    allowedHosts: true,
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    reporters: ["default"],
  },
});
