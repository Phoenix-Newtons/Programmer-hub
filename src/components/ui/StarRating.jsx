import { Star } from "lucide-react";
import { cn, stars } from "../../lib/utils";

/** Read-only rating display with an accessible label. */
export default function StarRating({ rating, className, showValue = true, size = "md" }) {
  const { full, empty, value } = stars(rating);
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-semibold text-amber-400", className)}
      title={value ? `Rated ${value.toFixed(1)} out of 5` : "Not rated yet"}
    >
      <span className="flex" role="img" aria-label={value ? `Rated ${value.toFixed(1)} out of 5` : "Not rated yet"}>
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className={cn(iconSize, "fill-amber-400")} aria-hidden="true" />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className={cn(iconSize, "text-amber-400/35")} aria-hidden="true" />
        ))}
      </span>
      {showValue ? <span className="text-muted">{value ? value.toFixed(1) : "New"}</span> : null}
    </span>
  );
}
