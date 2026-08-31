import { cn } from "../../lib/utils";

const TONES = {
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  slate: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};

export default function Badge({ tone = "indigo", icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide",
        TONES[tone] || TONES.indigo,
        className
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
