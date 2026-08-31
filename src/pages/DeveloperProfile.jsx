import { useEffect, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Link, useParams } from "react-router-dom";
import {ArrowLeft, BadgeCheck, Briefcase, CalendarDays, ExternalLink, FolderGit2, Mail, MapPin, MessageCircle, Star, UserRound} from "lucide-react";
import { Github, Linkedin } from "../components/brand/BrandIcons";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StarRating from "../components/ui/StarRating";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Skeletons";
import ProjectCard from "../components/cards/ProjectCard";
import { fetchProfile, fetchProjects } from "../lib/api";
import { SITE } from "../lib/site";
import { formatDate, hostFromUrl, normalizeList, safeText, waLink } from "../lib/utils";

export default function DeveloperProfile() {
  useDocumentTitle("Developer profile");
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error: profileError } = await fetchProfile(id);
      if (!alive) return;
      setError(profileError || null);
      setProfile(data || null);
      if (data?.id) {
        const { data: allProjects } = await fetchProjects();
        if (!alive) return;
        setProjects((allProjects || []).filter((project) => project.user_id === data.id));
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <PageLoader label="Loading developer profile…" />;

  if (error || !profile) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={UserRound}
          tone="rose"
          title="Profile not available"
          description="This developer profile could not be loaded. It may have been removed, or the profiles table is not set up yet."
          action={
            <>
              <Button to="/developers" icon={ArrowLeft}>
                Back to directory
              </Button>
              <Button href={`mailto:${SITE.supportEmail}`} variant="ghost" icon={Mail}>
                Contact support
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const skills = normalizeList(profile.skills);
  const whatsapp = profile.whatsapp ? waLink(profile.whatsapp) : "";

  return (
    <div className="container-page py-12 sm:py-16">
      <Link to="/developers" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-300">
        <ArrowLeft className="h-4 w-4" />
        All developers
      </Link>

      {/* Header */}
      <div className="card mt-6 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-indigo-600/40 via-fuchsia-500/30 to-cyan-400/40" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="rounded-3xl border-4 border-bg bg-bg p-1">
                <Avatar name={profile.name} src={profile.avatar_url} size="xl" />
              </div>
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  {safeText(profile.name, "Developer")}
                  {profile.verified ? <BadgeCheck className="h-6 w-6 text-brand-300" /> : null}
                </h1>
                <p className="text-sm font-semibold text-brand-300">{safeText(profile.title, "Developer")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {whatsapp ? (
                <Button href={whatsapp} variant="success" icon={MessageCircle}>
                  WhatsApp
                </Button>
              ) : null}
              {profile.email ? (
                <Button href={`mailto:${profile.email}`} variant="ghost" icon={Mail}>
                  Email
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {safeText(profile.location, "Remote")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              {safeText(profile.experience, "Experience not stated")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400" />
              <StarRating rating={profile.rating} showValue={false} /> {Number(profile.rating || 0).toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Joined {formatDate(profile.created_at) || "recently"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {profile.hourly_rate ? <Badge tone="emerald">{profile.hourly_rate}</Badge> : null}
            {profile.open_to_work ? <Badge tone="emerald" icon={Briefcase}>Open to work</Badge> : null}
            {profile.featured ? <Badge tone="amber">Featured</Badge> : null}
            {profile.verified ? <Badge tone="cyan" icon={BadgeCheck}>Verified</Badge> : null}
          </div>

          <p className="mt-6 max-w-3xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">
            {safeText(profile.bio, "This developer hasn't written a bio yet.")}
          </p>

          {skills.length ? (
            <div className="mt-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Stack</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="chip px-3 py-1.5 text-[0.8rem]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(profile.github || profile.linkedin || profile.website) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {profile.github ? (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost text-sm"
                >
                  <Github className="h-4 w-4" />
                  {hostFromUrl(profile.github)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {profile.linkedin ? (
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost text-sm">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              ) : null}
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" className="btn btn-ghost text-sm">
                  <ExternalLink className="h-4 w-4" />
                  {hostFromUrl(profile.website)}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <FolderGit2 className="h-5 w-5 text-brand-300" />
          Projects by {safeText(profile.name, "this developer")}
        </h2>

        <div className="mt-6">
          {projects.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderGit2}
              tone="emerald"
              title="No projects published yet"
              description="Once this developer publishes work, every repo and live link will show up here as proof of skill."
            />
          )}
        </div>
      </section>
    </div>
  );
}
