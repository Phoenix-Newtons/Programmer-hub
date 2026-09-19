import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const VARIANTS = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  success: "btn-success",
  danger: "btn-danger",
  soft: "btn-soft",
  subtle: "btn-subtle",
  link: "btn-link",
};

const SIZES = {
  xs: "px-2.5 py-1 text-[0.72rem] rounded-lg gap-1.5",
  sm: "px-3 py-1.5 text-[0.78rem] rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3.5 text-[0.95rem] rounded-xl",
  icon: "h-10 w-10 rounded-xl p-0",
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
    fullWidth = false,
    className,
    children,
    type = "button",
    disabled = false,
    ...props
  },
  ref
) {
  const classes = cn(
    "btn",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth && "w-full",
    loading && "cursor-wait",
    className
  );

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
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
    const external = href?.startsWith("http");
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
});

export default Button;
