import { cn } from "../../lib/utils";
import useMediaQuery from "../../hooks/useMediaQuery";

/**
 * Infinite tech-stack marquee.
 *
 * The duplicated row is hidden from assistive tech, the duration scales with
 * the number of items, and visitors who ask for reduced motion get a static,
 * scrollable row instead of an animation.
 */
export default function Marquee({
  items = [],
  className,
  reverse = false,
  label = "Technologies on the hub",
}) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const duration = Math.max(18, items.length * 3.2);

  if (reduceMotion) {
    return (
      <div className={cn("mask-fade-x relative overflow-hidden", className)}>
        <ul
          aria-label={label}
          className="no-scrollbar flex gap-3 overflow-x-auto py-2"
        >
          {items.map((item) => (
            <li
              key={item}
              className="whitespace-nowrap rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("mask-fade-x relative flex overflow-hidden py-2", className)} aria-label={label}>
      <ul
        className="flex shrink-0 gap-3 pr-3 motion-safe:animate-[marquee_linear_infinite]"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...items, ...items].map((item, index) => (
          <li
            key={`${item}-${index}`}
            aria-hidden={index >= items.length ? "true" : undefined}
            className="whitespace-nowrap rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
