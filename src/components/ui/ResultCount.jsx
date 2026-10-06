import { cn, pluralize } from "../../lib/utils";

/**
 * Result counter rendered as a polite live region, so screen-reader users hear
 * "12 developers found" after typing instead of silence.
 */
export default function ResultCount({
  count,
  singular = "result",
  plural,
  loading,
  loadingLabel = "Loading…",
  className,
  children,
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-2 text-sm text-muted", className)} aria-live="polite">
      <span className="font-semibold text-ink-soft">
        {loading ? loadingLabel : pluralize(count, singular, plural)}
      </span>
      {children}
    </p>
  );
}
