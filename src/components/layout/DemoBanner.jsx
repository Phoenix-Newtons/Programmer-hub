import { FlaskConical } from "lucide-react";
import { DEMO_MODE } from "../../lib/api";

/**
 * Visible whenever VITE_DEMO_DATA=true so nobody mistakes sample rows for real
 * developer profiles.
 */
export default function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="border-b border-amber-400/30 bg-amber-500/10">
      <div className="container-page flex flex-wrap items-center justify-center gap-2 py-2 text-center text-xs font-semibold text-amber-200">
        <FlaskConical className="h-3.5 w-3.5" />
        Demo data is on — the developers, projects and roles below are fictional samples. Saving is
        disabled. Set <span className="font-mono">VITE_DEMO_DATA=false</span> to use Supabase.
      </div>
    </div>
  );
}
