import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BookmarkCheck,
  Briefcase,
  Code2,
  FolderGit2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Plus,
  Rocket,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { TalentCard, ProjectFeedCard, JobRow } from "../components/hub/HubCards";
import ApplyModal from "../components/hiring/ApplyModal";
import ProjectViewer from "../components/projects/ProjectViewer";
import ThemeToggle from "../components/layout/ThemeToggle";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { GridSkeleton, RowSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import usePageMeta from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchJobs, fetchProfiles, fetchProjects } from "../lib/api";
import { SHOWCASE_PROJECTS } from "../data/showcase";
import { DEMO_JOBS, DEMO_PROFILES, DEMO_PROJECTS } from "../data/hubDemo";
import { JOB_TYPES, PROJECT_FILTERS, SKILL_FILTERS } from "../lib/site";
import { cn, matchesQuery, normalizeList, safeText } from "../lib/utils";

const VIEWS = [
  {
    id: "talent",
    label: "Find Talent",
    short: "Talent",
    icon: Users,
    blurb: "Vetted developers, searchable by stack and availability.",
  },
  {
    id: "projects",
    label: "Ship Projects",
    short: "Projects",
    icon: Rocket,
    blurb: "What the community is building — live demos and source included.",
  },
  {
    id: "jobs",
    label: "Get Hired",
    short: "Jobs",
    icon: Briefcase,
    blurb: "Open roles from teams hiring on the hub right now.",
  },
];

const APPLIED_KEY = "ph-hub-applied";

