"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/theme";
import { initials } from "@/lib/format";

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  "/events": "All Events",
  "/dashboard": "Dashboard",
  "/day-of": "Day-of View",
  "/co-creators": "Co-Creators",
  "/settings": "Settings",
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userInitials = user?.name ? initials(user.name) : "??";
  const pageLabel = PAGE_LABELS[pathname] || "";
  const isEventsRoot = pathname === "/events";

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700 active:scale-90 transition-all"
        >
          <Menu size={20} />
        </button>

        {isEventsRoot ? (
          <h1
            className="text-sm font-semibold hidden sm:block"
            style={{ color: colors.forest }}
          >
            All Events
          </h1>
        ) : (
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link
              href="/events"
              className="hover:text-gray-600 transition-colors cursor-pointer hover:underline"
            >
              Events
            </Link>
            <ChevronRight size={12} />
            <span className="text-gray-600 font-medium">{pageLabel}</span>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-offset-2 transition-all cursor-pointer active:scale-90"
          style={{ background: colors.bark }}
          title={`${user?.name || "User"} — ${user?.role || "Admin"}`}
        >
          {userInitials}
        </button>
      </div>
    </header>
  );
}
