"use client";

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
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/theme";
import { initials } from "@/lib/format";

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { icon: Calendar, label: "Events", href: "/events" },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Sun, label: "Day-of View", href: "/day-of" },
  { icon: UserPlus, label: "Co-Creators", href: "/co-creators" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function navigate(href: string) {
    router.push(href);
    onCloseMobile();
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const userInitials = user?.name ? initials(user.name) : "??";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex flex-col transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:relative",
          mobileOpen
            ? "translate-x-0 shadow-2xl w-60"
            : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-60",
          collapsed ? "sb-collapsed" : "sb-expanded",
        ].join(" ")}
      >
        {/* Logo header */}
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} p-4 border-b border-gray-50`}
        >
          <button
            onClick={() => navigate("/events")}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer"
            style={{ background: colors.canopy }}
            title="Home"
          >
            <TreePine size={16} className="text-white" />
          </button>
          {!collapsed && (
            <button
              onClick={() => navigate("/events")}
              className="min-w-0 overflow-hidden text-left sb-text hover:opacity-70 transition-opacity cursor-pointer"
            >
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
                Event Studio
              </p>
            </button>
          )}
          {!collapsed && (
            <button
              onClick={onCloseMobile}
              className="ml-auto text-gray-300 hover:text-gray-500 p-1 transition-colors lg:hidden"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 py-3 ${collapsed ? "px-1.5" : "px-2"} space-y-0.5 overflow-y-auto`}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                title={collapsed ? item.label : undefined}
                className={[
                  "w-full flex items-center rounded-xl text-sm font-medium transition-all",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                style={isActive ? { background: colors.canopy } : {}}
              >
                <item.icon size={17} className="shrink-0" />
                {!collapsed && (
                  <span className="flex-1 text-left sb-text">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center py-2.5 border-t border-b border-gray-50 text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all group"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="transition-transform group-hover:scale-110">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </div>
        </button>

        {/* User section */}
        <div className={`p-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3 mb-3 px-1"}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: colors.bark }}
            >
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0 sb-text">
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
            onClick={handleLogout}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${collapsed ? "justify-center mt-2" : "gap-3"} px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="sb-text">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
