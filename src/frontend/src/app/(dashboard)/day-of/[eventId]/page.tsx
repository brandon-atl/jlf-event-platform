"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Send } from "lucide-react";
import { toast } from "sonner";

import { dashboard, events as eventsApi, notifications } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function DayOfPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.get(eventId),
  });

  const { data: dash } = useQuery({
    queryKey: ["dashboard", eventId],
    queryFn: () => dashboard.event(eventId),
  });

  if (!event || !dash) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const sb = dash.status_breakdown;
  const acc = dash.accommodation_breakdown;
  const dietary = dash.dietary_summary;
  const vegCount = (dietary["Vegetarian"] || 0) + (dietary["Vegan"] || 0);
  const veganCount = dietary["Vegan"] || 0;

  const handleSendSms = async () => {
    try {
      await notifications.sendSms(eventId, `Reminder: ${event?.name} is today! See you at the forest 🌲`);
      toast.success(`Day-of SMS sent to ${sb.complete} attendees`);
    } catch {
      toast.error("Failed to send SMS");
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center py-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Day-of Logistics
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">{event.name}</p>
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

      {/* Tents Needed */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Tents Needed
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { l: "Bell Tent", v: acc.bell_tent, e: "⛺" },
            { l: "Nylon Tent", v: acc.nylon_tent, e: "🏕️" },
            { l: "Self-Camp", v: acc.self_camping, e: "🌲" },
          ].map((t) => (
            <div key={t.l} className="p-4 rounded-xl bg-gray-50">
              <div className="text-3xl mb-1">{t.e}</div>
              <p
                className="text-3xl font-bold"
                style={{
                  color: colors.forest,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                {t.v}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dietary Requirements */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
            >
              <span className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-base">{d.e}</span>
                {d.l}
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: colors.forest }}
              >
                {d.v}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 text-center">
          <p className="text-sm font-semibold" style={{ color: colors.canopy }}>
            Total plant-based: {vegCount}
          </p>
          <p className="text-xs" style={{ color: colors.moss }}>
            ({veganCount} fully vegan)
          </p>
        </div>
      </div>

      {/* Meeting Points */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Meeting Points
        </h3>
        <div className="space-y-2">
          {event.meeting_point_a && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl text-white"
              style={{ background: colors.canopy }}
            >
              <MapPin size={18} className="shrink-0" />
              <div>
                <p className="text-[10px] font-semibold opacity-70">Point A</p>
                <p className="text-sm font-medium">{event.meeting_point_a}</p>
              </div>
            </div>
          )}
          {event.meeting_point_b && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50">
              <MapPin size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-gray-400">
                  Point B
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {event.meeting_point_b}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send SMS Button */}
      <button
        onClick={handleSendSms}
        className="w-full py-4 text-white font-semibold rounded-2xl transition shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2.5 text-base"
        style={{ background: colors.canopy }}
      >
        <Send size={18} />
        Send Day-of SMS to All
      </button>
    </div>
  );
}
