import { useEffect, useMemo, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2, Eye, FolderGit2, Globe, ImagePlus, Loader2, MapPin, MessageCircle, PencilRuler, Plus, Save, UserRound } from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import ProjectCard from "../components/cards/ProjectCard";
import JobCard from "../components/cards/JobCard";
import GoogleButton from "../components/auth/GoogleButton";
import ProjectFormModal from "../components/projects/ProjectFormModal";
import JobFormModal from "../components/hiring/JobFormModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useCollection from "../hooks/useCollection";
import { deleteJob, deleteProject, fetchJobs, fetchProjects, uploadAvatar } from "../lib/api";
import { SITE } from "../lib/site";
import { cn, friendlyError, normalizeList, toTagsInput } from "../lib/utils";
import { PageLoader } from "../components/ui/Skeletons";

const TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "projects", label: "My projects", icon: FolderGit2 },
  { id: "roles", label: "My roles", icon: Briefcase },
];

const COMPLETION_FIELDS = [
  "name",
  "title",
  "location",
  "bio",
  "skills",
  "hourly_rate",
  "experience",
  "github",
  "whatsapp",
];

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { loading, isAuthenticated, user, profile, displayName, avatarUrl, updateProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");

  const projects = useCollection(fetchProjects, [user?.id]);
  const jobs = useCollection(fetchJobs, [user?.id]);

  const myProjects = useMemo(
    () => projects.data.filter((project) => project.user_id === user?.id),
    [projects.data, user?.id]
  );
  const myJobs = useMemo(() => jobs.data.filter((job) => job.user_id === user?.id), [jobs.data, user?.id]);

  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  const completion = useMemo(() => {
    const filled = COMPLETION_FIELDS.filter((key) => String(form[key] ?? "").trim().length > 0).length;
    return Math.round((filled / COMPLETION_FIELDS.length) * 100);
  }, [form]);

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
    if (error) return toast.error(friendlyError(error, "Could not save your profile."));
    toast.success("Profile saved. You're live on the hub.");
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("That image is larger than 2 MB. Try a smaller file.");
      return;
    }
    setUploading(true);
    const { url, error } = await uploadAvatar(user.id, file);
    setUploading(false);
    if (error || !url) {
      return toast.error(
        friendlyError(error, "Upload failed. Create a public storage bucket named 'avatars' in Supabase.")
      );
    }
    update("avatar_url", url);
    await updateProfile({ avatar_url: url });
    toast.success("Avatar updated.");
  }

  async function handleDeleteProject(project) {
    setDeletingId(project.id);
    const { error } = await deleteProject(project.id);
    setDeletingId(null);
    if (error) return toast.error(friendlyError(error, "Could not delete that project."));
    toast.success("Project removed.");
    projects.refetch();
  }

  async function handleDeleteJob(job) {
    setDeletingId(job.id);
    const { error } = await deleteJob(job.id);
    setDeletingId(null);
    if (error) return toast.error(friendlyError(error, "Could not delete that role."));
    toast.success("Role removed.");
    jobs.refetch();
  }

  if (loading) return <PageLoader label="Checking your session…" />;

  /* ---------------- Signed-out gate ---------------- */
  if (!isAuthenticated) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={UserRound}
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

  /* ---------------- Signed-in dashboard ---------------- */
  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Dashboard"
        icon={PencilRuler}
        title={`Welcome back, ${displayName || "developer"}`}
        description="Everything you publish here is public. Keep it sharp — it's what clients see before they message you."
      >
        {profile?.id ? (
          <Button to={`/developers/${profile.id}`} variant="ghost" icon={Eye}>
            View public profile
          </Button>
        ) : null}
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Save profile
        </Button>
      </PageHeading>

      {/* Summary */}
      <section className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card flex items-center gap-5 p-6">
          <div className="relative">
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
                  <ImagePlus className="h-4 w-4" />
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
              <MapPin className="h-3.5 w-3.5" />
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
              {profile?.verified ? <Badge tone="cyan" icon={CheckCircle2}>Verified</Badge> : null}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Profile strength</h3>
            <span className="text-sm font-black text-brand-300">{completion}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Complete profiles get contacted first. Add your stack, rate, WhatsApp number and at least
            one project to hit 100%.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xl font-black text-ink">{myProjects.length}</p>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted">Projects</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xl font-black text-ink">{myJobs.length}</p>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted">Roles posted</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-10 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              tab === item.id
                ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                : "text-muted hover:text-ink"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" ? (
        <form onSubmit={handleSave} className="mt-6 grid gap-5">
          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <UserRound className="h-4 w-4 text-brand-300" />
              The basics
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required value={form.name || ""} onChange={(e) => update("name", e.target.value)} placeholder="Luwangula Alpha" />
              <Field label="Headline" value={form.title || ""} onChange={(e) => update("title", e.target.value)} placeholder="Full-stack engineer" />
              <Field label="Location" value={form.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="Kampala, Uganda" />
              <Field label="Experience" value={form.experience || ""} onChange={(e) => update("experience", e.target.value)} placeholder="3+ years" />
              <Field label="Rate" hint="hourly or monthly" value={form.hourly_rate || ""} onChange={(e) => update("hourly_rate", e.target.value)} placeholder="$25 / hour" />
              <Field
                label="Skills"
                hint="comma separated"
                value={form.skills || ""}
                onChange={(e) => update("skills", e.target.value)}
                placeholder="React, Node.js, Supabase"
              />
            </div>

            <div className="mt-5">
              <Field
                as="textarea"
                label="Bio"
                hint="2–3 sentences"
                value={form.bio || ""}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="I build fast, accessible web apps for African startups…"
                maxLength={600}
              />
            </div>
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <MessageCircle className="h-4 w-4 text-brand-300" />
              How clients reach you
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Email" type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" />
              <Field label="WhatsApp" hint="digits only, with country code" value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} placeholder="256700000000" />
            </div>

            <label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
              <span>
                <span className="block text-sm font-bold text-ink">Open to work</span>
                <span className="block text-xs text-muted">Show a badge on your public profile</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(form.open_to_work)}
                onChange={(e) => update("open_to_work", e.target.checked)}
                className="h-5 w-5 accent-indigo-500"
              />
            </label>
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-ink">
              <Globe className="h-4 w-4 text-brand-300" />
              Links
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="GitHub" value={form.github || ""} onChange={(e) => update("github", e.target.value)} placeholder="github.com/you" />
              <Field label="LinkedIn" value={form.linkedin || ""} onChange={(e) => update("linkedin", e.target.value)} placeholder="linkedin.com/in/you" />
              <Field label="Website" value={form.website || ""} onChange={(e) => update("website", e.target.value)} placeholder="yoursite.dev" />
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
            <h3 className="text-base font-bold text-ink">Projects you&rsquo;ve published</h3>
            <Button icon={Plus} onClick={() => setProjectFormOpen(true)}>
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
                    deleting={deletingId === project.id}
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
                  <Button icon={Plus} onClick={() => setProjectFormOpen(true)}>
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
            <h3 className="text-base font-bold text-ink">Roles you&rsquo;ve posted</h3>
            <Button icon={Plus} onClick={() => setJobFormOpen(true)}>
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
                    onDelete={(item) => handleDeleteJob(item)}
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
                  <Button icon={Plus} onClick={() => setJobFormOpen(true)}>
                    Post a role
                  </Button>
                }
              />
            )}
          </div>
        </section>
      ) : null}

      <ProjectFormModal
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        onSaved={projects.refetch}
      />
      <JobFormModal open={jobFormOpen} onClose={() => setJobFormOpen(false)} onSaved={jobs.refetch} />
    </div>
  );
}
