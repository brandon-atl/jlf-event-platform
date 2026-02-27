"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  BarChart3,
  Sun,
  Users,
  UserPlus,
  Settings,
  TreePine,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { colors, darkColors } from "@/lib/theme";

const nav = [
  { icon: Calendar, label: "Events", href: "/events" },
  { icon: Users, label: "Attendees", href: "/attendees" },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Sun, label: "Day-of View", href: "/day-of" },
  { icon: UserPlus, label: "Co-Creators", href: "/co-creators" },
  { icon: FileText, label: "Form Builder", href: "/form-templates" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { isDark } = useDarkMode();

  // Resolved color set — swaps between light/dark
  const c = isDark ? darkColors : colors;
  const bg = isDark ? darkColors.cream : colors.cream;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const hoverBg = isDark ? darkColors.surfaceHover : "#f9fafb";

  // Redirect to login if not authenticated, or portal if co-creator
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user?.role === "co_creator") {
      router.push("/portal");
    }
  }, [isLoading, user, router]);

  if (!isLoading && !user) return null;
  if (!isLoading && user?.role === "co_creator") return null;

  const isActive = (href: string) => {
    if (href === "/events") return pathname === "/events";
    return pathname.startsWith(href);
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className="h-screen flex overflow-hidden transition-colors duration-300"
      style={{ background: bg }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={`fixed inset-0 z-30 lg:hidden ${isDark ? "bg-black/50" : "bg-black/30"}`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] lg:relative ${
          mobileOpen
            ? "translate-x-0 shadow-2xl w-60"
            : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[68px]" : "lg:w-60"}`}
        style={{
          background: cardBg,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        {/* Logo */}
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2.5"
          } p-4`}
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <Link
            href="/events"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition hover:scale-105 hover:shadow-md active:scale-95"
            style={{ background: c.canopy }}
            title="Home"
          >
            <TreePine size={16} className="text-white" />
          </Link>
          {!collapsed && (
            <Link href="/events" className="min-w-0 overflow-hidden text-left hover:opacity-70 transition">
              <p
                className="text-sm font-bold tracking-tight truncate"
                style={{
                  color: textMain,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                Just Love Forest
              </p>
              <p style={{ color: textMuted }} className="text-[10px] uppercase tracking-widest">
                Event Management
              </p>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto transition p-1 lg:hidden"
              style={{ color: textMuted }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 py-3 ${
            collapsed ? "px-1.5" : "px-2"
          } space-y-0.5 overflow-y-auto`}
        >
          {nav.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                title={collapsed ? n.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center ${
                  collapsed ? "justify-center" : "gap-3"
                } ${
                  collapsed ? "px-0 py-2.5" : "px-3 py-2.5"
                } rounded-xl text-sm font-medium transition-all duration-200 ${
                  active ? "text-white shadow-sm" : ""
                }`}
                style={
                  active
                    ? { background: c.canopy }
                    : { color: textSub }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.color = textMain;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = textSub;
                  }
                }}
              >
                <n.icon size={17} className="shrink-0" />
                {!collapsed && (
                  <span className="flex-1 text-left">{n.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center py-2.5 transition group"
          style={{
            borderTop: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            color: textMuted,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.color = textSub;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = textMuted;
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="transition group-hover:scale-110">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </div>
        </button>

        {/* User */}
        <div className={`p-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-3 mb-3 px-1"
            }`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: c.bark }}
            >
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: textMain }}>
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] capitalize" style={{ color: textMuted }}>
                  {user?.role || "Admin"}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${
              collapsed ? "justify-center mt-2" : "gap-3"
            } px-3 py-2.5 rounded-xl text-sm transition`}
            style={{ color: textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = hoverBg;
              e.currentTarget.style.color = textSub;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = textMuted;
            }}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-4 lg:px-6 shrink-0 transition-colors duration-300"
          style={{
            background: cardBg,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden active:scale-90 transition"
              style={{ color: textSub }}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-offset-2 transition"
              style={{ background: c.bark }}
              title={`${user?.name || "User"} — ${user?.role || "Admin"}`}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
