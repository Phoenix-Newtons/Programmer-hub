import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Code2,
  Cpu,
  FolderGit2,
  Layers,
  Mail,
  MessageCircle,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";

import { Github } from "../components/brand/BrandIcons";
import Hero from "../components/home/Hero";
import SectionHeading from "../components/ui/SectionHeading";
import DeveloperCard from "../components/cards/DeveloperCard";
import ProjectCard from "../components/cards/ProjectCard";
import JobCard from "../components/cards/JobCard";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import Marquee from "../components/ui/Marquee";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import ShareMenu from "../components/ui/ShareMenu";
import { GridSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import usePageMeta from "../hooks/usePageMeta";
import { fetchJobs, fetchProfiles, fetchProjects } from "../lib/api";
import { PLATFORM_PROMISES, SITE, TECH_MARQUEE } from "../lib/site";
import { pluralize } from "../lib/utils";

const STEPS = [
  {
    icon: Wand2,
    title: "Create your profile",
    text: "Sign in with Google, fill in your stack, rate, location and contact links. It takes about two minutes.",
  },
  {
    icon: FolderGit2,
    title: "Publish real projects",
    text: "Add the things you've actually shipped — repos, live URLs, screenshots. Proof beats promises.",
  },
  {
    icon: MessageCircle,
    title: "Get contacted directly",
    text: "Clients reach you on WhatsApp or email in one tap. No platform fees, no middlemen.",
  },
];

const FEATURES = [
  {
    icon: SearchCheck,
    title: "Skill-first search",
    text: "Fuzzy search across names, stacks, cities and bios — plus filters you can share as a URL.",
  },
  {
    icon: ShieldCheck,
    title: "Verified identity",
    text: "Google sign-in plus Supabase row-level security means profiles belong to real people.",
  },
  {
    icon: Layers,
    title: "Project portfolio",
    text: "Every profile can host a living portfolio of shipped work with repo and live links.",
  },
  {
    icon: Cpu,
    title: "Built on Supabase",
    text: "Postgres, auth, storage and realtime-ready APIs without running a single server.",
  },
  {
    icon: Blocks,
    title: "Modular by design",
    text: "React 19 + Vite + Tailwind v4 with lucide icons — every screen is a component you can move around.",
  },
  {
    icon: Users,
    title: "Hiring board",
    text: "Companies post roles with budget and stack; developers apply in a couple of clicks.",
  },
];

export default function Home() {
  const profiles = useCollection(fetchProfiles);
  const projects = useCollection(fetchProjects);
  const jobs = useCollection(fetchJobs);

  usePageMeta({
    description: SITE.description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      description: SITE.description,
      url: SITE.repo,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE.repo}/developers?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  });

  const featuredDevs = useMemo(
    () => [...profiles.data].sort((a, b) => Number(b.featured || 0) - Number(a.featured || 0)).slice(0, 3),
    [profiles.data]
  );
  const featuredProjects = projects.data.slice(0, 3);
  const latestJobs = jobs.data.slice(0, 3);

  const stats = [
    { label: "Developers", value: <AnimatedCounter value={profiles.data.length} /> },
    { label: "Projects", value: <AnimatedCounter value={projects.data.length} /> },
    { label: "Open roles", value: <AnimatedCounter value={jobs.data.length} /> },
  ];

  const openRoles = jobs.data.filter((job) => (job.status || "open") === "open").length;

  return (
    <>
      <Hero stats={stats} developers={profiles.data.length} roles={openRoles} />

      {/* Tech marquee */}
      <section className="border-y border-line bg-bg-elev/30 py-4">
        <Marquee items={TECH_MARQUEE} />
      </section>

      {/* How it works */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="How it works"
          icon={Sparkles}
          title="Three steps from profile to paycheck."
          description="No lengthy onboarding, no CV parsing. Publish once and let opportunities find you."
          align="center"
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card card-hover relative p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-[0_10px_30px_-12px_rgb(99_102_241/0.9)]">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-3xl font-black text-line-strong">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button to="/dashboard" icon={Rocket} size="lg">
            Start my profile — it&rsquo;s free
          </Button>
        </div>
      </section>

      {/* Featured developers */}
      <section className="container-page pb-20">
        <SectionHeading
          eyebrow="Talent"
          icon={Users}
          title="Developers on the hub"
          description="Real profiles stored in Supabase — no placeholders, no invented people."
          action={
            <Button to="/developers" variant="ghost" iconRight={ArrowRight}>
              Browse all developers
            </Button>
          }
        />

        <div className="mt-10">
          {profiles.loading ? (
            <GridSkeleton count={3} />
          ) : profiles.error ? (
            <SetupNotice error={profiles.error} what="Developer profiles" onRetry={profiles.refetch} />
          ) : featuredDevs.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredDevs.map((profile) => (
                <DeveloperCard key={profile.id} profile={profile} featured={profile.featured} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No developer profiles yet"
              description="Be the first to publish a profile. Sign in with Google, complete your details and you'll show up right here."
              action={
                <>
                  <Button to="/dashboard" icon={Rocket}>
                    Create my profile
                  </Button>
                  <Button to="/developers" variant="ghost">
                    Open directory
                  </Button>
                </>
              }
            />
          )}
        </div>
      </section>

      {/* Projects */}
      <section className="container-page pb-20">
        <SectionHeading
          eyebrow="Projects"
          icon={FolderGit2}
          title="Built, shipped and showable."
          description="A portfolio board for work that actually exists — from side projects to production systems."
          action={
            <Button to="/projects" variant="ghost" iconRight={ArrowRight}>
              See all projects
            </Button>
          }
        />

        <div className="mt-10">
          {projects.loading ? (
            <GridSkeleton count={3} />
          ) : projects.error ? (
            <SetupNotice error={projects.error} what="Projects" onRetry={projects.refetch} />
          ) : featuredProjects.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderGit2}
              tone="emerald"
              title="The project board is empty"
              description="Publish your first project — repo link, live URL and a short description. It's the fastest way to prove you can ship."
              action={
                <Button to="/projects" icon={Rocket}>
                  Publish a project
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-bg-elev/30 py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Why this hub"
            icon={Blocks}
            title="Everything a developer needs to get hired."
            description="Auth, database, storage and a UI that looks like a product, not a template."
            align="center"
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card card-hover p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="Hiring board"
          icon={Rocket}
          title="Roles looking for builders right now."
          description="Companies post roles with budget and stack. Developers apply directly — no recruiter in the middle."
          action={
            <Button to="/hiring" variant="ghost" iconRight={ArrowRight}>
              Open hiring board
            </Button>
          }
        />

        <div className="mt-10">
          {jobs.loading ? (
            <GridSkeleton count={3} />
          ) : jobs.error ? (
            <SetupNotice error={jobs.error} what="Job listings" onRetry={jobs.refetch} />
          ) : latestJobs.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latestJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Rocket}
              tone="amber"
              title="No open roles yet"
              description="Hiring? Post a role with your stack and budget — it takes less than a minute and reaches every developer on the hub."
              action={
                <Button to="/hiring" icon={Rocket}>
                  Post a role
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* Promises + CTA */}
      <section className="container-page pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-gradient-to-br from-indigo-600/25 via-fuchsia-600/15 to-cyan-500/20 p-8 sm:p-14">
          <div
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/80">
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                Ready when you are
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Your next client is one profile away.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
                Join {SITE.name}, publish what you&rsquo;ve built and start receiving direct enquiries. Built
                by {SITE.createdBy} for developers who&rsquo;d rather ship than apply.
              </p>

              <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                {PLATFORM_PROMISES.map((promise) => (
                  <div key={promise.title} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <dt className="text-sm font-bold text-white">{promise.title}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-white/70">{promise.text}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                  Build my profile
                </Link>
                <Link to="/about" className="btn btn-ghost btn-lg">
                  About the hub
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Github, label: "Browse the source", value: SITE.repo, href: SITE.repo },
                {
                  icon: Mail,
                  label: "Support",
                  value: SITE.supportEmail,
                  href: `mailto:${SITE.supportEmail}`,
                },
                {
                  icon: MessageCircle,
                  label: "WhatsApp",
                  value: `+${SITE.whatsapp}`,
                  href: `https://wa.me/${SITE.whatsapp}`,
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 transition hover:border-white/35 hover:bg-white/10"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                      {item.label}
                    </span>
                    <span className="block truncate text-sm font-semibold text-white">{item.value}</span>
                  </span>
                </a>
              ))}

              <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 p-4">
                <span className="text-sm font-semibold text-white/85">Spread the word</span>
                <ShareMenu
                  compact
                  title="Programmer's Hub — Find talent. Ship projects. Get hired."
                  text="A developer marketplace: publish real projects, get contacted directly."
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          {pluralize(profiles.data.length, "profile")} · {pluralize(projects.data.length, "project")} ·{" "}
          {pluralize(openRoles, "open role")} — updated live from Supabase.
        </p>
      </section>
    </>
  );
}
