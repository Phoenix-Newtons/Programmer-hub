import { Compass, Home, Mail, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import usePageMeta from "../hooks/usePageMeta";
import { NAV_LINKS, SITE, TECH_MARQUEE } from "../lib/site";

export default function NotFound() {
  usePageMeta({
    title: "Page not found (404)",
    description: "That route doesn't exist on Programmer's Hub. Jump back into developers, projects or the hiring board.",
    noIndex: true,
  });

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <span className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-xl" />
        <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-mono text-3xl font-black text-white">
          404
        </span>
      </span>

      <h1 className="mt-8 text-3xl font-black tracking-tight text-ink sm:text-4xl">
        This route returned <span className="gradient-text">undefined</span>
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist — or it shipped without a redirect. Let&rsquo;s
        get you back to something useful.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/" icon={Home}>
          Back home
        </Button>
        <Button to="/developers" variant="ghost" icon={Search}>
          Browse developers
        </Button>
        <Button href={`mailto:${SITE.supportEmail}?subject=Broken%20link`} variant="ghost" icon={Mail}>
          Report a broken link
        </Button>
      </div>

      <nav aria-label="Popular pages" className="mt-12 w-full max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Popular destinations</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card card-hover flex items-center justify-between gap-3 p-4 text-left"
            >
              <span>
                <span className="block text-sm font-bold text-ink">{link.label}</span>
                <span className="block text-xs text-muted">Back to browsing</span>
              </span>
              <Users className="h-4 w-4 text-brand-300" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
        {SITE.name} — built with {TECH_MARQUEE.slice(0, 3).join(", ")} and friends.
      </p>
    </div>
  );
}
