"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  BarChart3,
  Sun,
  UserPlus,
  Settings,
  TreePine,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/theme";

const nav = [
  { icon: Calendar, label: "Events", href: "/events" },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Sun, label: "Day-of View", href: "/day-of" },
  { icon: UserPlus, label: "Co-Creators", href: "/co-creators" },
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

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.push("/login");
    return null;
  }

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
      className="h-screen flex overflow-hidden"
      style={{ background: colors.cream }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] lg:relative ${
          mobileOpen
            ? "translate-x-0 shadow-2xl w-60"
            : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[68px]" : "lg:w-60"}`}
      >
        {/* Logo */}
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2.5"
          } p-4 border-b border-gray-50`}
        >
          <Link
            href="/events"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition hover:scale-105 hover:shadow-md active:scale-95"
            style={{ background: colors.canopy }}
            title="Home"
          >
            <TreePine size={16} className="text-white" />
          </Link>
          {!collapsed && (
            <Link href="/events" className="min-w-0 overflow-hidden text-left hover:opacity-70 transition">
              <p
                className="text-sm font-bold tracking-tight truncate"
                style={{
                  color: colors.forest,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                Just Love Forest
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                ERP System
              </p>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto text-gray-300 hover:text-gray-500 transition p-1 lg:hidden"
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
                  active
                    ? "text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={active ? { background: colors.canopy } : {}}
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
          className="hidden lg:flex items-center justify-center py-2.5 border-t border-b border-gray-50 text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition group"
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
              style={{ background: colors.bark }}
            >
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">
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
            } px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 active:scale-90 transition"
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-offset-2 transition"
              style={{ background: colors.bark }}
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
