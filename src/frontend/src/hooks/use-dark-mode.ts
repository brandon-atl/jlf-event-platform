"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("jlf-theme") as Theme | null;
    setThemeState(stored || "light");
    setMounted(true);
  }, []);

  // Apply the class to <html>
  useEffect(() => {
    if (!mounted) return;

    const resolved = theme === "system" ? getSystemTheme() : theme;
    const root = document.documentElement;

    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, mounted]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("jlf-theme", t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const isDark =
    theme === "dark" || (theme === "system" && mounted && getSystemTheme() === "dark");

  return { theme, setTheme, toggle, isDark, mounted };
}
