import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  FolderGit2,
  Globe,
  ImagePlus,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PencilRuler,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Toggle from "../components/ui/Toggle";
import ProjectCard from "../components/cards/ProjectCard";
import JobCard from "../components/cards/JobCard";
import GoogleButton from "../components/auth/GoogleButton";
import ProjectFormModal from "../components/projects/ProjectFormModal";
import JobFormModal from "../components/hiring/JobFormModal";
import { PageLoader } from "../components/ui/Skeletons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useCollection from "../hooks/useCollection";
import usePageMeta from "../hooks/usePageMeta";
import {
  deleteApplication,
  deleteJob,
  deleteProject,
  fetchApplications,
  fetchJobs,
  fetchProjects,
  updateJob,
  uploadAvatar,
} from "../lib/api";
import { SITE } from "../lib/site";
import {
  cn,
  completionOf,
  copyToClipboard,
  downloadFile,
  friendlyError,
  normalizeList,
  pluralize,
  timeAgo,
  toCsv,
  toTagsInput,
  truncate,
  waLink,
} from "../lib/utils";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "projects", label: "My projects", icon: FolderGit2 },
  { id: "roles", label: "My roles", icon: Briefcase },
  { id: "applications", label: "Applications", icon: Inbox },
];

/** Profile checklist: key → label shown in the completeness panel. */
const COMPLETION_FIELDS = {
  name: "Your name",
  title: "A headline",
  location: "Location",
  bio: "A short bio",
  skills: "At least one skill",
  hourly_rate: "Rate or salary expectation",
  experience: "Years of experience",
  github: "GitHub profile",
  whatsapp: "WhatsApp number",
  website: "Portfolio or website",
};

const TOTAL_SLOTS = 10;

