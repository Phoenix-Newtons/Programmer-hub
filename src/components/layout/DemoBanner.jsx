import { FlaskConical, X } from "lucide-react";
import { useDemoMode, setDemoMode } from "../../lib/demo";

/**
 * Visible whenever sample data is on, with a one-click way back to live data.
 * Nobody should ever mistake the fictional rows for real developers.
 */
export default function DemoBanner() {
  const demoMode = useDemoMode();
  if (!demoMode) return null;

  return (
    <div className="border-b border-amber-400/30 bg-amber-500/10" role="status">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-2 text-center text-xs font-semibold text-amber-100">
        <span className="inline-flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Sample data is on — the developers, projects and roles below are fictional and saving is
          disabled.
        </span>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 font-bold text-amber-50 transition hover:bg-amber-400/20"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Switch to live data
        </button>
      </div>
    </div>
  );
}
