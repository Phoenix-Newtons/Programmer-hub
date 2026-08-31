import { Link } from "react-router-dom";
import {BadgeCheck, Briefcase, Mail, MapPin, MessageCircle, ArrowUpRight} from "lucide-react";
import { Github, Linkedin } from "../../components/brand/BrandIcons";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import StarRating from "../ui/StarRating";
import { cn, hostFromUrl, normalizeList, safeText, truncate, waLink } from "../../lib/utils";

export default function DeveloperCard({ profile, featured = false }) {
  const skills = normalizeList(profile.skills);
  const name = safeText(profile.name, "Unnamed developer");
  const whatsapp = profile.whatsapp ? waLink(profile.whatsapp) : "";

  return (
    <article
      className={cn(
        "card card-hover group flex flex-col p-5",
        featured && "ring-1 ring-brand-400/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} src={profile.avatar_url} size="lg" />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-base font-bold text-ink">
              <span className="truncate">{name}</span>
              {profile.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand-300" title="Verified" />
              ) : null}
            </h3>
            <p className="truncate text-sm font-medium text-brand-300">
              {safeText(profile.title, "Developer")}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="h-3 w-3" />
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
        <span className="text-muted">• {safeText(profile.hourly_rate, "Rate on request")}</span>
      </div>

      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span key={skill} className="chip">
              {skill}
            </span>
          ))}
          {skills.length > 4 ? <span className="chip">+{skills.length - 4}</span> : null}
        </div>
      ) : (
        <div className="mt-4">
          <span className="chip">No skills listed yet</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Link to={`/developers/${profile.id}`} className="btn btn-primary px-3 py-2 text-xs">
          View profile
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="btn btn-success px-3 py-2 text-xs"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : null}
        {profile.email ? (
          <a
            href={`mailto:${profile.email}`}
            className="btn btn-ghost px-3 py-2 text-xs"
            title="Send an email"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </a>
        ) : null}
      </div>

      {(profile.github || profile.linkedin) && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          {profile.github ? (
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-ink"
            >
              <Github className="h-3.5 w-3.5" />
              {hostFromUrl(profile.github)}
            </a>
          ) : null}
          {profile.linkedin ? (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-ink"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          ) : null}
        </div>
      )}

      {profile.open_to_work ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
          <Briefcase className="h-3.5 w-3.5" />
          Open to work
        </div>
      ) : null}
    </article>
  );
}
