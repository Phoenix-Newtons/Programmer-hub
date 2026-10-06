import { forwardRef, useId } from "react";
import { cn } from "../../lib/utils";

export function Label({ htmlFor, children, hint, required }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="label mb-0">
        {children}
        {required ? <span className="ml-1 text-rose-400">*</span> : null}
      </label>
      {hint ? <span className="text-[0.7rem] text-muted">{hint}</span> : null}
    </div>
  );
}

const Field = forwardRef(function Field(
  { label, error, hint, required, className, as = "input", ...props },
  ref
) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const Component = as;

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <Label htmlFor={id} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      <Component
        ref={ref}
        id={id}
        className={cn("field", error && "border-rose-400/70 focus:shadow-[0_0_0_4px_rgb(244_63_94/0.15)]")}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-400">{error}</p> : null}
    </div>
  );
});

export default Field;
