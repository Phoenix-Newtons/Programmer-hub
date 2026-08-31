import { Banknote, Building2, Clock, MapPin, Send, Trash2 } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { cn, normalizeList, safeText, timeAgo, truncate } from "../../lib/utils";

export default function JobCard({ job, onApply, onDelete }) {
  const skills = normalizeList(job.skills);

  return (
    <article className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-ink">{safeText(job.title, "Untitled role")}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {safeText(job.company, "Company")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {safeText(job.location, "Remote")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(job.created_at) || "Just posted"}
            </span>
          </p>
        </div>
        <Badge tone={job.type === "Full-time" ? "emerald" : "indigo"}>{safeText(job.type, "Contract")}</Badge>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
        {truncate(safeText(job.description, "No description provided."), 190)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink-soft">
        {job.budget ? (
          <span className="inline-flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-emerald-400" />
            {job.budget}
          </span>
        ) : null}
        {job.level ? <span className="chip">{job.level}</span> : null}
      </div>

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span key={skill} className="chip">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className={cn("mt-5 flex flex-wrap gap-2 border-t border-line pt-4")}>
        {onApply ? (
          <Button size="sm" icon={Send} onClick={() => onApply(job)}>
            Apply now
          </Button>
        ) : null}
        {onDelete ? (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onDelete(job)} className="text-rose-300">
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}
