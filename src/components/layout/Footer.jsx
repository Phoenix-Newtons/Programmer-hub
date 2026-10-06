import { Link } from "react-router-dom";
import { ArrowUp, Code2, Heart, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Github, Linkedin, X as Twitter } from "../brand/BrandIcons";
import Toggle from "../ui/Toggle";
import { SITE } from "../../lib/site";
import { prefetchLinkProps } from "../../lib/pages";
import { useDemoMode, setDemoMode } from "../../lib/demo";
import { TECHNOLOGIES } from "../../lib/site";
import { waLink } from "../../lib/utils";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Developers", to: "/developers" },
      { label: "Projects", to: "/projects" },
      { label: "Hiring board", to: "/hiring" },
      { label: "Shortlist", to: "/shortlist" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact support", href: `mailto:${SITE.supportEmail}` },
      { label: "Source code", href: SITE.repo },
      { label: "Report an issue", href: `${SITE.repo}/issues` },
      { label: "Schema (SQL)", href: `${SITE.repo}/blob/main/supabase/schema.sql` },
    ],
  },
];

export default function Footer() {
  const demoMode = useDemoMode();

  return (
    <footer className="relative mt-24 border-t border-line bg-bg-elev/40">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-white">
                <Code2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink">{SITE.name}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{SITE.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand-400/50 hover:text-ink"
              >
                <Mail className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
                {SITE.supportEmail}
              </a>
              <a
                href={waLink(SITE.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-emerald-400/50 hover:text-ink"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              {/* h2: footer columns are top-level sections, so they never follow the page h1 by a gap */}
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        {...prefetchLinkProps(link.to)}
                        className="text-sm text-muted transition hover:text-brand-300"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target={link.href?.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="text-sm text-muted transition hover:text-brand-300"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Get started</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Create your developer profile in minutes and start getting contacted by clients worldwide.
            </p>
            <Link to="/dashboard" className="btn btn-primary mt-5 text-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Build my profile
            </Link>
            <Toggle
              className="mt-4"
              checked={demoMode}
              onChange={setDemoMode}
              tone="amber"
              label="Sample data"
              description="Preview the UI with fictional rows"
            />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold uppercase tracking-[0.14em]">Built with</span>
            {TECHNOLOGIES.map((tech, index) => (
              <span key={tech}>
                {tech}
                {index < TECHNOLOGIES.length - 1 ? <span className="text-line-strong"> ·</span> : null}
              </span>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} {SITE.name} — created by{" "}
              <span className="font-semibold text-ink">{SITE.createdBy}</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-ink"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={SITE.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-ink"
                aria-label="X"
              >
                <Twitter className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-ink"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="transition hover:text-ink"
                aria-label="Email support"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
              <span className="inline-flex items-center gap-1.5">
                Built with <Heart className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" /> in Kampala
              </span>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 font-semibold transition hover:border-brand-400/50 hover:text-ink"
              >
                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
