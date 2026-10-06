import { forwardRef, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Search field with a clear button, an optional keyboard hint and support for
 * `"/"` to focus (wired by the page through the forwarded ref).
 */
const SearchInput = forwardRef(function SearchInput(
  { value, onChange, placeholder = "Search…", label, hint, className, id, onKeyDown, ...props },
  ref
) {
  const localRef = useRef(null);
  const inputRef = ref || localRef;

  return (
    <div className={cn("relative flex-1", className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.stopPropagation();
            onChange?.("");
          }
          onKeyDown?.(event);
        }}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className="field pl-11 pr-24 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange?.("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-white/10 hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      ) : hint ? (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-muted sm:block">
          {hint}
        </kbd>
      ) : null}
    </div>
  );
});

export default SearchInput;
