"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TreePine, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { isDark } = useDarkMode();

  const pageBg = isDark ? darkColors.cream : colors.cream;
  const headerBg = isDark ? darkColors.surface : colors.canopy;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: pageBg }}
      >
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: pageBg }}>
      {/* Header */}
      <header
        className="border-b shadow-sm"
        style={{ background: headerBg, borderColor: isDark ? darkColors.surfaceBorder : "rgba(255,255,255,0.2)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? darkColors.canopy : "rgba(255,255,255,0.15)" }}
            >
              <TreePine size={16} className={isDark ? "text-black" : "text-white"} />
            </div>
            <div>
              <p
                className="text-sm font-bold tracking-tight"
                style={{ color: isDark ? darkColors.textPrimary : "white", fontFamily: "var(--font-dm-serif), serif" }}
              >
                Just Love Forest
              </p>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: isDark ? darkColors.textMuted : "rgba(255,255,255,0.6)" }}
              >
                Co-Creator Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: isDark ? darkColors.textSecondary : "rgba(255,255,255,0.8)" }}
            >
              {user.name}
            </span>
            <DarkModeToggle />
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-lg transition"
              style={{ color: isDark ? darkColors.textMuted : "rgba(255,255,255,0.6)" }}
              title="Sign out"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? darkColors.textPrimary : "white";
                e.currentTarget.style.background = !isDark ? "rgba(255,255,255,0.15)" : "transparent";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? darkColors.textMuted : "rgba(255,255,255,0.6)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
