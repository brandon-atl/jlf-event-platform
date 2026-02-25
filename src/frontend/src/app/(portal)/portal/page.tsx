"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, TreePine } from "lucide-react";
import { portal, PortalEvent } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { formatDate } from "@/lib/format";

export default function PortalEventsPage() {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const { data: eventsList = [], isLoading } = useQuery({
    queryKey: ["portal-events"],
    queryFn: portal.events,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-xl font-bold"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Your Events
        </h2>
        <p className="text-sm mt-0.5" style={{ color: textMuted }}>
          Events you have been assigned to co-manage
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-16" style={{ color: textMuted }}>
          <p className="text-sm">Loading events...</p>
        </div>
      )}

      {!isLoading && eventsList.length === 0 && (
        <div className="text-center py-16" style={{ color: textMuted }}>
          <TreePine size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No events assigned yet</p>
          <p className="text-xs mt-1">
            Ask an admin to assign you to events
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {eventsList.map((evt) => (
          <Link
            key={evt.id}
            href={`/portal/${evt.id}`}
            className="rounded-2xl border p-5 shadow-sm hover:shadow-md transition group"
            style={{ background: cardBg, borderColor }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p
                  className="font-bold transition"
                  style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
                >
                  {evt.name}
                </p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: textMuted }}>
                  {evt.event_type}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background:
                    evt.status === "active"
                      ? `${c.canopy}15`
                      : `${c.bark}15`,
                  color:
                    evt.status === "active" ? c.canopy : c.bark,
                }}
              >
                {evt.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs" style={{ color: textSub }}>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(evt.event_date)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {evt.complete_registrations} confirmed
                {evt.capacity && ` / ${evt.capacity}`}
              </span>
            </div>

            {evt.capacity && (
              <div className="mt-3">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: isDark ? darkColors.surfaceHover : "#f3f4f6" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (evt.complete_registrations / evt.capacity) * 100)}%`,
                      background: c.canopy,
                    }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
