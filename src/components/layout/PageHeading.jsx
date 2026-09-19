import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Page header used by every routed page: breadcrumbs, eyebrow, title,
 * description and a slot for actions on the right.
 */
export default function PageHeading({ eyebrow, icon: Icon, title, description, children, className, breadcrumbs = [] }) {
  return (
    <header className={cn("", className)}>
      {breadcrumbs.length ? (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
            <li>
              <Link to="/" className="transition hover:text-brand-300">
                Home
              </Link>
            </li>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-line-strong" />
                </li>
                <li>
                  {crumb.to && index < breadcrumbs.length - 1 ? (
                    <Link to={crumb.to} className="transition hover:text-brand-300">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink-soft">
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
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
