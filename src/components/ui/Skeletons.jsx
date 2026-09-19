import { cn } from "../../lib/utils";

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="skeleton h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-1/2" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6, className, columns = "sm:grid-cols-2 lg:grid-cols-3" }) {
  return (
    <div className={cn("grid gap-5", columns, className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 4, className }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-2/3" />
          </div>
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container-page py-12" role="status" aria-live="polite">
      <span className="sr-only">Loading developer profile…</span>
      <div aria-hidden="true">
        <div className="skeleton h-40 w-full rounded-3xl" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="flex gap-2 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="skeleton h-24 w-full rounded-2xl" />
            <div className="skeleton h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status">
      <span className="relative grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-md" />
        <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-mono text-xl font-black text-white">
          {"</>"}
        </span>
      </span>
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
