import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { canPrefetch, prefetchPage } from "./lib/pages";
import "./index.css";

const container = document.getElementById("root");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);

// Reassure the console that the app booted (useful when debugging deployments).
if (import.meta.env.DEV) {
  console.info(
    `%c${"Programmer's Hub"}%c dev build ready — press ⌘K to search the hub.`,
    "font-weight:bold;color:#818cf8",
    "color:inherit"
  );
}

/**
 * Offline-ready production shell.
 *
 * `sw.js` is generated at build time (see scripts/vite-plugins.mjs) and caches
 * the hashed bundle plus a copy of the HTML shell, so repeat visits paint
 * instantly and a dropped connection still shows the app instead of the
 * browser's error page. Never registered in development, where HMR needs a
 * clean network.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        /* Private mode, unsupported browser or blocked by policy — the app works regardless. */
      });
  });
}

/**
 * Idle warm-up: once the first screen is interactive, quietly download the
 * chunks behind the primary navigation so the next click is instant. Skipped
 * on save-data / slow connections.
 */
if (canPrefetch()) {
  const warm = () => ["Developers", "Projects", "Hiring"].forEach(prefetchPage);
  const schedule = window.requestIdleCallback || ((callback) => setTimeout(callback, 2000));
  window.addEventListener("load", () => schedule(warm), { once: true });
}