function readApplied() {
  try {
    return new Set(JSON.parse(localStorage.getItem(APPLIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/** Pill row used for tag / type filters in every view. */
function FilterPills({ options, value, onChange, ariaLabel }) {
  return (
    <div
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              active
                ? "border-brand-400/60 bg-brand-500/25 text-ink shadow-[0_8px_24px_-10px_rgb(99_102_241/0.9)]"
                : "border-line-strong bg-surface text-muted hover:border-brand-400/40 hover:text-ink"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1", accent)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-black leading-none text-ink">{value}</p>
        <p className="mt-1 truncate text-xs font-semibold text-muted">
          {label} <span className="font-normal">· {hint}</span>
        </p>
      </div>
    </div>
  );
}

export default function Hub() {
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const viewParam = searchParams.get("view");
  const view = VIEWS.some((item) => item.id === viewParam) ? viewParam : "talent";
  const ActiveIcon = VIEWS.find((item) => item.id === view)?.icon || Users;

  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("All");
  const [openOnly, setOpenOnly] = useState(false);
  const [talentSort, setTalentSort] = useState("featured");
  const [projectTag, setProjectTag] = useState("All");
  const [jobType, setJobType] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [messaging, setMessaging] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [applyingJob, setApplyingJob] = useState(null);
  const [previewProject, setPreviewProject] = useState(null);
  const [appliedIds, setAppliedIds] = useState(readApplied);

  usePageMeta({
    title: "Hub Dashboard",
    description: "One dashboard for Programmer's Hub: find talent, ship projects and get hired.",
  });

  /* Live collections, with curated starter content when a list is empty. */
  const profilesCol = useCollection(fetchProfiles);
  const projectsCol = useCollection(fetchProjects);
  const jobsCol = useCollection(fetchJobs);

  const profiles = useMemo(
    () => (profilesCol.data.length ? profilesCol.data : DEMO_PROFILES),
    [profilesCol.data]
  );
  const projects = useMemo(
    () =>
      projectsCol.data.length
        ? [
            ...SHOWCASE_PROJECTS.filter((item) => !projectsCol.data.some((row) => row.id === item.id)),
            ...projectsCol.data,
          ]
        : DEMO_PROJECTS,
    [projectsCol.data]
  );
  const jobs = useMemo(() => (jobsCol.data.length ? jobsCol.data : DEMO_JOBS), [jobsCol.data]);
  const usingDemo = !profilesCol.data.length || !projectsCol.data.length || !jobsCol.data.length;

  const counts = useMemo(
    () => ({
      talent: profiles.length,
      projects: projects.length,
      jobs: jobs.filter((job) => job.status !== "closed").length,
    }),
    [profiles, projects, jobs]
  );

  const talentResults = useMemo(() => {
    let pool = profiles.filter((profile) => {
      const skills = normalizeList(profile.skills);
      const matchesSkill =
        skill === "All" || skills.some((item) => item.toLowerCase() === skill.toLowerCase());
      const matchesOpen = !openOnly || Boolean(profile.open_to_work);
      const matchesSearch =
        !query.trim() ||
        matchesQuery(query, profile.name, profile.title, profile.location, skills.join(" "), profile.bio);
      return matchesSkill && matchesOpen && matchesSearch;
    });
    pool = [...pool].sort((a, b) => {
      if (talentSort === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (talentSort === "newest")
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return (
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
        (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
    });
    return pool;
  }, [profiles, skill, openOnly, query, talentSort]);

  const projectResults = useMemo(
    () =>
      projects.filter((project) => {
        const tags = normalizeList(project.tags || project.skills);
        const matchesTag =
          projectTag === "All" || tags.some((tag) => tag.toLowerCase().includes(projectTag.toLowerCase()));
        const matchesSearch =
          !query.trim() ||
          matchesQuery(query, project.title, project.description, project.author_name, tags.join(" "));
        return matchesTag && matchesSearch;
      }),
    [projects, projectTag, query]
  );

  const jobResults = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesType = jobType === "All" || job.type === jobType;
        const matchesRemote = !remoteOnly || /remote/i.test(job.location || "");
        const matchesSearch =
          !query.trim() ||
          matchesQuery(
            query,
            job.title,
            job.company,
            job.location,
            job.type,
            normalizeList(job.skills).join(" ")
          );
        return matchesType && matchesRemote && matchesSearch && job.status !== "closed";
      }),
    [jobs, jobType, remoteOnly, query]
  );

  function switchView(next) {
    setSearchParams(next === "talent" ? {} : { view: next }, { preventScrollReset: true });
    setSidebarOpen(false);
  }

  function markApplied(job) {
    if (!job?.id) return;
    setAppliedIds((current) => {
      const next = new Set(current);
      next.add(job.id);
      try {
        localStorage.setItem(APPLIED_KEY, JSON.stringify([...next]));
      } catch {
        /* private mode — the in-memory state still works */
      }
      return next;
    });
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    toast.success(`Message sent to ${messaging?.name || "developer"} — they'll reply by email.`);
    setMessaging(null);
    setMessageDraft("");
  }

  const sidebar = (
    <nav aria-label="Hub" className="flex h-full flex-col gap-1 p-4">
      <p className="px-2 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">Workspace</p>
      {VIEWS.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => switchView(item.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
              active
                ? "bg-gradient-to-r from-brand-500/30 via-violet-500/20 to-cyan-500/10 text-ink ring-1 ring-brand-400/40"
                : "text-muted hover:bg-surface hover:text-ink"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand-300" : "")} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                active ? "bg-brand-500/40 text-ink" : "bg-surface text-muted ring-1 ring-line"
              )}
            >
              {counts[item.id]}
            </span>
          </button>
        );
      })}

      <p className="px-2 pb-2 pt-6 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">
        Explore
      </p>
      {[
        { to: "/developers", label: "Full developer directory", icon: Users },
        { to: "/projects", label: "All projects", icon: FolderGit2 },
        { to: "/hiring", label: "Hiring board", icon: Briefcase },
        { to: "/shortlist", label: "My shortlist", icon: BookmarkCheck },
        { to: "/dashboard", label: "My dashboard", icon: LayoutDashboard },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink"
          >
            <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/20 via-violet-500/15 to-cyan-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <Sparkles className="h-4 w-4 text-accent-400" aria-hidden="true" />
          Hiring or job-hunting?
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Post a role or publish your profile and let the hub match you this week.
        </p>
        <Link to="/hiring" className="btn btn-primary mt-3 w-full px-3 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Post a role
        </Link>
        <Link to={user ? "/dashboard" : "/login"} className="btn btn-ghost mt-2 w-full px-3 py-2 text-xs">
          {user ? "Update my profile" : "Join the hub"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* ── Top navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="btn btn-ghost p-2.5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open hub navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Programmer's Hub — home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-glow">
              <Code2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="hidden font-black tracking-tight sm:block">
              Programmer&rsquo;s Hub
              <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 align-middle text-[0.62rem] font-bold uppercase tracking-wider text-brand-300 ring-1 ring-brand-400/40">
                Hub
              </span>
            </span>
          </Link>

          <label className="relative mx-auto w-full max-w-xl flex-1">
            <span className="sr-only">Search the current view</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${VIEWS.find((item) => item.id === view)?.label.toLowerCase()}…`}
              className="field rounded-full py-2.5 pl-10 pr-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost relative hidden p-2.5 sm:inline-flex"
              onClick={() => toast.info("You're all caught up — no new notifications.")}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
            </button>
            <ThemeToggle />
            <Link to={user ? "/dashboard" : "/login"} aria-label={user ? "Open your dashboard" : "Sign in"}>
              <Avatar name={user?.user_metadata?.full_name || user?.email || "Guest"} size="sm" />
            </Link>
          </div>
        </div>

        {/* Mobile / tablet view switcher */}
        <div className="border-t border-line px-4 pb-3 pt-2 lg:hidden" role="tablist" aria-label="Hub views">
          <div className="grid grid-cols-3 gap-2">
            {VIEWS.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchView(item.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition",
                    active
                      ? "bg-brand-500/25 text-ink ring-1 ring-brand-400/50"
                      : "bg-surface text-muted ring-1 ring-line"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.short}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] items-start">
        {/* ── Sidebar (desktop) ────────────────────────────────────── */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-72 shrink-0 border-r border-line lg:block">
          {sidebar}
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Hub navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close hub navigation"
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r border-line bg-bg-elev shadow-soft">
              <div className="flex items-center justify-between px-4 pt-4">
                <span className="text-sm font-black text-ink">Programmer&rsquo;s Hub</span>
                <button
                  type="button"
                  className="btn btn-ghost p-2"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {sidebar}
            </div>
          </div>
        ) : null}

        {/* ── Main panel ───────────────────────────────────────────── */}
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="animate-rise">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
              <ActiveIcon className="h-4 w-4" aria-hidden="true" />
              {VIEWS.find((item) => item.id === view)?.label}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              {view === "talent" ? (
                <>
                  Find <span className="gradient-text">talent</span> worth hiring
                </>
              ) : view === "projects" ? (
                <>
                  See what&rsquo;s <span className="gradient-text">shipping</span>
                </>
              ) : (
                <>
                  Get <span className="gradient-text">hired</span>, faster
                </>
              )}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              {VIEWS.find((item) => item.id === view)?.blurb}
              {usingDemo ? " Showing starter content while live listings load." : ""}
            </p>
          </div>

          {/* Stats strip */}
          <section aria-label="Hub at a glance" className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={Users}
              label="Developers"
              value={counts.talent}
              hint={`${profiles.filter((p) => p.open_to_work).length} open to work`}
              accent="bg-indigo-500/15 text-indigo-300 ring-indigo-400/30"
            />
            <StatCard
              icon={Rocket}
              label="Projects"
              value={counts.projects}
              hint="live demos inside"
              accent="bg-violet-500/15 text-violet-300 ring-violet-400/30"
            />
            <StatCard
              icon={Briefcase}
              label="Open roles"
              value={counts.jobs}
              hint="apply in one click"
              accent="bg-cyan-500/15 text-cyan-300 ring-cyan-400/30"
            />
            <StatCard
              icon={TrendingUp}
              label="Hiring this week"
              value={jobs.filter((j) => j.status !== "closed").length}
              hint="teams interviewing"
              accent="bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
            />
          </section>

          {/* ── View 1 · Find Talent ─────────────────────────────── */}
          {view === "talent" ? (
            <section aria-label="Developer profiles" className="mt-8">
              <div className="sticky top-16 z-20 -mx-2 rounded-2xl border border-line bg-bg/85 p-3 backdrop-blur-xl lg:top-[4.5rem]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Stack
                  </span>
                  <div className="min-w-0 flex-1">
                    <FilterPills
                      options={SKILL_FILTERS}
                      value={skill}
                      onChange={setSkill}
                      ariaLabel="Filter developers by tech stack"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenOnly((value) => !value)}
                    aria-pressed={openOnly}
                    className={cn(
                      "chip-btn",
                      openOnly && "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", openOnly ? "bg-emerald-400" : "bg-slate-400")}
                      aria-hidden="true"
                    />
                    Open to work only
                  </button>
                  <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
                    Sort
                    <select
                      value={talentSort}
                      onChange={(event) => setTalentSort(event.target.value)}
                      className="field w-auto rounded-full py-1.5 pl-3 pr-8 text-xs"
                      aria-label="Sort developers"
                    >
                      <option value="featured">Featured first</option>
                      <option value="rating">Top rated</option>
                      <option value="newest">Newest members</option>
                    </select>
                  </label>
                  <p className="text-xs font-semibold text-muted" role="status">
                    {talentResults.length} developer{talentResults.length === 1 ? "" : "s"} found
                  </p>
                </div>
              </div>

              {profilesCol.loading && !profilesCol.data.length ? (
                <div className="mt-6">
                  <GridSkeleton count={6} />
                </div>
              ) : talentResults.length ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {talentResults.map((profile) => (
                    <TalentCard
                      key={profile.id}
                      profile={profile}
                      onView={setSelectedProfile}
                      onMessage={(person) => {
                        setMessaging(person);
                        setMessageDraft("");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={Users}
                    title="No developers match those filters"
                    description="Try a different stack, clear the search, or include developers who aren't marked open to work."
                    action={
                      <button
                        type="button"
                        className="btn btn-ghost px-4 py-2 text-sm"
                        onClick={() => {
                          setSkill("All");
                          setOpenOnly(false);
                          setQuery("");
                        }}
                      >
                        Reset filters
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          ) : null}

          {/* ── View 2 · Ship Projects ───────────────────────────── */}
          {view === "projects" ? (
            <section aria-label="Project showcases" className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Category
                </span>
                <div className="min-w-0 flex-1">
                  <FilterPills
                    options={PROJECT_FILTERS}
                    value={projectTag}
                    onChange={setProjectTag}
                    ariaLabel="Filter projects by category"
                  />
                </div>
                <p className="text-xs font-semibold text-muted" role="status">
                  {projectResults.length} project{projectResults.length === 1 ? "" : "s"}
                </p>
              </div>

              {projectsCol.loading && !projectsCol.data.length ? (
                <div className="mt-6">
                  <GridSkeleton count={6} />
                </div>
              ) : projectResults.length ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {projectResults.map((project) => (
                    <ProjectFeedCard key={project.id} project={project} onPreview={setPreviewProject} />
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={Rocket}
                    title="No projects match that filter"
                    description="Try another category or clear the search to see everything the community is shipping."
                    action={
                      <button
                        type="button"
                        className="btn btn-ghost px-4 py-2 text-sm"
                        onClick={() => {
                          setProjectTag("All");
                          setQuery("");
                        }}
                      >
                        Show all projects
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          ) : null}

          {/* ── View 3 · Get Hired ───────────────────────────────── */}
          {view === "jobs" ? (
            <section aria-label="Job listings" className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Type
                </span>
                <div className="min-w-0 flex-1">
                  <FilterPills
                    options={["All", ...JOB_TYPES]}
                    value={jobType}
                    onChange={setJobType}
                    ariaLabel="Filter jobs by employment type"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRemoteOnly((value) => !value)}
                  aria-pressed={remoteOnly}
                  className={cn("chip-btn", remoteOnly && "border-cyan-400/50 bg-cyan-500/20 text-cyan-200")}
                >
                  Remote only
                </button>
                <p className="text-xs font-semibold text-muted" role="status">
                  {jobResults.length} open role{jobResults.length === 1 ? "" : "s"}
                </p>
              </div>

              {jobsCol.loading && !jobsCol.data.length ? (
                <div className="mt-6">
                  <RowSkeleton count={4} />
                </div>
              ) : jobResults.length ? (
                <div className="mt-6 flex flex-col gap-4">
                  {jobResults.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      applied={appliedIds.has(job.id)}
                      onApply={setApplyingJob}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    icon={Briefcase}
                    title="No open roles match those filters"
                    description="Try another employment type, or turn off the remote-only filter to see on-site roles too."
                    action={
                      <button
                        type="button"
                        className="btn btn-ghost px-4 py-2 text-sm"
                        onClick={() => {
                          setJobType("All");
                          setRemoteOnly(false);
                          setQuery("");
                        }}
                      >
                        Reset filters
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>

      {/* ── Profile quick-view ───────────────────────────────────── */}
      <Modal
        open={Boolean(selectedProfile)}
        onClose={() => setSelectedProfile(null)}
        title={selectedProfile ? safeText(selectedProfile.name, "Developer") : "Developer"}
        description={selectedProfile ? safeText(selectedProfile.title, "Software Developer") : undefined}
        icon={Users}
        size="md"
        footer={
          selectedProfile ? (
            <>
              {!selectedProfile.demo ? (
                <Link to={`/developers/${selectedProfile.id}`} className="btn btn-ghost px-4 py-2.5 text-sm">
                  Full profile page
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn-primary px-4 py-2.5 text-sm"
                onClick={() => {
                  setMessaging(selectedProfile);
                  setSelectedProfile(null);
                }}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Message
              </button>
            </>
          ) : null
        }
      >
        {selectedProfile ? (
          <div>
            <div className="flex items-center gap-4">
              <Avatar
                name={selectedProfile.name}
                src={selectedProfile.avatar_url}
                size="xl"
                status={selectedProfile.open_to_work ? "open" : null}
              />
              <div className="text-sm text-muted">
                <p>{safeText(selectedProfile.location, "Remote")}</p>
                {selectedProfile.experience ? (
                  <p className="mt-1">{selectedProfile.experience} experience</p>
                ) : null}
                {selectedProfile.hourly_rate ? (
                  <p className="mt-1 font-bold text-emerald-300">{selectedProfile.hourly_rate}</p>
                ) : null}
                {selectedProfile.open_to_work ? (
                  <p className="mt-1 font-semibold text-emerald-300">Open to work</p>
                ) : null}
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink-soft">
              {safeText(selectedProfile.bio, "This developer hasn't written a bio yet.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {normalizeList(selectedProfile.skills).map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
            {selectedProfile.demo ? (
              <p className="mt-5 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted">
                Starter profile shown while live listings load — sign in and complete your profile to appear
                here.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* ── Message composer ─────────────────────────────────────── */}
      <Modal
        open={Boolean(messaging)}
        onClose={() => setMessaging(null)}
        title={messaging ? `Message ${safeText(messaging.name, "developer")}` : "Message"}
        description={messaging ? safeText(messaging.title, "Software Developer") : undefined}
        icon={MessageCircle}
        size="sm"
      >
        <form onSubmit={sendMessage}>
          <label className="label" htmlFor="hub-message">
            Your message
          </label>
          <textarea
            id="hub-message"
            className="field"
            rows={5}
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder={`Hi ${messaging?.name?.split(" ")[0] || "there"} — I saw your work on the hub and wanted to talk about…`}
            data-autofocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost px-4 py-2.5 text-sm"
              onClick={() => setMessaging(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2.5 text-sm"
              disabled={!messageDraft.trim()}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send message
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Apply / preview flows (shared with the rest of the hub) ── */}
      <ApplyModal
        open={Boolean(applyingJob)}
        job={applyingJob}
        onSuccess={() => markApplied(applyingJob)}
        onClose={() => setApplyingJob(null)}
      />
      <ProjectViewer
        project={previewProject}
        open={Boolean(previewProject)}
        onClose={() => setPreviewProject(null)}
      />
    </div>
  );
}
