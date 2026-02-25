"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, BarChart3, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

import { events as eventsApi, type EventResponse } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { formatDateShort, isEventPast } from "@/lib/format";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function DashboardPage() {
  const router = useRouter();
  const { isDark } = useDarkMode();
  const [showPast, setShowPast] = useState(false);
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
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
      return eventsApi.list({ per_page: 50 });
    },
  });

  const allEvents = data?.data ?? [];
  const upcoming = allEvents.filter(e => !isEventPast(e)).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = allEvents.filter(e => isEventPast(e)).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>
          Analytics
        </p>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Dashboard
        </h2>
        <p className="text-sm mt-0.5" style={{ color: textMuted }}>
          Select an event to view its dashboard
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
      ) : allEvents.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center shadow-sm" style={{ background: cardBg, borderColor }}>
          <p className="text-sm" style={{ color: textMuted }}>
            No events yet. Create an event to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {upcoming.map((event, i) => (
              <DashboardEventRow key={event.id} event={event} isPast={false} idx={i} router={router} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textMain={textMain} textMuted={textMuted} />
            ))}
          </div>
          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition"
                style={{ color: textMuted }}
                aria-expanded={showPast}
              >
                {past.length} past event{past.length !== 1 ? "s" : ""}
                {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showPast && (
                <div className="grid gap-3 mt-2">
                  {past.map((event, i) => (
                    <DashboardEventRow key={event.id} event={event} isPast idx={i} router={router} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textMain={textMain} textMuted={textMuted} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardEventRow({ event, isPast, idx, router, isDark, cardBg, borderColor, textMain, textMuted }: {
  event: EventResponse;
  isPast: boolean;
  idx: number;
  router: ReturnType<typeof import("next/navigation").useRouter>;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textMain: string;
  textMuted: string;
}) {
  const accent = isPast ? textMuted : (isDark ? darkColors.canopy : colors.canopy);
  const statusLabel = isPast ? "Past" : event.status;
  return (
    <div
      onClick={() => router.push(`/dashboard/${event.id}`)}
      className="rounded-2xl border p-5 flex items-center gap-5 cursor-pointer hover:translate-y-[-2px] active:translate-y-0 transition-all duration-250 group shadow-sm animate-in slide-in-from-bottom-2 fade-in"
      style={{ background: cardBg, borderColor, opacity: isPast ? 0.6 : 1, animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${accent}10` }}>
        <BarChart3 size={24} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold truncate group-hover:opacity-80 transition mb-1" style={{ color: textMain }}>
          {event.name}
        </h3>
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: textMuted }}>
          <span className="flex items-center gap-1"><Calendar size={13} />{formatDateShort(event.event_date)}</span>
          <span className="flex items-center gap-1"><Users size={13} />{event.complete_count} confirmed</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: accent, background: `${accent}12` }}>
            {statusLabel}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="transition shrink-0" style={{ color: textMuted }} />
    </div>
  );
}
