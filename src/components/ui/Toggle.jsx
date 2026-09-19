import { cn } from "../../lib/utils";

/**
 * Accessible switch (`role="switch"`) used for open-to-work, sample data and
 * other binary settings.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
  disabled = false,
  tone = "brand",
  className,
}) {
  const tones = {
    brand: "bg-gradient-to-r from-indigo-500 to-fuchsia-500",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
    amber: "bg-gradient-to-r from-amber-500 to-orange-500",
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 transition hover:border-brand-400/40",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-11 items-center rounded-full border border-line-strong bg-line px-0.5 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
            checked && cn("border-transparent", tones[tone] || tones.brand)
          )}
        >
          <span
            className={cn(
              "h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
            style={{ height: "1.125rem", width: "1.125rem" }}
          />
        </span>
      </span>
    </label>
  );
}
