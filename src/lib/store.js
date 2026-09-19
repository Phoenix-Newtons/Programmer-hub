import { useCallback, useSyncExternalStore } from "react";

/**
 * Minimal observable store used for app-wide client state (theme, demo mode,
 * shortlist, data revision). Zero dependencies and SSR-safe: every store works
 * with a real `localStorage` when available and silently falls back to memory.
 *
 *   const store = createStore({ count: 0 }, { storageKey: "demo:count" });
 *   store.set({ count: 1 });               // or store.set((s) => ({ ...s }))
 *   const { count } = useStore(store);
 */
export function createStore(initialState, { storageKey, merge = true } = {}) {
  let state = initialState;
  const listeners = new Set();

  if (storageKey && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        state =
          merge && isPlainObject(initialState) && isPlainObject(parsed)
            ? { ...initialState, ...parsed }
            : parsed;
      }
    } catch {
      /* corrupted or unavailable storage — keep the defaults */
    }
  }

  function persist() {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* private mode or quota exceeded — state still lives in memory */
    }
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  return {
    get: () => state,

    set(updater) {
      const next = typeof updater === "function" ? updater(state) : updater;
      // Bail out when nothing changed so subscribers don't re-render.
      if (isPlainObject(next) && isPlainObject(state) && shallowEqual(next, state)) return state;
      state = next;
      persist();
      emit();
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Drops persisted state and returns to the values passed at creation. */
    reset() {
      state = initialState;
      persist();
      emit();
    },
  };
}

/** Re-renders the component whenever the store changes. Returns whole state. */
export function useStore(store) {
  const getSnapshot = useCallback(() => store.get(), [store]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/* ------------------------------------------------------------------ *
 * Data revision bus
 * Any successful write (publish, edit, delete, demo toggle) bumps the
 * revision; every `useCollection` re-runs its fetcher so the whole app
 * stays consistent without a state library.
 * ------------------------------------------------------------------ */
const revisionStore = createStore({ revision: 0 });

export function bumpData() {
  revisionStore.set((state) => ({ revision: state.revision + 1 }));
}

export function getDataRevision() {
  return revisionStore.get().revision;
}

/** Subscribes a component to data changes — used as a fetch dependency. */
export function useDataRevision() {
  return useStore(revisionStore).revision;
}

/* ------------------------------------------------------------------ */

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shallowEqual(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.is(a[key], b[key]));
}
