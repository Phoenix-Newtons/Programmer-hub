import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Draft-preserving form state, backed by `localStorage`.
 *
 * Architecture
 * ------------
 * - Initial values are lazily restored from `storageKey` (merged over
 *   `defaultValues`, so new fields added later still get defaults).
 * - Every change is written back **debounced by 500 ms** (configurable), so
 *   typing never thrashes storage.
 * - A draft that is identical to the defaults is never persisted — that is
 *   what makes "clear on successful submit" stick instead of the empty form
 *   immediately re-saving itself.
 * - `restored` is `true` when a non-empty draft was recovered; the UI shows
 *   the "Draft restored from backup" notice until the user edits, dismisses
 *   it, or submits.
 * - `clearDraft()` is the *only* way the key is removed, and callers invoke
 *   it exclusively after a successful submit.
 *
 * SSR/private-mode safe: every storage access is guarded and falls back to
 * plain in-memory state.
 *
 * @template {Record<string, any>} T
 * @param {string} storageKey
 * @param {T} defaultValues
 * @param {{ debounceMs?: number }} [options]
 * @returns {{
 *   values: T, setValue: (key: string, value: any) => void,
 *   setValues: (next: Partial<T> | ((current: T) => T)) => void,
 *   handleChange: (event: any) => void,
 *   restored: boolean, dismissRestored: () => void,
 *   clearDraft: () => void, reset: () => void, dirty: boolean,
 * }}
 */

function readDraft(storageKey, defaultValues) {
  if (!storageKey || typeof window === "undefined") return { values: defaultValues, restored: false };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { values: defaultValues, restored: false };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return { values: defaultValues, restored: false };
    const values = { ...defaultValues, ...parsed };
    return { values, restored: !shallowEqual(values, defaultValues) };
  } catch {
    return { values: defaultValues, restored: false };
  }
}

function shallowEqual(a, b) {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

export default function usePersistentForm(storageKey, defaultValues, { debounceMs = 500 } = {}) {
  const defaultsRef = useRef(defaultValues);
  const initial = useMemo(() => readDraft(storageKey, defaultsRef.current), [storageKey]);
  const [values, setValuesState] = useState(initial.values);
  const [restored, setRestored] = useState(initial.restored);
  const saveTimer = useRef(null);
  // Guards the debounced writer against resurrecting a just-cleared draft.
  const clearedRef = useRef(false);
  // One-shot opt-out used when seeding a form programmatically (e.g. opening
  // "Post a Role" pre-filled with the signed-in user's company/email): the
  // seed is not a user draft and must not be backed up as one.
  const skipNextSaveRef = useRef(false);

  // When the key changes (e.g. messaging a different developer), swap drafts.
  const activeKeyRef = useRef(storageKey);
  useEffect(() => {
    if (activeKeyRef.current === storageKey) return;
    activeKeyRef.current = storageKey;
    clearedRef.current = false;
    const next = readDraft(storageKey, defaultsRef.current);
    setValuesState(next.values);
    setRestored(next.restored);
  }, [storageKey]);

  // Debounced persistence — 500 ms after the last keystroke.
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return undefined;
    if (clearedRef.current) return undefined;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }
    if (shallowEqual(values, defaultsRef.current)) return undefined;
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        /* quota / private mode — the in-memory form still works */
      }
    }, debounceMs);
    return () => clearTimeout(saveTimer.current);
  }, [values, storageKey, debounceMs]);

  const setValue = useCallback((key, value) => {
    clearedRef.current = false;
    setValuesState((current) => ({ ...current, [key]: value }));
  }, []);

  const setValues = useCallback((next) => {
    clearedRef.current = false;
    setValuesState((current) => (typeof next === "function" ? next(current) : { ...current, ...next }));
  }, []);

  /** Programmatic seeding that is not persisted as a user draft. */
  const seedValues = useCallback((next) => {
    skipNextSaveRef.current = true;
    setValuesState((current) => (typeof next === "function" ? next(current) : { ...current, ...next }));
  }, []);

  /** Convenience for `<input name="title" onChange={handleChange}>`. */
  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      if (name) setValue(name, type === "checkbox" ? checked : value);
    },
    [setValue]
  );

  /** Removes the backup and returns to defaults. Call ONLY after submit succeeds. */
  const clearDraft = useCallback(() => {
    clearedRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    setRestored(false);
    setValuesState(defaultsRef.current);
  }, [storageKey]);

  const reset = useCallback(() => {
    clearedRef.current = false;
    setValuesState(defaultsRef.current);
    setRestored(false);
  }, []);

  const dismissRestored = useCallback(() => setRestored(false), []);
  const dirty = useMemo(() => !shallowEqual(values, defaultsRef.current), [values]);

  return {
    values,
    setValue,
    setValues,
    seedValues,
    handleChange,
    restored,
    dismissRestored,
    clearDraft,
    reset,
    dirty,
  };
}
