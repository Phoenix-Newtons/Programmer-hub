import { Star } from "lucide-react";
import { cn, stars } from "../../lib/utils";

export default function StarRating({ rating, className, showValue = true }) {
  const { full, empty, value } = stars(rating);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-amber-400", className)}>
      <span className="flex">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="h-3.5 w-3.5 fill-amber-400" />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="h-3.5 w-3.5 text-amber-400/35" />
        ))}
      </span>
      {showValue ? <span className="text-muted">{value ? value.toFixed(1) : "—"}</span> : null}
    </span>
  );
}
