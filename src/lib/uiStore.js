import { createStore, useStore } from "./store";

/**
 * Shared UI state that several distant components care about:
 * the command palette and the mobile navigation drawer.
 */
const uiStore = createStore({ paletteOpen: false, paletteQuery: "" });

export function openPalette(prefill = "") {
  uiStore.set({ paletteOpen: true, paletteQuery: prefill });
}

export function closePalette() {
  uiStore.set((state) => (state.paletteOpen ? { ...state, paletteOpen: false } : state));
}

export function togglePalette() {
  const { paletteOpen } = uiStore.get();
  if (paletteOpen) closePalette();
  else openPalette();
}

export function setPaletteQuery(paletteQuery) {
  uiStore.set((state) => ({ ...state, paletteQuery }));
}

export function usePalette() {
  const state = useStore(uiStore);
  return {
    ...state,
    open: state.paletteOpen,
    openPalette,
    closePalette,
    togglePalette,
    setQuery: setPaletteQuery,
  };
}
