import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { cn, normalizeList, safeText, timeAgo, truncate } from "../../lib/utils";

const TYPE_TONES = {
  "Full-time": "emerald",
  "Part-time": "cyan",
  Contract: "indigo",
  Freelance: "violet",
  Internship: "amber",
};

/** Hiring-board card: role facts, stack chips and the apply / manage actions. */
export default function JobCard({
  job,
  onApply,
  onDelete,
  onEdit,
  deleting = false,
  applications = null,
  className,
}) {
  const skills = normalizeList(job.skills);
  const closed = job.status === "closed";

  return (
    <article className={cn("card card-hover flex flex-col p-5", closed && "opacity-80", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <span className="truncate">{safeText(job.title, "Untitled role")}</span>
            {closed ? (
              <Badge tone="slate" size="sm">
                Closed
              </Badge>
            ) : null}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
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
          </p>
        </div>
        <Badge tone={TYPE_TONES[job.type] || "indigo"}>{safeText(job.type, "Contract")}</Badge>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
        {truncate(safeText(job.description, "No description provided."), 190)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink-soft">
        {job.budget ? (
          <span className="inline-flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            {job.budget}
          </span>
        ) : null}
        {job.level ? <span className="chip">{job.level}</span> : null}
        {applications != null ? (
          <span className="inline-flex items-center gap-1.5 text-brand-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {applications} {applications === 1 ? "application" : "applications"}
          </span>
        ) : null}
      </div>

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className="chip">
              {skill}
            </span>
          ))}
          {skills.length > 5 ? <span className="chip">+{skills.length - 5}</span> : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {onApply ? (
          <Button size="sm" icon={Send} onClick={() => onApply(job)} disabled={closed}>
            {closed ? "Role closed" : "Apply now"}
          </Button>
        ) : null}
        {job.contact_email ? (
          <Button size="sm" variant="ghost" href={`mailto:${job.contact_email}`} icon={CalendarClock}>
            Ask a question
          </Button>
        ) : null}
        {onEdit ? (
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(job)}>
            Edit
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => onDelete(job)}
            disabled={deleting}
            className="text-rose-300"
          >
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}
