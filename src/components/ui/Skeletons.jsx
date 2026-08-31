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

export function GridSkeleton({ count = 6, className }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
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
