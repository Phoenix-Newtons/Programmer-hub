import { useEffect } from "react";

/**
 * Registers a global keyboard shortcut.
 *
 *   useHotkeys("mod+k", openPalette);
 *   useHotkeys("/", focusSearch, { ignoreInputs: false });
 *
 * Supported keys: any `event.key` value plus the `mod` modifier (⌘ on macOS,
 * Ctrl elsewhere) and `shift` / `alt`.
 */
export default function useHotkeys(combo, handler, { enabled = true, ignoreInputs = true, preventDefault = true } = {}) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const parts = String(combo).toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const wantMod = parts.includes("mod");
    const wantShift = parts.includes("shift");
    const wantAlt = parts.includes("alt");

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.repeat) return;

      if (ignoreInputs) {
        const target = event.target;
        const tag = target?.tagName?.toLowerCase();
        const editable = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
        if (editable) return;
      }

      const hasMod = event.metaKey || event.ctrlKey;
      if (wantMod !== hasMod) return;
      if (wantShift && !event.shiftKey) return;
      if (wantAlt && !event.altKey) return;
      if (!wantShift && event.shiftKey && key.length === 1) return;

      const pressed = String(event.key || "").toLowerCase();
      if (pressed !== key) return;

      if (preventDefault) event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, handler, enabled, ignoreInputs, preventDefault]);
}
