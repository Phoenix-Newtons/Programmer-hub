import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BookmarkCheck, Code2, Command, LayoutDashboard, LogOut, Menu, Search, X } from "lucide-react";

import Button from "../ui/Button";
import GoogleButton from "../auth/GoogleButton";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { NAV_LINKS } from "../../lib/site";
import { useShortlist } from "../../lib/shortlist";
import { openPalette } from "../../lib/uiStore";
import { cn } from "../../lib/utils";

/** Sticky, glassy top navigation with search, shortlist and account menu. */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { isAuthenticated, displayName, avatarUrl, signOut } = useAuth();
  const toast = useToast();
  const shortlist = useShortlist();

  // Close the drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Elevate the bar once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) toast.error("Could not sign out. Try again.");
    else toast.info("Signed out.");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-line bg-bg/85 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70"
          : "border-transparent bg-bg/60 backdrop-blur-md"
      )}
    >
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Programmer's Hub home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_10px_30px_-14px_rgb(99_102_241/0.9)]">
              <Code2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="hidden text-[1.05rem] font-extrabold tracking-tight text-ink sm:block">
              Programmer&rsquo;s Hub
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-brand-500/15 text-brand-200"
                      : "text-ink-soft hover:bg-white/5 hover:text-ink"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Palette trigger doubles as site search */}
            <button
              type="button"
              onClick={() => openPalette("")}
              aria-label="Search the hub"
              aria-keyshortcuts="Meta+K Control+K"
              className="group hidden items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-muted transition hover:border-brand-400/60 hover:text-ink md:flex"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="ml-1 flex items-center gap-0.5 rounded-md border border-line-strong bg-surface-solid px-1.5 py-0.5 font-mono text-[0.66rem] font-bold text-muted">
                <Command className="h-2.5 w-2.5" aria-hidden="true" />K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => openPalette("")}
              aria-label="Search the hub"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface text-ink-soft transition hover:border-brand-400/60 hover:text-ink md:hidden"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>

            <Link
              to="/shortlist"
              aria-label={`Shortlist: ${shortlist.count} saved ${shortlist.count === 1 ? "developer" : "developers"}`}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-xl border transition",
                shortlist.count
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                  : "border-line-strong bg-surface text-ink-soft hover:border-amber-400/50 hover:text-ink"
              )}
            >
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              {shortlist.count ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1 text-[0.62rem] font-black text-amber-950">
                  {shortlist.count}
                </span>
              ) : null}
            </Link>

            <ThemeToggle compact className="hidden sm:block" />

            {isAuthenticated ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-2.5 py-1.5 transition hover:border-brand-400/60"
                >
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[0.7rem] font-bold text-white">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (displayName || "U").slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="max-w-24 truncate text-sm font-semibold text-ink">
                    {displayName || "Dashboard"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Button to="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <GoogleButton size="sm" label="Google" redirectTo={`${window.location.origin}/dashboard`} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface text-ink lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        // `inert` keeps the closed drawer out of the tab order and the a11y tree.
        inert={!mobileOpen || undefined}
        className={cn(
          "overflow-hidden border-t border-line bg-bg/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden",
          mobileOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="container-page space-y-2 py-5">
          <button
            type="button"
            onClick={() => openPalette("")}
            className="flex w-full items-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 text-left text-sm font-semibold text-muted"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search developers, projects, roles…
          </button>

          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-xl px-4 py-3 text-sm font-semibold transition",
                  isActive ? "bg-brand-500/15 text-brand-200" : "text-ink-soft hover:bg-white/5"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}

          <NavLink
            to="/shortlist"
            tabIndex={mobileOpen ? 0 : -1}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition",
                isActive ? "bg-amber-500/15 text-amber-200" : "text-ink-soft hover:bg-white/5"
              )
            }
          >
            Shortlist
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
              {shortlist.count}
            </span>
          </NavLink>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <ThemeToggle compact />
            <span className="text-sm font-semibold text-muted">Appearance</span>
          </div>

          <div className="grid gap-2 pt-3">
            {isAuthenticated ? (
              <>
                <Button to="/dashboard" variant="primary" icon={LayoutDashboard}>
                  Dashboard
                </Button>
                <Button variant="ghost" icon={LogOut} onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <GoogleButton redirectTo={`${window.location.origin}/dashboard`} />
                <Button to="/login" variant="ghost">
                  Sign in with email
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
