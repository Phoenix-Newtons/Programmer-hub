import { ChevronDown } from "lucide-react";
import Button from "./Button";
import { pluralize } from "../../lib/utils";

/**
 * Progressive disclosure for long lists: renders as much as `visible` allows
 * and offers a button (plus a screen-reader friendly count) for the rest.
 */
export default function LoadMore({ total, visible, onMore, step = 9, className }) {
  const remaining = Math.max(0, total - visible);
  if (!remaining) return null;

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-3 pt-8">
        <Button variant="ghost" icon={ChevronDown} onClick={() => onMore?.()}>
          Show {Math.min(step, remaining)} more
        </Button>
        <p className="text-xs text-muted" aria-live="polite">
          Showing {visible} of {pluralize(total, "result")}
        </p>
      </div>
    </div>
  );
}
