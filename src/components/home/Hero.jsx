import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, Command, Rocket, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import GoogleButton from "../auth/GoogleButton";
import { SITE } from "../../lib/site";
import { openPalette } from "../../lib/uiStore";
import { pluralize } from "../../lib/utils";

const CODE_LINES = [
  { indent: 0, text: "{", tone: "text-slate-400" },
  { indent: 1, key: "name", value: '"Your name"', tone: "text-emerald-300" },
  { indent: 1, key: "stack", value: '["React", "Node.js", "Supabase"]', tone: "text-cyan-300" },
  { indent: 1, key: "location", value: '"Kampala, UG"', tone: "text-emerald-300" },
  { indent: 1, key: "open_to_work", value: "true", tone: "text-amber-300" },
  { indent: 0, text: "}", tone: "text-slate-400" },
];

export default function Hero({ stats = [], developers = 0, roles = 0 }) {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
      <div className="container-page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy ------------------------------------------------------- */}
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Built for programmers who ship
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Turn your stack into your
            <br className="hidden sm:block" /> <span className="gradient-text">next opportunity.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {SITE.name} is a developer marketplace where you publish a real profile, showcase the projects
            you&rsquo;ve shipped, and get contacted by clients in one click — no gatekeepers, no recruiter fees.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => openPalette("")} className="btn btn-primary btn-lg">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search the hub
              <kbd className="ml-1 hidden items-center gap-0.5 rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[0.66rem] font-bold sm:flex">
                <Command className="h-2.5 w-2.5" aria-hidden="true" />K
              </kbd>
            </button>
            <Link to="/hiring" className="btn btn-ghost btn-lg">
              <Rocket className="h-4 w-4" aria-hidden="true" />
              I&rsquo;m hiring
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted" aria-live="polite">
            {developers ? (
              <>
                {pluralize(developers, "developer profile")} and {pluralize(roles, "open role")} indexed — search
                them instantly.
              </>
            ) : (
              <>Free forever for developers. Sign in with Google or email.</>
            )}
          </p>

          <div className="mt-8">
            <GoogleButton redirectTo={`${window.location.origin}/dashboard`} />
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-4">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {stat.label}
                </dt>
                <dd className="mt-1 flex items-baseline gap-1 text-2xl font-black text-ink">
                  {stat.value}
                  {stat.suffix ? <span className="text-sm font-bold text-brand-300">{stat.suffix}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual ------------------------------------------------------ */}
        <div className="relative animate-rise [animation-delay:120ms]">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-tr from-indigo-500/25 via-fuchsia-500/10 to-cyan-400/25 blur-3xl" />

          <div className="card overflow-hidden shadow-soft">
            <div className="flex items-center gap-2 border-b border-line bg-black/20 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-xs text-muted">profile.json</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[0.82rem] leading-7">
              {CODE_LINES.map((line, index) => (
                <div key={index} style={{ paddingLeft: `${line.indent * 1.25}rem` }}>
                  {line.key ? (
                    <>
                      <span className="text-brand-300">{line.key}</span>
                      <span className="text-slate-400">: </span>
                      <span className={line.tone}>{line.value}</span>
                      <span className="text-slate-400">,</span>
                    </>
                  ) : (
                    <span className={line.tone}>{line.text}</span>
                  )}
                </div>
              ))}
            </pre>
            <div className="border-t border-line bg-black/20 px-5 py-4 text-xs text-muted">
              <span className="font-mono text-emerald-400">✓</span> profile pushed to{" "}
              <span className="font-mono text-ink-soft">supabase / profiles</span> · live in seconds
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -left-4 bottom-8 hidden animate-float rounded-2xl border border-line-strong bg-surface-solid/95 px-4 py-3 shadow-soft backdrop-blur-xl sm:block">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">1-click contact</p>
                <p className="text-[0.7rem] text-muted">WhatsApp or email</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 top-10 hidden animate-float rounded-2xl border border-line-strong bg-surface-solid/95 px-4 py-3 shadow-soft backdrop-blur-xl sm:block [animation-delay:2s]">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Verified talent</p>
                <p className="text-[0.7rem] text-muted">Real profiles only</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted sm:justify-start">
        <span className="inline-flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
          Supabase auth &amp; database
        </span>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
          Row-level security by default
        </span>
        <span className="inline-flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-300" aria-hidden="true" />
          Direct hiring, no fees
        </span>
        <Link to="/about" className="inline-flex items-center gap-1.5 font-semibold text-brand-300 hover:underline">
          Meet the builder
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
