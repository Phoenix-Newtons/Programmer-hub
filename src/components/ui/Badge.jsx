import { cn } from "../../lib/utils";

const TONES = {
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  slate: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};

export default function Badge({ tone = "indigo", icon: Icon, className, children, size = "md", title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[0.62rem]" : "px-2.5 py-1 text-[0.7rem]",
        TONES[tone] || TONES.indigo,
        className
      )}
    >
      {Icon ? <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
