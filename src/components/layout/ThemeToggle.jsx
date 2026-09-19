import { useEffect, useRef, useState } from "react";
import { Check, MonitorSmartphone, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/utils";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: MonitorSmartphone },
];

/** Theme switcher with explicit light / dark / follow-system choices. */
export default function ThemeToggle({ className, compact = false }) {
  const { mode, isDark, setMode, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

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

  const Icon = isDark ? Moon : Sun;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (compact ? setOpen((v) => !v) : toggleTheme())}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        aria-haspopup={compact ? "menu" : undefined}
        aria-expanded={compact ? open : undefined}
        aria-label={`Theme: ${mode}. ${compact ? "Choose a theme" : "Switch theme"}`}
        title={`Theme: ${mode}`}
        className="grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-surface text-ink-soft transition hover:border-brand-400/60 hover:text-ink"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>

      {compact && open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-line-strong bg-surface-solid p-1 shadow-soft"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.id}
              onClick={() => {
                setMode(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                mode === option.id ? "bg-brand-500/15 font-semibold text-ink" : "text-ink-soft hover:bg-white/5"
              )}
            >
              <option.icon className="h-4 w-4" aria-hidden="true" />
              {option.label}
              {mode === option.id ? <Check className="ml-auto h-3.5 w-3.5 text-brand-300" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