export default function Dashboard() {
  const { loading, isAuthenticated, user, profile, displayName, avatarUrl, updateProfile, profileLoading } =
    useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");

  usePageMeta({
    title: "Dashboard",
    description: "Manage your developer profile, projects, hiring roles and applications.",
    noIndex: true,
  });

  const projects = useCollection(fetchProjects);
  const jobs = useCollection(fetchJobs);

  const myProjects = useMemo(
    () => projects.data.filter((project) => project.user_id === user?.id),
    [projects.data, user?.id]
  );
  const myJobs = useMemo(
    () => jobs.data.filter((job) => job.user_id === user?.id),
    [jobs.data, user?.id]
  );
  const myJobIds = useMemo(() => myJobs.map((job) => job.id), [myJobs]);
  const jobIdsKey = myJobIds.join(",");

  const applications = useCollection(
    () => (myJobIds.length ? fetchApplications({ jobIds: myJobIds }) : Promise.resolve({ data: [], error: null })),
    [jobIdsKey]
  );

  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState("all");

  useEffect(() => {
    setForm({
      name: profile?.name ?? displayName ?? "",
      title: profile?.title ?? "",
      location: profile?.location ?? "",
      bio: profile?.bio ?? "",
      skills: toTagsInput(profile?.skills),
      hourly_rate: profile?.hourly_rate ?? "",
      experience: profile?.experience ?? "",
      github: profile?.github ?? "",
      linkedin: profile?.linkedin ?? "",
      website: profile?.website ?? "",
      whatsapp: profile?.whatsapp ?? "",
      email: profile?.email ?? user?.email ?? "",
      avatar_url: profile?.avatar_url ?? "",
      open_to_work: profile?.open_to_work ?? true,
    });
  }, [profile, displayName, user?.email]);

  const missing = useMemo(
    () => Object.entries(COMPLETION_FIELDS).filter(([key]) => !String(form[key] ?? "").trim()),
    [form]
  );
  const completion = completionOf(form, Object.keys(COMPLETION_FIELDS));

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (!isAuthenticated) return;
    if (!form.name?.trim()) {
      toast.warning("Add your name before saving.");
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      name: form.name.trim(),
      title: form.title?.trim() || null,
      location: form.location?.trim() || null,
      bio: form.bio?.trim() || null,
      skills: normalizeList(form.skills),
      hourly_rate: form.hourly_rate?.trim() || null,
      experience: form.experience?.trim() || null,
      github: form.github?.trim() || null,
      linkedin: form.linkedin?.trim() || null,
      website: form.website?.trim() || null,
      whatsapp: form.whatsapp?.trim() || null,
      email: form.email?.trim() || user?.email || null,
      avatar_url: form.avatar_url || null,
      open_to_work: Boolean(form.open_to_work),
    });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "Could not save your profile."));
      return;
    }
    toast.success("Profile saved. You're live on the hub.");
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.warning("That file isn't an image. Try a JPEG, PNG or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("That image is larger than 2 MB. Try a smaller file.");
      return;
    }
    setUploading(true);
    const { url, error } = await uploadAvatar(user.id, file);
    setUploading(false);
    if (error || !url) {
      toast.error(friendlyError(error, "Upload failed. Create a public storage bucket named 'avatars' in Supabase."));
      return;
    }
    update("avatar_url", url);
    await updateProfile({ avatar_url: url });
    toast.success("Avatar updated.");
  }

  async function copyProfileLink() {
    const url = `${window.location.origin}/developers/${profile?.id || user?.id}`;
    const ok = await copyToClipboard(url);
    setCopied(ok);
    if (ok) {
      toast.success("Public profile link copied.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the link.");
    }
  }

  async function handleDeleteProject(project) {
    setDeletingId(project.id);
    const { error } = await deleteProject(project.id);
    setDeletingId(null);
    if (error) {
      toast.error(friendlyError(error, "Could not delete that project."));
      return;
    }
    toast.success("Project removed.");
    projects.refetch();
  }

  async function handleDeleteJob(job) {
    setDeletingId(job.id);
    const { error } = await deleteJob(job.id);
    setDeletingId(null);
    if (error) {
      toast.error(friendlyError(error, "Could not delete that role."));
      return;
    }
    toast.success("Role removed.");
    jobs.refetch();
  }

  async function toggleJobStatus(job) {
    const next = (job.status || "open") === "open" ? "closed" : "open";
    const { error } = await updateJob(job.id, { status: next });
    if (error) {
      toast.error(friendlyError(error, "Could not update the role."));
      return;
    }
    toast.success(next === "open" ? "Role reopened." : "Role closed — no new applications.");
    jobs.refetch();
  }

  async function handleDeleteApplication(application) {
    setDeletingId(application.id);
    const { error } = await deleteApplication(application.id);
    setDeletingId(null);
    if (error) {
      toast.error(friendlyError(error, "Could not remove that application."));
      return;
    }
    toast.info("Application removed.");
    applications.refetch();
  }

  function exportApplications() {
    if (!applications.data.length) return;
    const csv = toCsv(applications.data, [
      { key: "created_at", label: "Received", value: (row) => new Date(row.created_at).toISOString().slice(0, 10) },
      { key: "job", label: "Role", value: (row) => myJobs.find((job) => job.id === row.job_id)?.title || "—" },
      { key: "applicant_name", label: "Name" },
      { key: "applicant_email", label: "Email" },
      { key: "portfolio_url", label: "Portfolio" },
      { key: "message", label: "Message" },
    ]);
    const ok = downloadFile(`applications-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    if (ok) toast.success("Applications exported as CSV.");
    else toast.error("Export failed in this browser.");
  }

  if (loading) return <PageLoader label="Checking your session…" />;

  /* ---------------- Signed-out gate ---------------- */
  if (!isAuthenticated) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={UserRound}
            level={1}
            title="Sign in to open your dashboard"
            description="Your dashboard is where you build your public developer profile, publish projects and post hiring roles. Sign in with Google — it takes one tap."
            action={
              <>
                <GoogleButton redirectTo={`${window.location.origin}/dashboard`} />
                <Link to="/login" className="btn btn-ghost">
                  Use email instead
                </Link>
              </>
            }
          />
          <p className="mt-6 text-center text-xs text-muted">
            Trouble signing in? Email{" "}
            <a href={`mailto:${SITE.supportEmail}`} className="font-semibold text-brand-300 hover:underline">
              {SITE.supportEmail}
            </a>
          </p>
        </div>
      </div>
    );
  }

  const unreadish = applications.data.filter(
    (application) => Date.now() - new Date(application.created_at).getTime() < 7 * 86400000
  ).length;

  const visibleApplications =
    applicationFilter === "all"
      ? applications.data
      : applications.data.filter((application) => application.job_id === applicationFilter);

  /* ---------------- Signed-in dashboard ---------------- */
  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Dashboard"
        icon={PencilRuler}
        breadcrumbs={[{ label: "Dashboard" }]}
        title={`Welcome back, ${displayName || "developer"}`}
        description="Everything you publish here is public. Keep it sharp — it's what clients see before they message you."
      >
        {profile?.id ? (
          <Button to={`/developers/${profile.id}`} variant="ghost" icon={Eye}>
            View public profile
          </Button>
        ) : null}
        <Button variant="ghost" icon={copied ? Check : Copy} onClick={copyProfileLink}>
          Copy profile link
        </Button>
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Save profile
        </Button>
      </PageHeading>

      {/* Summary */}
      <section className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="relative self-start">
            <Avatar name={form.name || displayName} src={form.avatar_url || avatarUrl} size="xl" />
            <label
              className={cn(
                "absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-line-strong bg-surface-solid text-brand-300 shadow-soft transition hover:border-brand-400/60",
                uploading && "pointer-events-none opacity-60"
              )}
              title="Upload avatar"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    aria-label="Upload avatar"
                  />
                </>
              )}
            </label>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-ink">{form.name || "Your name"}</h2>
            <p className="truncate text-sm font-semibold text-brand-300">
              {form.title || "Add a headline, e.g. Full-stack React engineer"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {form.location || "Add your location"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.open_to_work ? (
                <Badge tone="emerald" icon={Briefcase}>
                  Open to work
                </Badge>
              ) : (
                <Badge tone="slate">Not looking</Badge>
              )}
              {profile?.verified ? (
                <Badge tone="cyan" icon={CheckCircle2}>
                  Verified
                </Badge>
              ) : null}
              {profileLoading ? <Badge tone="slate">Syncing…</Badge> : null}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Profile strength</h3>
            <span className="text-sm font-black text-brand-300">{completion}%</span>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          {missing.length ? (
            <ul className="mt-4 space-y-1.5 text-xs text-muted">
              {missing.slice(0, 4).map(([key, label]) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  {label}
                </li>
              ))}
              {missing.length > 4 ? <li className="pl-3.5">+{missing.length - 4} more</li> : null}
            </ul>
          ) : (
            <p className="mt-4 text-xs font-semibold text-emerald-300">
              ✓ Everything filled in — you&rsquo;re in the top tier of profiles.
            </p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xl font-black text-ink">{myProjects.length}</p>
              <p className="text-[0.66rem] uppercase tracking-wider text-muted">Projects</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xl font-black text-ink">{myJobs.length}</p>
              <p className="text-[0.66rem] uppercase tracking-wider text-muted">Roles</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xl font-black text-ink">{applications.data.length}</p>
              <p className="text-[0.66rem] uppercase tracking-wider text-muted">Applications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-10 flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-1.5" role="tablist" aria-label="Dashboard sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              tab === item.id
                ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                : "text-muted hover:text-ink"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.split(" ").pop()}</span>
            {item.id === "applications" && applications.data.length ? (
              <span className="rounded-full bg-white/20 px-1.5 text-[0.66rem] font-bold">{applications.data.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" ? (
        <form onSubmit={handleSave} className="mt-6 grid gap-5">
          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <UserRound className="h-4 w-4 text-brand-300" aria-hidden="true" />
              The basics
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                required
                value={form.name || ""}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Luwangula Alpha"
                autoComplete="name"
              />
              <Field
                label="Headline"
                value={form.title || ""}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Full-stack engineer"
              />
              <Field
                label="Location"
                value={form.location || ""}
                onChange={(event) => update("location", event.target.value)}
                placeholder="Kampala, Uganda"
              />
              <Field
                label="Experience"
                value={form.experience || ""}
                onChange={(event) => update("experience", event.target.value)}
                placeholder="3+ years"
              />
              <Field
                label="Rate"
                hint="hourly or monthly"
                value={form.hourly_rate || ""}
                onChange={(event) => update("hourly_rate", event.target.value)}
                placeholder="$25 / hour"
              />
              <Field
                label="Skills"
                hint="comma separated"
                value={form.skills || ""}
                onChange={(event) => update("skills", event.target.value)}
                placeholder="React, Node.js, Supabase"
              />
            </div>

            <div className="mt-5">
              <Field
                as="textarea"
                label="Bio"
                hint={`2–3 sentences · ${(form.bio || "").length}/600`}
                value={form.bio || ""}
                onChange={(event) => update("bio", event.target.value)}
                placeholder="I build fast, accessible web apps for African startups…"
                maxLength={600}
              />
            </div>

            <Toggle
              className="mt-5"
              checked={form.open_to_work}
              onChange={(checked) => update("open_to_work", checked)}
              label="Open to work"
              description="Shows an availability badge on your card and profile."
              tone="emerald"
            />
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <MessageCircle className="h-4 w-4 text-brand-300" aria-hidden="true" />
              How clients reach you
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                type="email"
                value={form.email || ""}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
              />
              <Field
                label="WhatsApp"
                hint="digits only, with country code"
                value={form.whatsapp || ""}
                onChange={(event) => update("whatsapp", event.target.value)}
                placeholder="256700000000"
                inputMode="tel"
              />
            </div>
            {form.whatsapp ? (
              <a
                href={waLink(form.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Test your WhatsApp link
              </a>
            ) : null}
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <Globe className="h-4 w-4 text-brand-300" aria-hidden="true" />
              Links
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field
                label="GitHub"
                value={form.github || ""}
                onChange={(event) => update("github", event.target.value)}
                placeholder="github.com/you"
              />
              <Field
                label="LinkedIn"
                value={form.linkedin || ""}
                onChange={(event) => update("linkedin", event.target.value)}
                placeholder="linkedin.com/in/you"
              />
              <Field
                label="Website"
                value={form.website || ""}
                onChange={(event) => update("website", event.target.value)}
                placeholder="yoursite.dev"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" icon={Save} loading={saving}>
              Save profile
            </Button>
            {profile?.id ? (
              <Button to={`/developers/${profile.id}`} variant="ghost" icon={Eye}>
                Preview public profile
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* Projects tab */}
      {tab === "projects" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">Projects you&rsquo;ve published</h2>
            <Button
              icon={Plus}
              onClick={() => {
                setEditingProject(null);
                setProjectFormOpen(true);
              }}
            >
              Add project
            </Button>
          </div>

          <div className="mt-6">
            {projects.loading ? (
              <p className="text-sm text-muted">Loading your projects…</p>
            ) : myProjects.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {myProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onDelete={handleDeleteProject}
                    onEdit={(item) => {
                      setEditingProject(item);
                      setProjectFormOpen(true);
                    }}
                    deleting={deletingId === project.id}
                    tagLink={false}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderGit2}
                tone="emerald"
                title="No projects yet"
                description="Publish shipped work with a repo link — it's the strongest proof on your profile."
                action={
                  <Button
                    icon={Plus}
                    onClick={() => {
                      setEditingProject(null);
                      setProjectFormOpen(true);
                    }}
                  >
                    Publish a project
                  </Button>
                }
              />
            )}
          </div>
        </section>
      ) : null}

      {/* Roles tab */}
      {tab === "roles" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">Roles you&rsquo;ve posted</h2>
            <Button
              icon={Plus}
              onClick={() => {
                setEditingJob(null);
                setJobFormOpen(true);
              }}
            >
              Post a role
            </Button>
          </div>

          <div className="mt-6">
            {jobs.loading ? (
              <p className="text-sm text-muted">Loading your roles…</p>
            ) : myJobs.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {myJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    applications={applications.data.filter((application) => application.job_id === job.id).length}
                    onEdit={(item) => {
                      setEditingJob(item);
                      setJobFormOpen(true);
                    }}
                    onDelete={handleDeleteJob}
                    deleting={deletingId === job.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                tone="amber"
                title="No roles posted"
                description="Hiring? Post a role with your stack and budget — developers on the hub can apply immediately."
                action={
                  <Button
                    icon={Plus}
                    onClick={() => {
                      setEditingJob(null);
                      setJobFormOpen(true);
                    }}
                  >
                    Post a role
                  </Button>
                }
              />
            )}
          </div>

          {myJobs.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {myJobs.map((job) => (
                <Button
                  key={job.id}
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleJobStatus(job)}
                  icon={(job.status || "open") === "open" ? CheckCircle2 : RefreshCw}
                >
                  {(job.status || "open") === "open" ? "Close" : "Reopen"} “{truncate(job.title, 24)}”
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Applications tab */}
      {tab === "applications" ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Applications received</h2>
              <p className="mt-1 text-sm text-muted">
                {applications.loading
                  ? "Loading applications…"
                  : applications.data.length
                    ? `${pluralize(applications.data.length, "application")}${unreadish ? ` · ${unreadish} from the last week` : ""}`
                    : "Applications to your roles land here."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {applications.data.length ? (
                <>
                  <Button variant="ghost" icon={FileText} onClick={exportApplications}>
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    icon={RefreshCw}
                    // Keep the current list on screen while the newest
                    // applications load in.
                    onClick={() => applications.refresh({ silent: true })}
                  >
                    Refresh
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {myJobs.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setApplicationFilter("all")}
                aria-pressed={applicationFilter === "all"}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  applicationFilter === "all"
                    ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                    : "border-line-strong bg-surface text-muted hover:text-ink"
                )}
              >
                All roles ({applications.data.length})
              </button>
              {myJobs.map((job) => {
                const count = applications.data.filter((application) => application.job_id === job.id).length;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setApplicationFilter(job.id)}
                    aria-pressed={applicationFilter === job.id}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                      applicationFilter === job.id
                        ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                        : "border-line-strong bg-surface text-muted hover:text-ink"
                    )}
                  >
                    {truncate(job.title, 28)} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-6">
            {applications.loading ? (
              <p className="text-sm text-muted">Loading applications…</p>
            ) : applications.error ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/8 p-5 text-sm text-amber-100">
                Could not load applications: {friendlyError(applications.error)}
                <Button size="sm" variant="ghost" icon={RefreshCw} onClick={applications.refetch} className="ml-3">
                  Retry
                </Button>
              </div>
            ) : visibleApplications.length ? (
              <ul className="space-y-3">
                {visibleApplications.map((application) => {
                  const job = myJobs.find((item) => item.id === application.job_id);
                  return (
                    <li key={application.id} className="card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <Avatar name={application.applicant_name} size="md" />
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-ink">
                              {application.applicant_name || "Anonymous applicant"}
                            </h3>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                              {application.applicant_email ? (
                                <a
                                  href={`mailto:${application.applicant_email}?subject=${encodeURIComponent(`Re: ${job?.title || "your application"}`)}`}
                                  className="inline-flex items-center gap-1.5 hover:text-brand-300"
                                >
                                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                  {application.applicant_email}
                                </a>
                              ) : null}
                              {application.portfolio_url ? (
                                <a
                                  href={application.portfolio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 hover:text-brand-300"
                                >
                                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                                  Portfolio
                                </a>
                              ) : null}
                              <span className="inline-flex items-center gap-1.5">
                                <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                                {job ? `for ${truncate(job.title, 40)}` : "role removed"}
                              </span>
                              <span>{timeAgo(application.created_at)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {application.applicant_email ? (
                            <Button
                              size="sm"
                              icon={Mail}
                              href={`mailto:${application.applicant_email}?subject=${encodeURIComponent(`Re: ${job?.title || "your application"}`)}`}
                            >
                              Reply
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Copy}
                            onClick={async () => {
                              const ok = await copyToClipboard(
                                `${application.applicant_name} <${application.applicant_email || "no email"}>`
                              );
                              if (ok) toast.success("Applicant details copied.");
                            }}
                          >
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            className="text-rose-300"
                            onClick={() => handleDeleteApplication(application)}
                            disabled={deletingId === application.id}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <p className="mt-4 whitespace-pre-line rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-soft">
                        {application.message}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Inbox}
                title={myJobs.length ? "No applications yet" : "You haven't posted a role"}
                description={
                  myJobs.length
                    ? "Applications appear here the moment a developer applies to one of your roles — with their note and portfolio link."
                    : "Post a role on the hiring board and applications will show up here, only visible to you."
                }
                action={
                  myJobs.length ? (
                    <Button to="/hiring" variant="ghost">
                      View the hiring board
                    </Button>
                  ) : (
                    <Button
                      icon={Plus}
                      onClick={() => {
                        setEditingJob(null);
                        setJobFormOpen(true);
                      }}
                    >
                      Post a role
                    </Button>
                  )
                }
              />
            )}
          </div>
        </section>
      ) : null}

      <ProjectFormModal
        open={projectFormOpen}
        project={editingProject}
        onClose={() => {
          setProjectFormOpen(false);
          setEditingProject(null);
        }}
        onSaved={projects.refetch}
      />
      <JobFormModal
        open={jobFormOpen}
        job={editingJob}
        onClose={() => {
          setJobFormOpen(false);
          setEditingJob(null);
        }}
        onSaved={jobs.refetch}
      />
    </div>
  );
}
