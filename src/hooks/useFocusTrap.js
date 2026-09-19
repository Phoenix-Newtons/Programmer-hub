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

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    if (!node || typeof document === "undefined") return undefined;

    previouslyFocused.current = document.activeElement;

    const focusables = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus in: an explicit target, the first field, or the container.
    const target =
      (typeof initialFocus === "string" ? node.querySelector(initialFocus) : initialFocus) ||
      node.querySelector("[data-autofocus]") ||
      node.querySelector("input, textarea, select, button") ||
      node;

    const timer = setTimeout(() => {
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
        onEscape?.();
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
      if (restoreFocus && previous && typeof previous.focus === "function") {
        try {
          previous.focus({ preventScroll: true });
        } catch {
          /* element may be gone */
        }
      }
    };
  }, [ref, active, onEscape, initialFocus, restoreFocus]);
}
