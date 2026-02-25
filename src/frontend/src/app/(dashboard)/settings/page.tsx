"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Settings2, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

import { events as eventsApi, type EventResponse } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { formatDateShort, isEventPast } from "@/lib/format";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function SettingsPage() {
  const router = useRouter();
  const { isDark } = useDarkMode();
  const [showPast, setShowPast] = useState(false);
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
      return eventsApi.list({ per_page: 50 });
    },
  });

  const eventList = data?.data ?? [];
  const upcoming = eventList.filter(e => !isEventPast(e)).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const past = eventList.filter(e => isEventPast(e)).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>
          Configuration
        </p>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Settings
        </h2>
        <p className="text-sm mt-0.5" style={{ color: textMuted }}>
          Select an event to configure
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
      ) : eventList.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center shadow-sm" style={{ background: cardBg, borderColor }}>
          <p className="text-sm" style={{ color: textMuted }}>
            No events yet. Create an event to configure settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {upcoming.map((event, i) => {
              const isPast = false;
              return (
                <EventRow key={event.id} event={event} isPast={isPast} idx={i} router={router} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textMain={textMain} textMuted={textMuted} />
              );
            })}
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
                    <EventRow key={event.id} event={event} isPast idx={i} router={router} isDark={isDark} cardBg={cardBg} borderColor={borderColor} textMain={textMain} textMuted={textMuted} />
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

function EventRow({ event, isPast, idx, router, isDark, cardBg, borderColor, textMain, textMuted }: {
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
  const statusLabel = isPast ? "Past" : event.status;
  const statusColor = isPast ? textMuted : (isDark ? darkColors.canopy : colors.canopy);
  return (
    <div
      onClick={() => router.push(`/settings/${event.id}`)}
      className="rounded-2xl border p-5 flex items-center gap-5 cursor-pointer hover:translate-y-[-2px] active:translate-y-0 transition-all duration-250 group shadow-sm animate-in slide-in-from-bottom-2 fade-in"
      style={{
        background: cardBg,
        borderColor,
        opacity: isPast ? 0.6 : 1,
        animationDelay: `${idx * 60}ms`,
        animationFillMode: "both",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${statusColor}10` }}
      >
        <Settings2 size={24} style={{ color: statusColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
          <h3 className="text-base font-bold truncate group-hover:opacity-80 transition" style={{ color: textMain }}>
            {event.name}
          </h3>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
          <span className="text-xs capitalize" style={{ color: textMuted }}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: textMuted }}>
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {formatDateShort(event.event_date)}
          </span>
          <span className="capitalize">
            {event.pricing_model === "free" ? "Free" : event.pricing_model === "donation" ? "Donation" : "Fixed Price"}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="transition shrink-0" style={{ color: textMuted }} />
    </div>
  );
}
