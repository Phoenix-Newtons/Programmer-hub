import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import useFocusTrap from "../../hooks/useFocusTrap";

const WIDTHS = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Accessible dialog: trapped focus, Escape to close, scroll lock, restore
 * focus on close and a labelled heading for screen readers.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  size = "md",
  footer,
  closeOnBackdrop = true,
  labelledBy,
}) {
  const panelRef = useRef(null);
  const generatedId = useId();
  const titleId = labelledBy || `modal-title-${generatedId}`;

  useFocusTrap(panelRef, open, {
    onEscape: () => onClose?.(),
    initialFocus: "[data-autofocus]",
  });

  // Lock body scroll while the dialog is open (without the layout jumping).
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={closeOnBackdrop ? () => onClose?.() : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[100dvh] w-full animate-rise flex-col overflow-hidden rounded-t-3xl border border-line-strong bg-surface-solid shadow-2xl sm:max-h-[90vh] sm:rounded-3xl",
          WIDTHS[size] || WIDTHS.md
        )}
      >
        <div className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-black/10 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
