import { useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {Atom, Blocks, Code2, Copy, Database, Heart, Mail, MessageCircle, Palette, Rocket, Server, ShieldCheck, Sparkles, Target, Terminal, Users, Zap} from "lucide-react";
import { Github } from "../components/brand/BrandIcons";
import PageHeading from "../components/layout/PageHeading";
import SectionHeading from "../components/ui/SectionHeading";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import GoogleButton from "../components/auth/GoogleButton";
import { SITE } from "../lib/site";
import { waLink } from "../lib/utils";
import { useToast } from "../context/ToastContext";

const VALUES = [
  {
    icon: Target,
    title: "Skills over résumés",
    text: "A CV lists what you studied. The hub shows what you actually shipped — repos, live URLs and stacks you work in daily.",
  },
  {
    icon: ShieldCheck,
    title: "Real people only",
    text: "Every profile is backed by a Supabase identity. No scraped portfolios, no invented developers, no ghost listings.",
  },
  {
    icon: Users,
    title: "Direct connections",
    text: "Clients reach you on WhatsApp or email in one tap. No bidding wars, no platform taking a cut of your work.",
  },
  {
    icon: Zap,
    title: "Fast to join",
    text: "Sign in with Google, fill in your stack, publish a project. Two minutes from landing page to live profile.",
  },
];

const STACK = [
  { icon: Atom, name: "React 19", detail: "Component-driven UI" },
  { icon: Zap, name: "Vite", detail: "Instant dev server & bundling" },
  { icon: Palette, name: "Tailwind CSS v4", detail: "Design tokens & theming" },
  { icon: Sparkles, name: "lucide-react", detail: "1,600+ crisp open-source icons" },
  { icon: Database, name: "Supabase", detail: "Auth, Postgres, storage" },
  { icon: Server, name: "Row Level Security", detail: "Own your own data" },
  { icon: Blocks, name: "React Router", detail: "Client-side navigation" },
  { icon: Terminal, name: "GitHub Actions", detail: "Build checks on every push" },
];

const ROADMAP = [
  { icon: ShieldCheck, title: "Verified badge reviews", text: "A human-reviewed check for portfolios and identity." },
  { icon: MessageCircle, title: "In-app messaging", text: "Threaded conversations with realtime Supabase channels." },
  { icon: Rocket, title: "Featured talent plans", text: "Optional boosts for developers who want extra reach." },
  { icon: Code2, title: "Public API", text: "Let other tools query the developer directory." },
];

export default function About() {
  useDocumentTitle("About");
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SITE.supportEmail);
      setCopied(true);
      toast.success("Support email copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.warning("Copy failed — the email is " + SITE.supportEmail);
    }
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="About"
        icon={Sparkles}
        title="A marketplace built by a developer, for developers."
        description={`${SITE.name} exists because talent is everywhere, but opportunity is not. It's a small, fast, open platform where programmers publish real work and get contacted directly.`}
      >
        <GoogleButton redirectTo={`${window.location.origin}/dashboard`} />
      </PageHeading>

      {/* Creator */}
      <section className="mt-14">
        <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-gradient-to-br from-indigo-600/25 via-fuchsia-600/12 to-cyan-500/20 p-7 sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex items-center gap-5">
              <div className="relative">
                <span className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-60 blur-lg" />
                <Avatar name={SITE.creator.name} size="xl" className="relative" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Created by</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {SITE.creator.name}
                </h2>
                <p className="text-sm font-semibold text-white/75">{SITE.creator.role}</p>
              </div>
            </div>

            <div className="lg:pl-6 lg:border-l lg:border-white/15">
              <p className="text-[0.95rem] leading-relaxed text-white/80">
                {SITE.creator.bio} {SITE.name} started as a way to make that easier — one place where a
                developer&rsquo;s stack, projects and contact details live together, and where clients can
                find them without paying a recruiter.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="chip border-white/20 bg-white/10 text-white">
                  <MapPinIcon /> {SITE.creator.location}
                </span>
                <span className="chip border-white/20 bg-white/10 text-white">
                  <Rocket className="h-3 w-3" /> Founded {SITE.foundedYear}
                </span>
                <span className="chip border-white/20 bg-white/10 text-white">
                  <Code2 className="h-3 w-3" /> Full-stack engineer
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact + support */}
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        <a
          href={`mailto:${SITE.supportEmail}`}
          className="card card-hover flex items-start gap-4 p-6"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">Support email</h3>
            <p className="mt-1 truncate text-sm font-medium text-brand-300">{SITE.supportEmail}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Bugs, billing questions, takedown requests or partnership ideas.
            </p>
          </div>
        </a>

        <a
          href={waLink(SITE.whatsapp)}
          target="_blank"
          rel="noreferrer"
          className="card card-hover flex items-start gap-4 p-6"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">WhatsApp</h3>
            <p className="mt-1 text-sm font-medium text-emerald-300">+{SITE.whatsapp}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Fastest way to reach the hub team during working hours.
            </p>
          </div>
        </a>

        <a href={SITE.github} target="_blank" rel="noreferrer" className="card card-hover flex items-start gap-4 p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface text-ink">
            <Github className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">Open source</h3>
            <p className="mt-1 truncate text-sm font-medium text-brand-300">
              {SITE.repo.replace("https://github.com/", "")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Read the code, open an issue, or send a pull request.
            </p>
          </div>
        </a>
      </section>

      {/* Mission + values */}
      <section className="mt-20">
        <SectionHeading
          eyebrow="Why it exists"
          icon={Heart}
          title="Opportunity should follow the work, not the network."
          description="Most developer marketplaces optimise for volume. This one optimises for proof — small, honest profiles backed by code you can open."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="card card-hover p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
                <value.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="mt-20 border-y border-line bg-bg-elev/30 py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="Under the hood"
            icon={Terminal}
            title="Modern, boring-in-a-good-way tech."
            description="No heavy framework lock-in — just the tools that let a small team ship a fast product."
            align="center"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map((item) => (
              <div key={item.name} className="card p-5 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-brand-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{item.name}</h3>
                <p className="mt-1 text-xs text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="mt-20">
        <SectionHeading
          eyebrow="Roadmap"
          icon={Rocket}
          title="What's coming next."
          description="Planned improvements — if you want one sooner, email support and tell us."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((item) => (
            <div key={item.title} className="card card-hover p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20">
        <div className="card overflow-hidden p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <Badge tone="indigo" icon={Sparkles}>
                Say hello
              </Badge>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-ink">
                Built by {SITE.createdBy} — improved by you.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                Found a bug, want a feature, or hiring for something interesting? Support and
                partnerships both start at the same inbox.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href={`mailto:${SITE.supportEmail}`} icon={Mail}>
                  {SITE.supportEmail}
                </Button>
                <Button variant="ghost" icon={copied ? ShieldCheck : Copy} onClick={copyEmail}>
                  {copied ? "Copied!" : "Copy email"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Mail, label: "Support", value: SITE.supportEmail },
                { icon: Users, label: "General enquiries", value: SITE.supportEmail },
                { icon: Github, label: "Source", value: SITE.repo.replace("https://", "") },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-300">
                    <row.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      {row.label}
                    </span>
                    <span className="block truncate text-sm font-semibold text-ink">{row.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Small inline pin so the creator card stays self-contained. */
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
