import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "details > summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const INTERACTIVE_FIELDS = [
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
].join(",");

/**
 * Keeps keyboard focus inside a dialog while it is open, closes on Escape and
 * returns focus to whatever was focused before.
 */
export default function useFocusTrap(
  ref,
  active = true,
  { onEscape, initialFocus, restoreFocus = true } = {}
) {
  const previouslyFocused = useRef(null);
  const optionsRef = useRef({ onEscape, initialFocus, restoreFocus });

  useEffect(() => {
    optionsRef.current = { onEscape, initialFocus, restoreFocus };
  }, [onEscape, initialFocus, restoreFocus]);

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node || typeof document === "undefined") return undefined;

    previouslyFocused.current = document.activeElement;

    const focusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    const timer = setTimeout(() => {
      // Do not steal focus if the user has already focused a control inside the dialog.
      if (node.contains(document.activeElement) && document.activeElement !== node) {
        return;
      }

      const { initialFocus: currentInitialFocus } = optionsRef.current;
      // Move focus in: an explicit target, the first form field, any focusable control, or the container.
      const target =
        (typeof currentInitialFocus === "string"
          ? node.querySelector(currentInitialFocus)
          : currentInitialFocus) ||
        node.querySelector("[data-autofocus]") ||
        node.querySelector(INTERACTIVE_FIELDS) ||
        node.querySelector(FOCUSABLE) ||
        node;

      try {
        target.focus({ preventScroll: true });
        if (target === node) node.setAttribute("tabindex", "-1");
      } catch {
        /* focus can fail in odd embeds — the dialog is still usable */
      }
    }, 20);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        optionsRef.current.onEscape?.();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      node.removeEventListener("keydown", onKeyDown);
      const previous = previouslyFocused.current;
      if (optionsRef.current.restoreFocus && previous && typeof previous.focus === "function") {
        try {
          previous.focus({ preventScroll: true });
        } catch {
          /* element may be gone */
        }
      }
    };
  }, [ref, active]);
}
