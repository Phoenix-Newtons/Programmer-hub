import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { seoFiles, serviceWorker } from "./scripts/vite-plugins.mjs";

export default defineConfig({
  // Set VITE_BASE when hosting under a sub-path (e.g. GitHub Pages).
  base: process.env.VITE_BASE || "/",
  // The last two only ever run for `vite build` — see scripts/vite-plugins.mjs.
  plugins: [react(), tailwindcss(), seoFiles(), serviceWorker()],
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
