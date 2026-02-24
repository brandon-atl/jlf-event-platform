"use client";

import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";

export function DarkModeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { isDark, toggle, mounted } = useDarkMode();

  // Prevent hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <div
        className={`${
          collapsed ? "w-8 h-8" : "w-9 h-9"
        } rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse`}
      />
    );
  }

  return (
    <button
      onClick={toggle}
      className={`
        relative ${collapsed ? "w-8 h-8" : "w-9 h-9"} rounded-xl
        flex items-center justify-center
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        group overflow-hidden
        ${
          isDark
            ? "bg-[#1a2332] hover:bg-[#243044] shadow-inner"
            : "bg-amber-50 hover:bg-amber-100"
        }
      `}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon */}
      <Sun
        size={15}
        className={`
          absolute transition-all duration-300 ease-out
          ${
            isDark
              ? "opacity-0 rotate-90 scale-0 text-amber-400"
              : "opacity-100 rotate-0 scale-100 text-amber-600"
          }
        `}
      />
      {/* Moon icon */}
      <Moon
        size={15}
        className={`
          absolute transition-all duration-300 ease-out
          ${
            isDark
              ? "opacity-100 rotate-0 scale-100 text-blue-300"
              : "opacity-0 -rotate-90 scale-0 text-blue-400"
          }
        `}
      />
      {/* Ambient glow */}
      <div
        className={`
          absolute inset-0 rounded-xl transition-opacity duration-500
          ${isDark ? "opacity-30" : "opacity-0"}
        `}
        style={{
          background: "radial-gradient(circle at 60% 40%, #6366f120, transparent 70%)",
        }}
      />
    </button>
  );
}
