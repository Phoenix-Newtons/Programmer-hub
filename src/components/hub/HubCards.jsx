import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  MonitorPlay,
  Send,
  Star,
  Users,
} from "lucide-react";
import { Github } from "../brand/BrandIcons";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import SaveButton from "../ui/SaveButton";
import StarRating from "../ui/StarRating";
import { cn, hostFromUrl, normalizeList, safeText, timeAgo, truncate } from "../../lib/utils";
import {
  AvailabilityDot,
  FeaturedMonogramBadge,
  SponsoredFrame,
  UpvoteButton,
  VerifiedGithubMetrics,
} from "./HubWidgets";

/* ------------------------------------------------------------------ */
/*  Find Talent — developer profile card                               */
/* ------------------------------------------------------------------ */

export function TalentCard({ profile, onMessage, onView }) {
  const skills = normalizeList(profile.skills);
  const name = safeText(profile.name, "Unnamed developer");
  const sponsored = Boolean(profile.sponsored || profile.premium);

  const card = (
    <article className="card card-hover group flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={name} src={profile.avatar_url} size="lg" status={null} />
          <AvailabilityDot
            profile={profile}
            side={sponsored ? "bottom" : "top"}
            className="absolute -bottom-1 -right-1 z-10"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-bold text-ink">
            <span className="truncate">{name}</span>
            {profile.verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-accent-400" aria-label="Verified profile" />
            ) : null}
          </h3>
          <p className="truncate text-sm font-medium text-brand-300">
            {safeText(profile.title, "Software Developer")}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {safeText(profile.location, "Remote")}
            {profile.experience ? <span>· {profile.experience}</span> : null}
          </p>
        </div>
        {profile.featured && !sponsored ? <Badge tone="amber">Featured</Badge> : null}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
        {truncate(safeText(profile.bio, "This developer hasn't written a bio yet."), 140)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <StarRating rating={profile.rating} size="sm" />
        {profile.hourly_rate ? (
          <span className="font-semibold text-emerald-300">{profile.hourly_rate}</span>
        ) : null}
        {profile.open_to_work ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-emerald-400" aria-hidden="true" />
            Open to work
          </span>
        ) : (
          <span className="text-muted">Not looking right now</span>
        )}
      </div>

      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`${name}'s tech stack`}>
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className="chip">
              {skill}
            </span>
          ))}
          {skills.length > 5 ? <span className="chip">+{skills.length - 5}</span> : null}
        </div>
      ) : null}

      <VerifiedGithubMetrics profile={profile} />

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => onView?.(profile)}
          className="btn btn-primary px-3 py-2 text-xs"
          aria-label={`View ${name}'s profile`}
        >
          View Profile
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMessage?.(profile)}
          className="btn btn-ghost px-3 py-2 text-xs"
          aria-label={`Message ${name}`}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Message
        </button>
        <SaveButton profile={profile} />
      </div>
    </article>
  );

  // Spotlighted profiles get the animated sponsored border treatment.
  return sponsored ? <SponsoredFrame className="h-full">{card}</SponsoredFrame> : card;
}

/* ------------------------------------------------------------------ */
/*  Ship Projects — project feed card                                  */
/* ------------------------------------------------------------------ */

const COVERS = [
  "from-indigo-600 via-violet-600 to-cyan-500",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-amber-500 via-orange-600 to-rose-500",
  "from-slate-700 via-indigo-700 to-purple-700",
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-rose-500 via-pink-600 to-fuchsia-700",
];

function coverFor(seed = "") {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) hash = (hash * 17 + text.charCodeAt(i)) % 9973;
  return COVERS[hash % COVERS.length];
}

/** Deterministic fallback so live rows without contributor data still read well. */
function contributorCount(project) {
  if (Number.isFinite(Number(project.contributors))) return Number(project.contributors);
  const seed = String(project.title || project.id || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 13 + seed.charCodeAt(i)) % 997;
  return 3 + (hash % 18);
}

