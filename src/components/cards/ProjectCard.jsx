import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Pencil, Sparkles, Trash2, UserRound } from "lucide-react";
import { Github } from "../brand/BrandIcons";
import Badge from "../ui/Badge";
import { cn, hostFromUrl, normalizeList, safeText, timeAgo, truncate } from "../../lib/utils";

const COVERS = [
  "from-indigo-600 via-fuchsia-600 to-cyan-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-slate-700 via-indigo-700 to-purple-700",
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-rose-500 via-pink-600 to-fuchsia-700",
];

function coverFor(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 17 + seed.charCodeAt(i)) % 9973;
  return COVERS[hash % COVERS.length];
}

/**
 * Project card. Tags link back into search, the cover image degrades to a
 * gradient if the URL is broken, and owners get edit/delete actions.
 */
export default function ProjectCard({
  project,
  onDelete,
  onEdit,
  deleting = false,
  tagLink = true,
  className,
}) {
  const [coverBroken, setCoverBroken] = useState(false);
  const tags = normalizeList(project.tags);
  const gradient = coverFor(project.title || project.id || "ph");
  const showCover = project.cover_url && !coverBroken;

  return (
    <article className={cn("card card-hover group flex flex-col overflow-hidden", className)}>
      <div className={cn("relative h-36 overflow-hidden bg-gradient-to-br", gradient)}>
        {showCover ? (
          <img
            src={project.cover_url}
            alt={`${safeText(project.title, "Project")} cover`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setCoverBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="font-mono text-4xl font-black text-white/25">&lt;/&gt;</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" aria-hidden="true" />

        {project.featured ? (
          <div className="absolute left-4 top-4">
            <Badge tone="amber" icon={Sparkles}>
              Featured build
            </Badge>
          </div>
        ) : null}

        {(onDelete || onEdit) && (
          <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(project)}
                className="rounded-lg bg-slate-900/85 p-2 text-white transition hover:bg-slate-800"
                aria-label={`Edit ${safeText(project.title, "project")}`}
                title="Edit project"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(project)}
                disabled={deleting}
                className="rounded-lg bg-rose-500/90 p-2 text-white transition hover:bg-rose-600 disabled:opacity-60"
                aria-label={`Delete ${safeText(project.title, "project")}`}
                title="Delete project"
              >
                <Trash2 className={cn("h-4 w-4", deleting && "animate-pulse")} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-ink">{safeText(project.title, "Untitled project")}</h3>

        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          {project.user_id ? (
            <Link to={`/developers/${project.user_id}`} className="font-semibold hover:text-brand-300">
              {safeText(project.author_name, "Anonymous builder")}
            </Link>
          ) : (
            safeText(project.author_name, "Anonymous builder")
          )}
          {project.created_at ? <span>• {timeAgo(project.created_at)}</span> : null}
        </p>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          {truncate(safeText(project.description, "No description provided."), 150)}
        </p>

        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 5).map((tag) =>
              tagLink ? (
                <Link
                  key={tag}
                  to={`/projects?q=${encodeURIComponent(tag)}`}
                  className="chip transition hover:border-brand-400/50 hover:text-ink"
                  title={`More projects tagged ${tag}`}
                >
                  {tag}
                </Link>
              ) : (
                <span key={tag} className="chip">
                  {tag}
                </span>
              )
            )}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {project.live_url ? (
            <a
              href={project.live_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary px-3 py-2 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {hostFromUrl(project.live_url)}
            </a>
          ) : null}
          {project.repo_url ? (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost px-3 py-2 text-xs"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              {project.live_url ? "Source" : hostFromUrl(project.repo_url)}
              {!project.live_url ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </a>
          ) : null}
          {!project.live_url && !project.repo_url ? (
            <span className="text-xs text-muted">No links shared yet</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
