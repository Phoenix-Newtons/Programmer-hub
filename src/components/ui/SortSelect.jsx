import { ArrowUpDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Compact sort dropdown that behaves like a native select but looks like the
 * rest of the UI: a button plus a small menu (closes on Escape / outside click).
 */
export default function SortSelect({ options, value, onChange, label = "Sort by", className }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const active = options.find((option) => option.id === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${active?.label ?? ""}`}
        className="btn btn-ghost gap-2 px-3 py-2 text-[0.8rem]"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
        <span className="hidden sm:inline text-muted">{label}:</span>
        <span className="font-semibold">{active?.label}</span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-line-strong bg-surface-solid p-1 shadow-soft"
        >
          {options.map((option) => {
            const selected = option.id === active?.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange?.(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                    selected ? "bg-brand-500/15 font-semibold text-ink" : "text-ink-soft hover:bg-white/5"
                  )}
                >
                  {option.label}
                  {selected ? <Check className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
