import { createStore, useStore } from "./store";

/** Recently opened palette entries, newest first, capped at five. */
const MAX = 5;
const recentStore = createStore({ items: [] }, { storageKey: "ph:recents" });

export function pushRecent(entry) {
  if (!entry?.id || !entry?.to) return;
  const slim = {
    id: entry.id,
    label: entry.label,
    sublabel: entry.sublabel,
    group: entry.group,
    to: entry.to,
  };
  recentStore.set((state) => ({
    items: [slim, ...state.items.filter((item) => item.id !== entry.id)].slice(0, MAX),
  }));
}

export function clearRecents() {
  recentStore.set({ items: [] });
}

export function useRecents() {
  return useStore(recentStore).items;
}
