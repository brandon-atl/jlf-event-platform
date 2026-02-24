"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TreePine, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/theme";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: colors.cream }}
      >
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: colors.cream }}>
      {/* Header */}
      <header
        className="border-b border-white/20 shadow-sm"
        style={{ background: colors.canopy }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/15">
              <TreePine size={16} className="text-white" />
            </div>
            <div>
              <p
                className="text-sm font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-dm-serif), serif" }}
              >
                Just Love Forest
              </p>
              <p className="text-[10px] text-white/60 uppercase tracking-widest">
                Co-Creator Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{user.name}</span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
              title="Sign out"
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
