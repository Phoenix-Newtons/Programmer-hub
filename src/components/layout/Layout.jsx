import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoBanner from "./DemoBanner";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 grid-lines" />
        <div className="aurora absolute inset-x-0 top-0 h-[620px] overflow-hidden" />
      </div>

      <ScrollToTop />
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
