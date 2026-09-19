import { cn } from "../../lib/utils";

const TONES = {
  indigo: "from-indigo-500/25 to-fuchsia-500/10 text-indigo-300",
  amber: "from-amber-500/25 to-orange-500/10 text-amber-300",
  emerald: "from-emerald-500/25 to-teal-500/10 text-emerald-300",
  rose: "from-rose-500/25 to-fuchsia-500/10 text-rose-300",
  cyan: "from-cyan-500/25 to-blue-500/10 text-cyan-300",
};

/**
 * Friendly zero-data state. `action` is the primary CTA, `secondary` renders
 * next to it (used for "explore with sample data" and help links).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  tone = "indigo",
  className,
  compact = false,
  // Heading level of the title: `1` when the state *is* the page (no other
  // `h1` on screen), `2` when it sits directly under the page `h1`, and the
  // default `3` for nested states that follow a section heading.
  level = 3,
}) {
  const Title = `h${Math.min(6, Math.max(1, level))}`;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-gradient-to-b text-center",
        compact ? "px-5 py-8" : "px-6 py-14",
        TONES[tone] || TONES.indigo,
        className
      )}
    >
      {Icon ? (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-surface-solid/70 backdrop-blur">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <Title className="text-lg font-bold text-ink">{title}</Title>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action || secondary ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
