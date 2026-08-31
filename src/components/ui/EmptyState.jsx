import { cn } from "../../lib/utils";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "indigo",
  className,
}) {
  const tones = {
    indigo: "from-indigo-500/25 to-fuchsia-500/10 text-indigo-300",
    amber: "from-amber-500/25 to-orange-500/10 text-amber-300",
    emerald: "from-emerald-500/25 to-teal-500/10 text-emerald-300",
    rose: "from-rose-500/25 to-fuchsia-500/10 text-rose-300",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-gradient-to-b px-6 py-14 text-center",
        tones[tone] || tones.indigo,
        className
      )}
    >
      {Icon ? (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-surface-solid/70 backdrop-blur">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
