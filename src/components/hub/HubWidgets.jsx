import { useEffect, useId, useRef, useState } from "react";
import { Activity, Briefcase, Check, ChevronUp, History, Rocket, Sparkles, X, Zap } from "lucide-react";
import { Github } from "../brand/BrandIcons";
import { cn } from "../../lib/utils";
import { availabilityInfo, hasVerifiedGithub, topLanguages } from "../../lib/githubMetrics";
import { baseUpvotes, toggleUpvote, useUpvotes } from "../../lib/upvotes";
import { TABLE_VIEW } from "../../hooks/useHubRealtime";

/* ------------------------------------------------------------------ */
/*  Rich tooltip (hover + keyboard focus, no dependency)               */
/* ------------------------------------------------------------------ */

export function RichTooltip({ label, children, side = "top", className }) {
  const id = useId();
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      <span tabIndex={0} aria-describedby={id} className="inline-flex cursor-help rounded-full outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 w-56 -translate-x-1/2 rounded-xl border border-line-strong bg-slate-950/95 p-3 text-left opacity-0 shadow-soft backdrop-blur transition-all duration-200",
          "translate-y-1 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:translate-y-0 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5"
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Availability dot with a descriptive breakdown tooltip              */
/* ------------------------------------------------------------------ */

export function AvailabilityDot({ profile, className, side = "top" }) {
  const info = availabilityInfo(profile);
  const open = info.tone === "open";
  return (
    <RichTooltip
      side={side}
      className={className}
      label={
        <>
          <span className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-cyan-300">
            <span className={cn("h-1.5 w-1.5 rounded-full", open ? "bg-emerald-400" : "bg-slate-400")} />
            {info.label}
          </span>
          <span className="mt-1.5 block text-xs font-medium leading-relaxed text-slate-100">
            {info.detail}
          </span>
          {profile?.location ? (
            <span className="mt-1 block text-[0.7rem] text-slate-400">{profile.location}</span>
          ) : null}
        </>
      }
    >
      <span
        className={cn(
          "block h-3.5 w-3.5 rounded-full border-2 border-bg-elev transition-transform duration-200 group-hover/tooltip:scale-110",
          open ? "bg-emerald-400" : "bg-slate-400"
        )}
        aria-label={info.detail}
        role="img"
      />
    </RichTooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  Verified GitHub metrics — compact proof-of-skill row               */
/* ------------------------------------------------------------------ */

export function VerifiedGithubMetrics({ profile }) {
  const languages = topLanguages(profile);
  const verified = hasVerifiedGithub(profile) || profile?.verified;
  if (!languages.length) return null;

  return (
    <div
      className="mt-4 rounded-xl border border-line bg-slate-950/25 px-3 py-2.5"
      aria-label={`Verified GitHub metrics for ${profile?.name || "this developer"}`}
    >
      <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
        <Github className="h-3.5 w-3.5 text-ink-soft" aria-hidden="true" />
        Verified GitHub metrics
        {verified ? <Check className="h-3 w-3 text-emerald-400" aria-label="Verified" /> : null}
      </p>
      {/* Language share bar */}
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        {languages.map((item, index) => (
          <span
            key={item.language}
            className={cn(
              "h-full",
              index === 0 && "bg-cyan-400",
              index === 1 && "bg-violet-400",
              index === 2 && "bg-indigo-400"
            )}
            style={{ width: `${item.percent}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {languages.map((item) => (
          <span
            key={item.language}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-ink-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
            {item.language}
            <span className="text-muted">{item.percent}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product Hunt-style upvote rail                                     */
/* ------------------------------------------------------------------ */

export function UpvoteButton({ project, onToggle }) {
  const votedMap = useUpvotes();
  const voted = Boolean(votedMap[project?.id]);
  const count = baseUpvotes(project) + (voted ? 1 : 0);
  const [popped, setPopped] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    const next = toggleUpvote(project?.id);
    onToggle?.(project, next);
    if (next) {
      setPopped(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPopped(false), 480);
    }
  }

  return (
    <div className="sticky top-24 flex shrink-0 flex-col items-center self-start">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={voted}
        aria-label={
          voted
            ? `Remove your upvote from ${project?.title || "this project"} (${count} upvotes)`
            : `Upvote ${project?.title || "this project"} (${count} upvotes)`
        }
        title={voted ? "Upvoted — click to undo" : "Upvote this project"}
        className={cn(
          "group relative flex w-12 flex-col items-center gap-0.5 rounded-2xl border px-1.5 py-2.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "hover:-translate-y-0.5 active:scale-95",
          voted
            ? "border-violet-400/70 bg-violet-500/25 text-violet-200 shadow-[0_0_0_1px_rgb(167_139_250/0.35),0_14px_34px_-12px_rgb(139_92_246/0.9)]"
            : "border-line-strong bg-surface text-muted hover:border-violet-400/50 hover:text-violet-300"
        )}
      >
        {voted ? (
          <span
            className="pointer-events-none absolute inset-0 animate-vote-ring rounded-2xl border border-violet-400/60"
            aria-hidden="true"
          />
        ) : null}
        <ChevronUp
          className={cn(
            "h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.8,0.64,1)] group-hover:-translate-y-0.5",
            popped && "animate-upvote-pop",
            voted && "fill-violet-300 text-violet-200"
          )}
          strokeWidth={3}
          aria-hidden="true"
        />
        <span
          key={count}
          className={cn("font-mono text-sm font-black leading-none", popped && "animate-upvote-pop")}
        >
          {count}
        </span>
        <span className="text-[0.55rem] font-bold uppercase tracking-wider opacity-80">
          {voted ? "Voted" : "Upvote"}
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sponsored / premium highlight frame                                */
/* ------------------------------------------------------------------ */

/**
 * Animated-gradient border wrapper for monetised placements. The moving
 * gradient lives on a `::before` layer animated with `transform` only
 * (see `.sponsored-frame` in index.css), so it stays on the compositor.
 */
export function SponsoredFrame({ children, className, label = "⚡ Featured", badge = true }) {
  return (
    <div className={cn("sponsored-frame h-full rounded-[1.4rem] p-[1.5px]", className)}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.4rem-1.5px)] bg-bg-elev">
        {badge ? (
          <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-300/50 backdrop-blur">
            <Zap className="h-3 w-3 fill-amber-300" aria-hidden="true" />
            {label.replace(/^⚡\s*/, "")}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Small "⚡ Featured" badge that sits inside a job's monogram space. */
export function FeaturedMonogramBadge() {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-slate-950">
      <Zap className="h-2.5 w-2.5 fill-slate-950" aria-hidden="true" />
      Featured
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Live activity banner (top of the sidebar)                          */
/* ------------------------------------------------------------------ */

const ACTIVITY_ICONS = { rocket: Rocket, briefcase: Briefcase, sparkles: Sparkles, activity: Activity };

export function LiveActivityBanner({ activity, status, onDismiss, onNavigate }) {
  if (!activity) {
    return (
      <p
        className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[0.7rem] font-semibold text-muted"
        role="status"
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {status === "live" ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          ) : null}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status === "live" ? "bg-emerald-400" : "bg-slate-500"
            )}
          />
        </span>
        {status === "live"
          ? "Live — hub activity streams in here"
          : "Realtime offline — showing latest fetch"}
      </p>
    );
  }

  const Icon = ACTIVITY_ICONS[activity.icon] || Activity;
  const view = TABLE_VIEW[activity.table];

  return (
    <div
      className="animate-rise mb-3 rounded-xl border border-violet-400/40 bg-gradient-to-r from-indigo-500/25 via-violet-500/20 to-cyan-500/15 p-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/40">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <button
          type="button"
          onClick={() => view && onNavigate?.(view)}
          className="min-w-0 flex-1 text-left"
          aria-label={`${activity.message} — view`}
        >
          <span className="block text-xs font-bold leading-snug text-ink">{activity.message}</span>
          <span className="mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-wider text-violet-300">
            Just now · tap to view
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted transition hover:text-ink"
          aria-label="Dismiss live activity"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Draft-restored notice                                              */
/* ------------------------------------------------------------------ */

export function DraftNotice({ restored, onDismiss }) {
  if (!restored) return null;
  return (
    <p
      className="animate-rise flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200"
      role="status"
    >
      <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">Draft restored from backup</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-0.5 text-cyan-300/80 transition hover:text-cyan-100"
        aria-label="Dismiss draft restored notice"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </p>
  );
}
