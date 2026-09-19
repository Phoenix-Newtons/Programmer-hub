import { BookmarkPlus, BookmarkCheck } from "lucide-react";
import { useShortlist } from "../../lib/shortlist";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../lib/utils";

/**
 * Adds/removes a developer from the local shortlist. Rendered on directory
 * cards and on public profile pages — the list is private to this browser.
 */
export default function SaveButton({ profile, size = "sm", className, showLabel = true }) {
  const { has, toggle } = useShortlist();
  const toast = useToast();
  const saved = has(profile?.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(profile);
        toast.success(
          saved
            ? `${profile?.name || "Developer"} removed from your shortlist.`
            : `${profile?.name || "Developer"} saved to your shortlist.`
        );
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
      title={saved ? "Saved to your shortlist" : "Save to your shortlist"}
      className={cn(
        "btn inline-flex items-center gap-1.5 border-line-strong",
        size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm",
        saved
          ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
          : "bg-surface-solid text-ink-soft hover:border-amber-400/50 hover:text-ink",
        className
      )}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
      {showLabel ? (saved ? "Saved" : "Save") : <span className="sr-only">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
