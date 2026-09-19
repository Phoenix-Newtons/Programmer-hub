import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoBanner from "./DemoBanner";
import OfflineBanner from "./OfflineBanner";
import CommandPalette from "./CommandPalette";

/**
 * App shell: skip link, banner stack, navigation, routed content and footer.
 * Also restores scroll position and announces route changes to screen readers.
 */
export default function Layout() {
  const { pathname, hash } = useLocation();
  const announcerRef = useRef(null);

  useEffect(() => {
    if (hash) {
      try {
        const target = document.querySelector(hash);
        if (target && typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      } catch {
        /* malformed hash — fall through to a normal scroll reset */
      }
    }
    window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  // Polite route announcement for assistive tech.
  useEffect(() => {
    if (!announcerRef.current) return;
    const label = pathname === "/" ? "Home" : pathname.replace(/^\//, "").replace(/\//g, " · ");
    announcerRef.current.textContent = `Navigated to ${label}`;
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-xl focus:bg-surface-solid focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-ink focus:shadow-soft focus:outline focus:outline-2 focus:outline-brand-400"
      >
        Skip to content
      </a>

      <DemoBanner />
      <Navbar />
      <OfflineBanner />

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <Footer />
      <CommandPalette />

      <span ref={announcerRef} className="sr-only" role="status" aria-live="polite" />
    </div>
  );
}
