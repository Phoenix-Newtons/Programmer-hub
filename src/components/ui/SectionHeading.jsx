import { cn } from "../../lib/utils";

export default function SectionHeading({
  eyebrow,
  icon: Icon,
  title,
  description,
  align = "left",
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
