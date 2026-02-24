"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "jlf-theme";
const THEME_EVENT = "jlf-theme-change";
const VALID_THEMES = new Set<Theme>(["light", "dark", "system"]);

// ─── External store for cross-instance sync ───
let currentTheme: Theme = "light";

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(callback: () => void): () => void {
  // Listen for changes from other hook instances in same tab
  const handleCustom = () => callback();
  window.addEventListener(THEME_EVENT, handleCustom);

  // Listen for changes from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const raw = e.newValue as Theme | null;
      currentTheme = raw && VALID_THEMES.has(raw) ? raw : "light";
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(THEME_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Initialize from localStorage (runs once at module load in browser)
if (typeof window !== "undefined") {
  const raw = localStorage.getItem(STORAGE_KEY) as Theme | null;
  currentTheme = raw && VALID_THEMES.has(raw) ? raw : "light";
}

export function useDarkMode() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Apply class to <html> whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    currentTheme = t;
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
    // Notify other hook instances in same tab
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  }, [setTheme]);

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && getSystemTheme() === "dark");

  return { theme, setTheme, toggle, isDark, mounted: true };
}