export function ProjectFeedCard({ project, onPreview }) {
  const tags = normalizeList(project.tags || project.skills);
  const title = safeText(project.title, "Untitled project");
  const count = contributorCount(project);
  const people = normalizeList(project.contributor_names);
  const stars = Number(project.stars);

  return (
    <article className="card card-hover group flex overflow-hidden">
      {/* Product Hunt-style upvote rail (sticky inside the feed card) */}
      <div className="flex shrink-0 justify-center border-r border-line bg-slate-950/20 px-2 py-4">
        <UpvoteButton project={project} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thumbnail */}
        <div className={cn("relative h-40 overflow-hidden bg-gradient-to-br", coverFor(title))}>
          {project.cover_url ? (
            <img
              src={project.cover_url}
              alt={`${title} thumbnail`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
              <span className="font-mono text-5xl font-black text-white/25">&lt;/&gt;</span>
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/60 px-2.5 py-1 text-[0.68rem] font-bold text-white backdrop-blur">
              <Users className="h-3 w-3" aria-hidden="true" />
              {count} contributor{count === 1 ? "" : "s"}
            </span>
            {Number.isFinite(stars) && stars > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-950/60 px-2.5 py-1 text-[0.68rem] font-bold text-amber-300 backdrop-blur">
                <Star className="h-3 w-3 fill-amber-300" aria-hidden="true" />
                {stars.toLocaleString()}
              </span>
            ) : null}
          </div>
          {project.featured ? (
            <span className="absolute right-3 top-3">
              <Badge tone="amber">Featured</Badge>
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold leading-snug text-ink">{title}</h3>
          <p className="mt-1 text-xs text-muted">
            by{" "}
            <span className="font-semibold text-ink-soft">
              {safeText(project.author_name, "Anonymous builder")}
            </span>
            {project.created_at ? <span> · {timeAgo(project.created_at)}</span> : null}
          </p>

          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
            {truncate(safeText(project.description, "No description provided."), 160)}
          </p>

          {/* Contributor stack */}
          <div className="mt-4 flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {(people.length ? people : [project.author_name || "Hub Member"]).slice(0, 4).map((person) => (
                <Avatar key={person} name={person} size="xs" className="ring-2 ring-bg-elev" />
              ))}
            </div>
            <span className="text-xs text-muted">
              {people.length
                ? `${people.slice(0, 2).join(", ")}${count > 2 ? ` +${count - 2} more` : ""} building this`
                : `${count} people building this`}
            </span>
          </div>

          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.slice(0, 5).map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {project.live_url ? (
              <button
                type="button"
                onClick={() => onPreview?.(project)}
                className="btn btn-primary px-3 py-2 text-xs"
              >
                <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                Live Demo
              </button>
            ) : null}
            {project.repo_url ? (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost px-3 py-2 text-xs"
                aria-label={`${title} on GitHub (${hostFromUrl(project.repo_url)})`}
              >
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
                GitHub
              </a>
            ) : null}
            {project.live_url ? (
              <a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost px-2.5 py-2 text-xs"
                aria-label={`Open ${title} in a new tab`}
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
            {!project.live_url && !project.repo_url ? (
              <span className="text-xs text-muted">No links shared yet</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Get Hired — job board row                                          */
/* ------------------------------------------------------------------ */

const TYPE_TONES = {
  "Full-time": "emerald",
  "Part-time": "cyan",
  Contract: "indigo",
  Freelance: "violet",
  Internship: "amber",
};

export function JobRow({ job, applied, onApply }) {
  const skills = normalizeList(job.skills);
  const closed = job.status === "closed";
  const applicants = Number(job.applicants ?? job.applications);
  const sponsored = Boolean(job.sponsored || job.premium);

  const row = (
    <article
      className={cn(
        "card card-hover flex h-full flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center",
        closed && "opacity-75"
      )}
    >
      {/* Company monogram (+ ⚡ Featured badge for sponsored placements) */}
      <div className="flex shrink-0 flex-col items-center self-start">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/25 via-violet-500/20 to-cyan-500/20 font-mono text-lg font-black text-brand-200 ring-1 ring-brand-400/30"
          aria-hidden="true"
        >
          {safeText(job.company, "C").slice(0, 2).toUpperCase()}
        </div>
        {sponsored ? <FeaturedMonogramBadge /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold leading-snug text-ink">{safeText(job.title, "Untitled role")}</h3>
          <Badge tone={TYPE_TONES[job.type] || "indigo"} size="sm">
            {safeText(job.type, "Contract")}
          </Badge>
          {closed ? (
            <Badge tone="slate" size="sm">
              Closed
            </Badge>
          ) : null}
          {job.level ? (
            <Badge tone="slate" size="sm">
              {job.level}
            </Badge>
          ) : null}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            {safeText(job.company, "Company")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {safeText(job.location, "Remote")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {timeAgo(job.created_at) || "Just posted"}
          </span>
          {Number.isFinite(applicants) ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {applicants} applicant{applicants === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>

        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">
          {truncate(safeText(job.description, "No description provided."), 170)}
        </p>

        {skills.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((skill) => (
              <span key={skill} className="chip">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-line pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
        {job.budget ? (
          <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-emerald-300">
            <Banknote className="h-4 w-4" aria-hidden="true" />
            {job.budget}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Salary on request
          </p>
        )}
        <button
          type="button"
          onClick={() => onApply?.(job)}
          disabled={closed || applied}
          className={cn("btn px-4 py-2.5 text-sm", applied ? "btn-success" : "btn-primary")}
          aria-label={
            applied
              ? `Already applied to ${safeText(job.title, "this role")}`
              : `Apply to ${safeText(job.title, "this role")}`
          }
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {closed ? "Role closed" : applied ? "Applied ✓" : "Apply Now"}
        </button>
      </div>
    </article>
  );

  // Sponsored roles get the moving indigo → violet → cyan gradient border.
  return sponsored ? (
    <SponsoredFrame badge={false} label="⚡ Featured">
      {row}
    </SponsoredFrame>
  ) : (
    row
  );
}
