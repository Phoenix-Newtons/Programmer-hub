import { cn } from "../../lib/utils";

export default function PageHeading({ eyebrow, icon: Icon, title, description, children, className }) {
  return (
    <header className={cn("", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {eyebrow}
            </span>
          ) : null}
          <h1 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</p>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
