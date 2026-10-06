import { useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * Filter chip row. Options may be plain strings or `{ value, label, count }`.
 * Arrow keys move between chips, Home/End jump to the ends.
 */
export default function FilterPills({ options, value, onChange, className, counts, ariaLabel = "Filters" }) {
  const listRef = useRef(null);

  const items = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option, count: counts?.[option] }
      : { ...option, count: option.count ?? counts?.[option.value] }
  );

  function onKeyDown(event) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(listRef.current?.querySelectorAll("button") || []);
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
    if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    buttons[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible", className)}
    >
      {items.map((option) => {
        const active = value === option.value;
        const count = typeof option.count === "number" ? option.count : null;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-[0_10px_30px_-12px_rgb(99_102_241/0.9)]"
                : "border-line-strong bg-surface text-muted hover:border-brand-400/50 hover:text-ink"
            )}
          >
            {option.label}
            {count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold",
                  active ? "bg-white/20 text-white" : "bg-brand-500/15 text-brand-300"
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
