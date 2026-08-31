import { cn, avatarGradient, initials, safeText } from "../../lib/utils";

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export default function Avatar({ name = "", src, size = "md", className, ring = true }) {
  const base = cn(
    "relative grid shrink-0 place-items-center overflow-hidden rounded-2xl font-bold text-white",
    SIZES[size] || SIZES.md,
    ring && "ring-1 ring-white/20",
    className
  );

  if (src) {
    return (
      <div className={base}>
        <img src={src} alt={safeText(name, "Avatar")} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={cn(base, "bg-gradient-to-br shadow-inner", avatarGradient(name))}
      aria-hidden="true"
      title={safeText(name, "")}
    >
      <span className="drop-shadow-sm">{initials(name)}</span>
    </div>
  );
}
