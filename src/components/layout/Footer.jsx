import { Link } from "react-router-dom";
import {Code2, Heart, Mail, MessageCircle, Sparkles} from "lucide-react";
import { Github, X as Twitter } from "../../components/brand/BrandIcons";
import { SITE } from "../../lib/site";
import { waLink } from "../../lib/utils";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Developers", to: "/developers" },
      { label: "Projects", to: "/projects" },
      { label: "Hiring board", to: "/hiring" },
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
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-line bg-bg-elev/40">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 text-white">
                <Code2 className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink">
                Programmer&rsquo;s Hub
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {SITE.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand-400/50 hover:text-ink"
              >
                <Mail className="h-3.5 w-3.5 text-brand-300" />
                {SITE.supportEmail}
              </a>
              <a
                href={waLink(SITE.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-emerald-400/50 hover:text-ink"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                WhatsApp
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{column.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-sm text-muted transition hover:text-brand-300">
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target={link.href?.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="text-sm text-muted transition hover:text-brand-300"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Get started</h4>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Create your developer profile in minutes and start getting contacted by clients
              worldwide.
            </p>
            <Link
              to="/dashboard"
              className="btn btn-primary mt-5 text-sm"
            >
              <Sparkles className="h-4 w-4" />
              Build my profile
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {SITE.name} — created by{" "}
            <span className="font-semibold text-ink">{SITE.createdBy}</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href={SITE.github} target="_blank" rel="noreferrer" className="transition hover:text-ink" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href={`https://x.com/`} target="_blank" rel="noreferrer" className="transition hover:text-ink" aria-label="X">
              <Twitter className="h-4 w-4" />
            </a>
            <span className="inline-flex items-center gap-1.5">
              Built with <Heart className="h-3.5 w-3.5 text-rose-400" /> in Kampala
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
