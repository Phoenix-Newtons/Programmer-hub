import { cn } from "../../lib/utils";

export default function FilterPills({ options, value, onChange, className }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-[0_10px_30px_-12px_rgb(99_102_241/0.9)]"
                : "border-line-strong bg-surface text-muted hover:border-brand-400/50 hover:text-ink"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
