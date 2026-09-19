import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "ph-theme";

const QUERY = "(prefers-color-scheme: light)";

function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia(QUERY).matches ? "light" : "dark";
}

/** Stored preference: "system" | "light" | "dark". Defaults to following the OS. */
function getInitialMode() {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#070b18" : "#f7f8fc");
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode);
  const [system, setSystem] = useState(systemTheme);

  const theme = mode === "system" ? system : mode;

  // Keep `theme` in the DOM and remember the explicit choice.
  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage disabled — the session still works */
    }
  }, [theme, mode]);

  // Follow the OS while in "system" mode.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia(QUERY);
    const onChange = (event) => setSystem(event.matches ? "light" : "dark");
    list.addEventListener?.("change", onChange);
    return () => list.removeEventListener?.("change", onChange);
  }, []);

  const setMode = useCallback((next) => setModeState(next), []);
  const toggleTheme = useCallback(() => {
    setModeState(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const value = useMemo(
    () => ({ mode, theme, isDark: theme === "dark", setMode, toggleTheme }),
    [mode, theme, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
