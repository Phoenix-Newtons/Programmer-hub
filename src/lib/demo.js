import { createStore, bumpData, useStore } from "./store";

/**
 * Sample-data mode.
 *
 * `VITE_DEMO_DATA=true` turns it on for a whole deployment; visitors can also
 * flip it at runtime from the banner, the footer or the command palette so the
 * UI can be reviewed before a Supabase project has real rows. The choice is
 * remembered per browser in `localStorage` and always surfaced in the UI —
 * sample rows are never passed off as real people.
 */
const DEFAULT_ENABLED = import.meta.env.VITE_DEMO_DATA === "true";

const demoStore = createStore({ enabled: DEFAULT_ENABLED }, { storageKey: "ph:demo-data" });

export const DEMO_DEFAULT = DEFAULT_ENABLED;

export function isDemoMode() {
  return Boolean(demoStore.get().enabled);
}

export function setDemoMode(enabled) {
  const next = Boolean(enabled);
  if (next === isDemoMode()) return;
  demoStore.set({ enabled: next });
  // Every collection re-fetches so the switch takes effect immediately.
  bumpData();
}

export function toggleDemoMode() {
  setDemoMode(!isDemoMode());
}

/** Re-renders the caller whenever sample data is switched on or off. */
export function useDemoMode() {
  return Boolean(useStore(demoStore).enabled);
}
