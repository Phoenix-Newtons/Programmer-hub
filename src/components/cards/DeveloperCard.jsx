import { Link } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, Briefcase, Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { Github, Linkedin } from "../brand/BrandIcons";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import StarRating from "../ui/StarRating";
import SaveButton from "../ui/SaveButton";
import { cn, hostFromUrl, normalizeList, safeText, timeAgo, truncate, waLink } from "../../lib/utils";

/**
 * Developer summary card. Two layouts: the default grid card and a `compact`
 * row used on the shortlist page.
 */
export default function DeveloperCard({
  profile,
  featured = false,
  compact = false,
  skillLink = true,
  className,
}) {
  const skills = normalizeList(profile.skills);
  const name = safeText(profile.name, "Unnamed developer");
  const whatsapp = profile.whatsapp ? waLink(profile.whatsapp) : "";
  const profileHref = `/developers/${profile.id}`;

  if (compact) {
    return (
      <article className={cn("card card-hover flex flex-wrap items-center gap-4 p-4", className)}>
        <Avatar
          name={name}
          src={profile.avatar_url}
          size="md"
          status={profile.open_to_work ? "open" : null}
        />
        <div className="min-w-0 flex-1">
          <Link
            to={profileHref}
            className="flex items-center gap-1.5 text-base font-bold text-ink hover:text-brand-200"
          >
            <span className="truncate">{name}</span>
            {profile.verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-300" aria-label="Verified" />
            ) : null}
          </Link>
          <p className="truncate text-sm text-muted">
            {safeText(profile.title, "Developer")} · {safeText(profile.location, "Remote")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StarRating rating={profile.rating} />
          <Link to={profileHref} className="btn btn-primary px-3 py-2 text-xs">
            View profile
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <SaveButton profile={profile} showLabel={false} />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "card card-hover group flex flex-col p-5",
        featured && "ring-1 ring-brand-400/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={name}
            src={profile.avatar_url}
            size="lg"
            status={profile.open_to_work ? "open" : null}
          />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
              <Link to={profileHref} className="truncate hover:text-brand-200">
                {name}
              </Link>
              {profile.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand-300" aria-label="Verified profile" />
              ) : null}
            </h3>
            <p className="truncate text-sm font-medium text-brand-300">
              {safeText(profile.title, "Developer")}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {safeText(profile.location, "Remote")}
            </p>
          </div>
        </div>
        {featured ? <Badge tone="amber">Featured</Badge> : null}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
        {truncate(safeText(profile.bio, "This developer hasn't written a bio yet."), 150)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <StarRating rating={profile.rating} />
        <span className="text-muted">• {safeText(profile.experience, "Experience n/a")}</span>
        {profile.hourly_rate ? <span className="text-emerald-300">• {profile.hourly_rate}</span> : null}
        {profile.created_at ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            joined {timeAgo(profile.created_at)}
          </span>
        ) : null}
      </div>

      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) =>
            skillLink ? (
              <Link
                key={skill}
                to={`/developers?q=${encodeURIComponent(skill)}`}
                className="chip transition hover:border-brand-400/50 hover:text-ink"
                title={`Find more developers who know ${skill}`}
              >
                {skill}
              </Link>
            ) : (
              <span key={skill} className="chip">
                {skill}
              </span>
            )
          )}
          {skills.length > 4 ? <span className="chip">+{skills.length - 4}</span> : null}
        </div>
      ) : (
        <div className="mt-4">
          <span className="chip">No skills listed yet</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Link to={profileHref} className="btn btn-primary px-3 py-2 text-xs">
          View profile
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success px-3 py-2 text-xs"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
        {profile.email ? (
          <a
            href={`mailto:${profile.email}`}
            className="btn btn-ghost px-3 py-2 text-xs"
            title="Send an email"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            Email
          </a>
        ) : null}
        <SaveButton profile={profile} />
      </div>

      {(profile.github || profile.linkedin) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          {profile.github ? (
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-ink"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              {hostFromUrl(profile.github)}
            </a>
          ) : null}
          {profile.linkedin ? (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-ink"
            >
              <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
              LinkedIn
            </a>
          ) : null}
        </div>
      )}

      {profile.open_to_work ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
          <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
          Open to work
        </p>
      ) : null}
    </article>
  );
}
