import { useEffect, useState } from "react";
import { cn, avatarGradient, initials, safeText } from "../../lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[0.6rem] rounded-lg",
  sm: "h-9 w-9 text-xs rounded-xl",
  md: "h-12 w-12 text-sm rounded-xl",
  lg: "h-16 w-16 text-lg rounded-2xl",
  xl: "h-24 w-24 text-2xl rounded-2xl",
  "2xl": "h-32 w-32 text-3xl rounded-3xl",
};

/**
 * Initial-based avatar with a deterministic gradient. Falls back to the
 * initials if the image fails to load, and fades the photo in so slow images
 * never look broken.
 */
export default function Avatar({ name = "", src, size = "md", className, ring = true, status = null }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [src]);

  const label = safeText(name, "Developer");
  const base = cn(
    "relative grid shrink-0 place-items-center overflow-hidden font-bold text-white",
    SIZES[size] || SIZES.md,
    ring && "ring-1 ring-white/15",
    className
  );

  const showImage = src && !broken;

  return (
    <div className="relative inline-flex shrink-0">
      <div className={base}>
        <div
          className={cn("absolute inset-0 bg-gradient-to-br shadow-inner", avatarGradient(name))}
          aria-hidden="true"
        />
        {showImage ? (
          <img
            src={src}
            alt={label}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className={cn(
              "relative h-full w-full object-cover transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />
        ) : null}
        {showImage && loaded ? null : (
          <span className={cn("relative drop-shadow-sm", !showImage && "opacity-100")} aria-hidden={showImage}>
            {initials(name)}
          </span>
        )}
      </div>
      {status ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg",
            status === "open" ? "bg-emerald-400" : "bg-slate-400"
          )}
          title={status === "open" ? "Open to work" : "Not looking"}
        />
      ) : null}
    </div>
  );
}
