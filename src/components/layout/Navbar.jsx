import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { X, Briefcase, Code2, LayoutDashboard, LogOut, Menu, Moon, Rocket, Sun, UserRound, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import GoogleButton from "../auth/GoogleButton";
import { NAV_LINKS, SITE } from "../../lib/site";
import { cn } from "../../lib/utils";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, profile, displayName, avatarUrl, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) return toast.error("Could not sign out. Try again.");
    toast.success("Signed out. See you soon!");
    navigate("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60"
          : "border-b border-transparent"
      )}
    >
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-[72px]">
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_10px_30px_-10px_rgb(99_102_241/0.9)] transition group-hover:scale-105">
              <Code2 className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[0.98rem] font-extrabold tracking-tight text-ink">
                Programmer&rsquo;s Hub
              </span>
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                {SITE.tagline}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                    isActive ? "bg-brand-500/12 text-brand-300" : "text-muted hover:bg-white/5 hover:text-ink"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface text-muted transition hover:border-brand-400/50 hover:text-ink"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {isAuthenticated ? (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-surface py-1.5 pl-1.5 pr-3 transition hover:border-brand-400/50"
                >
                  <Avatar name={displayName || user?.email} src={avatarUrl} size="sm" ring={false} />
                  <span className="max-w-[9rem] truncate text-sm font-semibold text-ink">
                    {displayName || "Developer"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted transition", menuOpen && "rotate-180")} />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-60 animate-rise overflow-hidden rounded-2xl border border-line-strong bg-surface-solid/95 shadow-2xl backdrop-blur-xl">
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink">{displayName || "Developer"}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-500/10 hover:text-ink"
                      >
                        <LayoutDashboard className="h-4 w-4 text-brand-300" />
                        Dashboard
                      </Link>
                      <Link
                        to="/developers"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-500/10 hover:text-ink"
                      >
                        <UserRound className="h-4 w-4 text-brand-300" />
                        Browse developers
                      </Link>
                      <Link
                        to="/hiring"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-500/10 hover:text-ink"
                      >
                        <Briefcase className="h-4 w-4 text-brand-300" />
                        Hiring board
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
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
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-t border-line bg-bg/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden",
          mobileOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="container-page space-y-2 py-5">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-xl px-4 py-3 text-sm font-semibold transition",
                  isActive ? "bg-brand-500/12 text-brand-300" : "text-ink-soft hover:bg-white/5"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}

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
                <Button to="/login" variant="ghost" icon={Rocket}>
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
