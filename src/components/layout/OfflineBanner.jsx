import { WifiOff } from "lucide-react";
import useOnlineStatus from "../../hooks/useOnlineStatus";

/** Tells the visitor the moment their connection drops (and when it returns). */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="border-b border-rose-400/30 bg-rose-500/10" role="alert">
      <div className="container-page flex items-center justify-center gap-2 py-2 text-center text-xs font-semibold text-rose-100">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        You&rsquo;re offline. Anything you try to load will resume automatically when the connection
        returns.
      </div>
    </div>
  );
}
