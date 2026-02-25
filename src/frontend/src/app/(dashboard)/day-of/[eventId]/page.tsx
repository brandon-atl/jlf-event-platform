"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Send, Video } from "lucide-react";
import { toast } from "sonner";

import { dashboard, events as eventsApi, notifications, type EventResponse, type EventDashboard } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS, DEMO_DASHBOARD } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function DayOfPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { isDark } = useDarkMode();

  const c = isDark ? darkColors : colors;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => {
      if (isDemoMode()) {
        const ev = DEMO_EVENTS.find(e => e.id === eventId) || DEMO_EVENTS[0];
        return Promise.resolve(ev as unknown as EventResponse);
      }
      return eventsApi.get(eventId);
    },
  });

  const { data: dash } = useQuery({
    queryKey: ["dashboard", eventId],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve(DEMO_DASHBOARD(eventId) as unknown as EventDashboard);
      return dashboard.event(eventId);
    },
  });

  if (!event || !dash) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: borderColor }} />
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: borderColor }} />
      </div>
    );
  }

  const sb = dash.status_breakdown;
  const acc = dash.accommodation_breakdown;
  const dietary = dash.dietary_summary;
  const vegCount = (dietary["Vegetarian"] || 0) + (dietary["Vegan"] || 0);
  const veganCount = dietary["Vegan"] || 0;

  // Hide accommodation for virtual/Zoom events
  const isVirtual =
    /zoom|virtual/i.test(event.event_type) ||
    (event.pricing_model === "free" && /zoom/i.test(event.meeting_point_a || ""));

  const handleSendSms = async () => {
    try {
      await notifications.sendSms(eventId, `Reminder: ${event?.name} is today! See you at the forest`);
      toast.success(`Day-of SMS sent to ${sb.complete} attendees`);
    } catch {
      toast.error("Failed to send SMS");
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center py-2">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: textMuted }}>
          Day-of Logistics
        </h2>
        <p className="text-xs mt-0.5" style={{ color: textMuted }}>{event.name}</p>
      </div>

      {/* Hero Confirmed Count */}
      <div
        className="rounded-2xl p-8 text-center text-white"
        style={{
          background: `linear-gradient(135deg, ${colors.forest}, ${colors.canopy})`,
        }}
      >
        <p
          className="text-7xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-dm-serif), serif" }}
        >
          {sb.complete}
        </p>
        <p className="text-base opacity-80 mt-1 font-medium">
          Confirmed Attendees
        </p>
        <div className="flex justify-center gap-6 mt-4 text-sm opacity-70">
          <span>{sb.pending_payment} pending</span>
          <span>{sb.expired} expired</span>
        </div>
      </div>

      {/* Tents Needed — hidden for virtual events */}
      {!isVirtual && (
      <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: textMuted }}>
          Tents Needed
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { l: "Bell Tent", v: acc.bell_tent, e: "⛺" },
            { l: "Nylon Tent", v: acc.nylon_tent, e: "🏕️" },
            { l: "Self-Camp", v: acc.self_camping, e: "🌲" },
          ].map((t) => (
            <div key={t.l} className="p-4 rounded-xl" style={{ background: subtleBg }}>
              <div className="text-3xl mb-1">{t.e}</div>
              <p
                className="text-3xl font-bold"
                style={{
                  color: textMain,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                {t.v}
              </p>
              <p className="text-xs mt-0.5" style={{ color: textMuted }}>{t.l}</p>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Dietary Requirements */}
      <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
          Dietary Requirements
        </h3>
        <div className="space-y-2">
          {[
            { l: "Vegetarian", v: dietary["Vegetarian"] || 0, e: "🥬" },
            { l: "Vegan", v: dietary["Vegan"] || 0, e: "🌱" },
            {
              l: "Gluten-Free",
              v: dietary["Gluten-Free"] || dietary["Gluten-free"] || 0,
              e: "🚫",
            },
          ].map((d) => (
            <div
              key={d.l}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: subtleBg }}
            >
              <span className="text-sm flex items-center gap-2" style={{ color: textSub }}>
                <span className="text-base">{d.e}</span>
                {d.l}
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: textMain }}
              >
                {d.v}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-xl border-2 border-dashed text-center" style={{
          borderColor: isDark ? `${darkColors.canopy}40` : "#a7f3d0",
          background: isDark ? `${darkColors.canopy}08` : "rgba(236,253,245,0.5)",
        }}>
          <p className="text-sm font-semibold" style={{ color: c.canopy }}>
            Total plant-based: {vegCount}
          </p>
          <p className="text-xs" style={{ color: c.moss }}>
            ({veganCount} fully vegan)
          </p>
        </div>
      </div>

      {/* Meeting Points */}
      <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
          Meeting Points
        </h3>
        <div className="space-y-2">
          {event.meeting_point_a && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl text-white"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
            >
              <MapPin size={18} className="shrink-0" />
              <div>
                <p className="text-[10px] font-semibold opacity-70">Point A</p>
                <p className="text-sm font-medium">{event.meeting_point_a}</p>
              </div>
            </div>
          )}
          {event.meeting_point_b && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: subtleBg, borderColor }}>
              <MapPin size={18} className="shrink-0" style={{ color: textMuted }} />
              <div>
                <p className="text-[10px] font-semibold" style={{ color: textMuted }}>
                  Point B
                </p>
                <p className="text-sm font-medium" style={{ color: textSub }}>
                  {event.meeting_point_b}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Meeting Link */}
      {event.virtual_meeting_url && /^https?:\/\//i.test(event.virtual_meeting_url) && (
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
            Virtual Meeting Link
          </h3>
          <a
            href={event.virtual_meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-xl text-white transition hover:opacity-90"
            style={{ background: isDark ? darkColors.canopy : colors.canopy }}
          >
            <Video size={18} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold opacity-70">Join Link</p>
              <p className="text-sm font-medium truncate">{event.virtual_meeting_url}</p>
            </div>
          </a>
        </div>
      )}

      {/* Send SMS Button */}
      <button
        onClick={handleSendSms}
        className="w-full py-4 text-white font-semibold rounded-2xl transition shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2.5 text-base"
        style={{ background: isDark ? darkColors.canopy : colors.canopy }}
      >
        <Send size={18} />
        Send Day-of SMS to All
      </button>
    </div>
  );
}
