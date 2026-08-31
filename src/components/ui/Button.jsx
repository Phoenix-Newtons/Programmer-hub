import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const VARIANTS = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  success: "btn-success",
  danger: "btn-danger",
  subtle: "text-ink-soft hover:bg-white/10 hover:text-ink",
};

const SIZES = {
  sm: "px-3 py-1.5 text-[0.78rem] rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-[0.95rem] rounded-xl",
};

const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    children,
    ...props
  },
  ref
) {
  const classes = cn(
    "btn",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    loading && "cursor-wait",
    className
  );

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4" /> : null}
    </>
  );

  if (as === "link" || to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  if (as === "a" || href) {
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noreferrer" : undefined}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button ref={ref} className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
});

export default Button;
