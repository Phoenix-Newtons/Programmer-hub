import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps list filters in the URL (`?q=react&skill=DevOps&sort=rating`) so every
 * view is shareable, bookmarkable and survives back/forward navigation.
 *
 * Values equal to their default are removed from the URL to keep links clean.
 */
export default function useUrlFilters(defaults = {}) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const next = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      next[key] = params.get(key) ?? fallback;
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, JSON.stringify(defaults)]);

  const setValues = useCallback(
    (patch, { replace = true } = {}) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        const fallback = defaults[key];
        if (value === undefined || value === null || value === "" || value === fallback) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      setParams(next, { replace });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, setParams, JSON.stringify(defaults)]
  );

  const reset = useCallback(
    (keys = Object.keys(defaults), options) => {
      setValues(
        keys.reduce((patch, key) => ({ ...patch, [key]: defaults[key] }), {}),
        options
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setValues, JSON.stringify(defaults)]
  );

  const isFiltered = useMemo(
    () => Object.entries(defaults).some(([key, fallback]) => values[key] !== fallback),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, JSON.stringify(defaults)]
  );

  /** Absolute URL of the current view — handy for "copy link" buttons. */
  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  // Scroll to the top when the filters change so results are visible on mobile.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.scrollY < 200) return;
    if (!values.q) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [values.q, values.skill, values.type, values.category]);

  return { values, setValues, reset, isFiltered, shareUrl };
}
