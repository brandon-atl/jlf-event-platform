"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, MapPin, ChevronRight } from "lucide-react";

import { events as eventsApi, type EventResponse } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { formatDateShort, isEventPast } from "@/lib/format";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function DayOfPage() {
  const router = useRouter();
  const { isDark } = useDarkMode();
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve({
          data: DEMO_EVENTS as unknown as EventResponse[],
          meta: { total: DEMO_EVENTS.length, page: 1, per_page: 50 },
        });
      }
      return eventsApi.list({ status: "active", per_page: 50 });
    },
  });

  const activeEvents = data?.data?.filter((e) => e.status === "active" && !isEventPast(e))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>
          Logistics
        </p>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Day-of View
        </h2>
        <p className="text-sm mt-0.5" style={{ color: textMuted }}>
          Select an event to view day-of logistics
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5 h-24 animate-pulse"
              style={{ background: cardBg, borderColor }}
            />
          ))}
        </div>
      ) : activeEvents.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center shadow-sm" style={{ background: cardBg, borderColor }}>
          <p className="text-sm" style={{ color: textMuted }}>
            No active events. Create an event to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeEvents.map((event, i) => (
            <div
              key={event.id}
              onClick={() => router.push(`/day-of/${event.id}`)}
              className="rounded-2xl border p-5 flex items-center gap-5 cursor-pointer hover:translate-y-[-2px] active:translate-y-0 transition-all duration-250 group shadow-sm animate-in slide-in-from-bottom-2 fade-in"
              style={{
                background: cardBg,
                borderColor,
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${isDark ? darkColors.canopy : colors.canopy}10` }}
              >
                <MapPin size={24} style={{ color: isDark ? darkColors.canopy : colors.canopy }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-bold truncate group-hover:opacity-80 transition mb-1"
                  style={{ color: textMain }}
                >
                  {event.name}
                </h3>
                <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: textMuted }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {formatDateShort(event.event_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    {event.complete_count} confirmed
                  </span>
                  {event.pending_count > 0 && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        color: isDark ? darkColors.sun : "#92700c",
                        borderColor: isDark ? `${darkColors.sun}50` : "#92700c50",
                        background: isDark ? `${darkColors.sun}12` : "#92700c12",
                      }}
                    >
                      {event.pending_count} pending
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="transition shrink-0"
                style={{ color: textMuted }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
