import { useCallback } from "react";
import { createStore, useStore } from "./store";

/**
 * Downloadable-app (PWA install) plumbing — one app, every device.
 *
 * The hub is installable from the same codebase on:
 *  - Android / Chrome / Edge / Samsung Internet → the native
 *    `beforeinstallprompt` flow (captured here, replayed on user tap),
 *  - iOS / iPadOS Safari → there is no prompt API, so the UI falls back to
 *    guided "Share → Add to Home Screen" instructions,
 *  - desktop Chrome / Edge → the same captured prompt (or the address-bar
 *    install icon, explained in the instructions).
 *
 * `initInstallCapture()` must run once, as early as possible (main.jsx),
 * because Chrome fires `beforeinstallprompt` a single time — often before
 * the first component that cares has mounted. The deferred event is kept in
 * a tiny external store so any component can consume it later.
 */

const installStore = createStore({ deferredPrompt: null, installed: false });

let initialised = false;

/** True when the app already runs installed (home screen / app window). */
export function isStandaloneDisplay(win = typeof window !== "undefined" ? window : undefined) {
  if (!win) return false;
  try {
    if (win.matchMedia?.("(display-mode: standalone)").matches) return true;
    if (win.matchMedia?.("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* matchMedia unavailable */
  }
  // iOS Safari's legacy flag.
  return Boolean(win.navigator?.standalone);
}

/** "ios" | "android" | "desktop" — drives which install steps we show. */
export function detectInstallPlatform(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
  maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0
) {
  const ua = String(userAgent);
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ masquerades as macOS but has multi-touch.
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** Registers the one-time browser listeners. Safe to call repeatedly. */
export function initInstallCapture() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  if (isStandaloneDisplay()) installStore.set({ installed: true });

  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's mini-infobar: we surface our own Install buttons/banner.
    event.preventDefault();
    installStore.set({ deferredPrompt: event, installed: false });
  });

  window.addEventListener("appinstalled", () => {
    installStore.set({ deferredPrompt: null, installed: true });
  });
}

/** Test seam + manual reset. */
export function __setInstallStateForTests(next) {
  installStore.set((state) => ({ ...state, ...next }));
}

/**
 * Reactive install state for components.
 * `promptInstall()` resolves to "accepted" | "dismissed" | "unavailable"
 * ("unavailable" → show the manual instructions instead).
 */
export function useInstallApp() {
  const state = useStore(installStore);
  const installed = state.installed || isStandaloneDisplay();

  const promptInstall = useCallback(async () => {
    const event = installStore.get().deferredPrompt;
    if (!event?.prompt) return "unavailable";
    try {
      await event.prompt();
      const choice = await event.userChoice;
      // A deferred prompt can only be spent once.
      installStore.set({ deferredPrompt: null });
      if (choice?.outcome === "accepted") installStore.set({ installed: true });
      return choice?.outcome || "dismissed";
    } catch {
      installStore.set({ deferredPrompt: null });
      return "unavailable";
    }
  }, []);

  return {
    /** A native prompt is captured and ready to fire. */
    canPrompt: Boolean(state.deferredPrompt),
    installed,
    platform: detectInstallPlatform(),
    promptInstall,
  };
}
