import { Database, ExternalLink, FlaskConical, RefreshCw, Terminal, WifiOff } from "lucide-react";
import Button from "./Button";
import { friendlyError, isNetworkError } from "../../lib/utils";
import { setDemoMode } from "../../lib/demo";

/**
 * Shown when Supabase can't serve data yet (offline, missing tables, RLS, …).
 * It keeps the UI honest, tells the developer exactly what to do next, and
 * offers a one-click way to explore the interface with sample data.
 */
export default function SetupNotice({ error, what = "profiles", onRetry, compact = false }) {
  const message = friendlyError(error);

  const exploreSamples = (
    <Button size="sm" variant="ghost" icon={FlaskConical} onClick={() => setDemoMode(true)}>
      Explore with sample data
    </Button>
  );

  /* ---------- Offline / unreachable ---------- */
  if (isNetworkError(error)) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-line-strong bg-surface p-5 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
          <WifiOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink">{what} are unavailable offline</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            This browser session can&rsquo;t reach Supabase, so nothing was loaded. Everything else on the
            page still works — data appears as soon as the connection does.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {exploreSamples}
        </div>
      </div>
    );
  }

  /* ---------- Schema / permission problem ---------- */
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/8 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
          <Database className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">{what} could not be loaded</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-200/80">{message}</p>

          {!compact ? (
            <ol className="mt-4 space-y-2 text-sm text-muted">
              <li className="flex gap-2">
                <span className="font-bold text-brand-300">1.</span>
                Open your Supabase project → <span className="font-mono text-ink-soft">SQL Editor</span>.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-300">2.</span>
                Paste and run <span className="font-mono text-ink-soft">supabase/schema.sql</span> from this
                repo.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-300">3.</span>
                Create a public storage bucket named <span className="font-mono text-ink-soft">
                  avatars
                </span>{" "}
                for profile photos.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-brand-300">4.</span>
                Enable <span className="font-mono text-ink-soft">Google</span> under Authentication →
                Providers.
              </li>
            </ol>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              href="https://supabase.com/dashboard"
              size="sm"
              variant="ghost"
              icon={Terminal}
              iconRight={ExternalLink}
            >
              Open Supabase dashboard
            </Button>
            {onRetry ? (
              <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {exploreSamples}
          </div>
        </div>
      </div>
    </div>
  );
}
