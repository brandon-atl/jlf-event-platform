"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AttendeeSheet } from "@/components/dashboard/attendee-sheet";
import { CheckCircle2, Circle, MapPin, Send, Video, Users } from "lucide-react";
import { toast } from "sonner";

import { dashboard, events as eventsApi, notifications, registrations as registrationsApi, type EventResponse, type EventDashboard, type RegistrationDetail } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS, DEMO_DASHBOARD, DEMO_REGISTRATIONS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";

export default function DayOfPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { isDark } = useDarkMode();

  // Interactive attendee sheet
  type FilterConfig = { label: string; subtitle: string; status?: string; accom?: string; dietary?: string };
  const [activeFilter, setActiveFilter] = useState<FilterConfig | null>(null);

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

  const queryClient = useQueryClient();
  const [rosterTab, setRosterTab] = useState<"all" | "checked_in" | "pending">("all");

  // Full confirmed attendee list for the check-in roster
  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ["registrations", eventId, "complete"],
    queryFn: async () => {
      if (isDemoMode()) {
        return DEMO_REGISTRATIONS(eventId).data.filter((r) => r.status === "complete") as RegistrationDetail[];
      }
      const res = await registrationsApi.list(eventId, { status: "complete", per_page: 500 });
      return res.data;
    },
  });

  // Roster cache key — shared so mutations can update it directly in demo mode
  const rosterCacheKey = ["registrations", eventId, "complete"];

  const checkInMutation = useMutation({
    mutationFn: ({ regId }: { regId: string; }): Promise<RegistrationDetail> => {
      if (isDemoMode()) {
        // Optimistically update the cached roster without hitting the real API
        const current = queryClient.getQueryData<RegistrationDetail[]>(rosterCacheKey) ?? [];
        const updated = current.map((r) =>
          r.id === regId
            ? { ...r, checked_in_at: new Date().toISOString(), checked_in_by: "demo@justloveforest.com" }
            : r
        );
        queryClient.setQueryData(rosterCacheKey, updated);
        return Promise.resolve(updated.find((r) => r.id === regId)!);
      }
      return registrationsApi.checkIn(eventId, regId);
    },
    onSuccess: () => {
      if (!isDemoMode()) queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
      toast.success("Checked in ✓");
    },
    onError: () => toast.error("Check-in failed"),
  });

  const undoCheckInMutation = useMutation({
    mutationFn: ({ regId }: { regId: string; }): Promise<RegistrationDetail> => {
      if (isDemoMode()) {
        const current = queryClient.getQueryData<RegistrationDetail[]>(rosterCacheKey) ?? [];
        const updated = current.map((r) =>
          r.id === regId ? { ...r, checked_in_at: null, checked_in_by: null } : r
        );
        queryClient.setQueryData(rosterCacheKey, updated);
        return Promise.resolve(updated.find((r) => r.id === regId)!);
      }
      return registrationsApi.undoCheckIn(eventId, regId);
    },
    onSuccess: () => {
      if (!isDemoMode()) queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
      toast.success("Check-in undone");
    },
    onError: () => toast.error("Failed to undo check-in"),
  });

  const { data: sheetRegs, isLoading: sheetLoading } = useQuery({
    queryKey: ["registrations", eventId, activeFilter?.status, activeFilter?.accom, activeFilter?.dietary],
    queryFn: async () => {
      if (isDemoMode()) {
        const all = DEMO_REGISTRATIONS(eventId).data as unknown as RegistrationDetail[];
        let filtered = all;
        if (activeFilter?.status) filtered = filtered.filter((r) => r.status === activeFilter.status);
        if (activeFilter?.accom) filtered = filtered.filter((r) => r.accommodation_type?.replace(/ /g, "_") === activeFilter.accom);
        if (activeFilter?.dietary === "none") {
          filtered = filtered.filter((r) => !r.dietary_restrictions || r.dietary_restrictions === "" || r.dietary_restrictions === "None");
        } else if (activeFilter?.dietary) {
          filtered = filtered.filter((r) => r.dietary_restrictions?.toLowerCase().includes(activeFilter.dietary!.toLowerCase()));
        }
        return filtered;
      }
      const res = await registrationsApi.list(eventId, { status: activeFilter?.status, per_page: 500 });
      let data = res.data;
      if (activeFilter?.accom) data = data.filter((r) => r.accommodation_type?.replace(/ /g, "_") === activeFilter.accom);
      if (activeFilter?.dietary === "none") {
        data = data.filter((r) => !r.dietary_restrictions || r.dietary_restrictions === "" || r.dietary_restrictions === "None");
      } else if (activeFilter?.dietary) {
        data = data.filter((r) => r.dietary_restrictions?.toLowerCase().includes(activeFilter.dietary!.toLowerCase()));
      }
      return data;
    },
    enabled: !!activeFilter,
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

      {/* Hero Confirmed Count — tap number or pills to drill into list */}
      <div
        className="rounded-2xl p-8 text-center text-white"
        style={{
          background: `linear-gradient(135deg, ${colors.forest}, ${colors.canopy})`,
        }}
      >
        <button
          type="button"
          className="group"
          onClick={() => setActiveFilter({ label: "Confirmed Attendees", subtitle: "Completed registrations", status: "complete" })}
        >
          <p
            className="text-7xl font-bold tracking-tight group-hover:opacity-80 transition"
            style={{ fontFamily: "var(--font-dm-serif), serif" }}
          >
            {sb.complete}
          </p>
          <p className="text-base opacity-80 mt-1 font-medium group-hover:opacity-100 transition">
            Confirmed Attendees
          </p>
        </button>
        <div className="flex justify-center gap-6 mt-4 text-sm opacity-70">
          <button
            type="button"
            className="hover:opacity-100 transition underline-offset-2 hover:underline"
            onClick={() => setActiveFilter({ label: "Pending Payment", subtitle: `${sb.pending_payment} awaiting checkout`, status: "pending_payment" })}
          >
            {sb.pending_payment} pending
          </button>
          <button
            type="button"
            className="hover:opacity-100 transition underline-offset-2 hover:underline"
            onClick={() => setActiveFilter({ label: "Expired", subtitle: `${sb.expired} checkout timed out`, status: "expired" })}
          >
            {sb.expired} expired
          </button>
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
            { l: "Bell Tent", v: acc.bell_tent, e: "⛺", a: "bell_tent" },
            { l: "Tipi Twin", v: acc.nylon_tent, e: "🏕️", a: "nylon_tent" },
            { l: "Self-Camp", v: acc.self_camping, e: "🌲", a: "self_camping" },
          ].map((t) => (
            <button
              key={t.l}
              type="button"
              className="p-4 rounded-xl hover:opacity-80 transition active:scale-95"
              style={{ background: subtleBg }}
              onClick={() => setActiveFilter({ label: t.l, subtitle: `${t.v} confirmed`, accom: t.a, status: "complete" })}
            >
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
            </button>
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
            { l: "Vegetarian", v: dietary["Vegetarian"] || 0, e: "🥬", d: "vegetarian" },
            { l: "Vegan", v: dietary["Vegan"] || 0, e: "🌱", d: "vegan" },
            { l: "Gluten-Free", v: dietary["Gluten-Free"] || dietary["Gluten-free"] || 0, e: "🚫", d: "gluten" },
            { l: "None / Not Specified", v: dietary["None"] || 0, e: "🍽️", d: "none" },
          ].map((d) => (
            <button
              key={d.l}
              type="button"
              className="w-full flex items-center justify-between p-3 rounded-xl hover:opacity-80 transition active:scale-[0.98] text-left"
              style={{ background: subtleBg }}
              onClick={() => setActiveFilter({ label: d.l, subtitle: `${d.v} attendees`, dietary: d.d })}
            >
              <span className="text-sm flex items-center gap-2" style={{ color: textSub }}>
                <span className="text-base">{d.e}</span>
                {d.l}
              </span>
              <span className="text-lg font-bold" style={{ color: textMain }}>
                {d.v}
              </span>
            </button>
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

      {/* Attendee Roster + Check-in */}
      {(() => {
        const roster = rosterData ?? [];
        const checkedIn = roster.filter((r) => r.checked_in_at);
        const notCheckedIn = roster.filter((r) => !r.checked_in_at);
        const displayed = rosterTab === "all" ? roster : rosterTab === "checked_in" ? checkedIn : notCheckedIn;
        return (
          <div className="rounded-2xl border shadow-sm" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: isDark ? darkColors.canopy : colors.canopy }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Attendee Roster
                </h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(52,211,153,0.15)" : "#d1fae5", color: isDark ? "#34d399" : "#065f46" }}>
                {checkedIn.length} / {roster.length} checked in
              </span>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-5 pb-3">
              {(["all", "checked_in", "pending"] as const).map((tab) => {
                const counts = { all: roster.length, checked_in: checkedIn.length, pending: notCheckedIn.length };
                const labels = { all: "All", checked_in: "✓ Checked In", pending: "Pending" };
                return (
                  <button
                    key={tab}
                    type="button"
                    className="text-xs px-3 py-1 rounded-full transition font-medium"
                    style={{
                      background: rosterTab === tab ? (isDark ? darkColors.canopy : colors.canopy) : (isDark ? darkColors.surfaceHover : "#f3f4f6"),
                      color: rosterTab === tab ? "#fff" : textSub,
                    }}
                    onClick={() => setRosterTab(tab)}
                  >
                    {labels[tab]} ({counts[tab]})
                  </button>
                );
              })}
            </div>

            <div className="divide-y" style={{ borderColor }}>
              {rosterLoading && (
                <div className="p-5 text-center text-sm" style={{ color: textMuted }}>Loading roster…</div>
              )}
              {!rosterLoading && displayed.length === 0 && (
                <div className="p-5 text-center text-sm" style={{ color: textMuted }}>No attendees in this group</div>
              )}
              {!rosterLoading && displayed.map((reg) => {
                const isCheckedIn = !!reg.checked_in_at;
                const isPending = checkInMutation.isPending && checkInMutation.variables?.regId === reg.id;
                const isUndoPending = undoCheckInMutation.isPending && undoCheckInMutation.variables?.regId === reg.id;
                const isBusy = isPending || isUndoPending;
                return (
                  <div
                    key={reg.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors"
                    style={{ background: isCheckedIn ? (isDark ? "rgba(52,211,153,0.05)" : "rgba(209,250,229,0.3)") : "transparent" }}
                  >
                    {/* Checkbox toggle — click to check in / undo */}
                    <button
                      type="button"
                      disabled={isBusy}
                      title={isCheckedIn ? "Undo check-in" : "Mark as checked in"}
                      className="flex-shrink-0 transition-transform active:scale-90 disabled:opacity-50"
                      onClick={() => isCheckedIn
                        ? undoCheckInMutation.mutate({ regId: reg.id })
                        : checkInMutation.mutate({ regId: reg.id })
                      }
                    >
                      {isBusy ? (
                        <div
                          className="w-[22px] h-[22px] rounded-full border-2 animate-spin"
                          style={{ borderColor: isDark ? "#34d399" : "#059669", borderTopColor: "transparent" }}
                        />
                      ) : isCheckedIn ? (
                        <CheckCircle2 size={22} style={{ color: isDark ? "#34d399" : "#059669" }} />
                      ) : (
                        <Circle size={22} style={{ color: textMuted }} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: textMain }}>{reg.attendee_name ?? "—"}</p>
                      <p className="text-xs truncate" style={{ color: textMuted }}>
                        {[reg.accommodation_type?.replace(/_/g, " "), reg.dietary_restrictions].filter(Boolean).join(" · ")}
                      </p>
                      {isCheckedIn && reg.checked_in_at && (
                        <p className="text-[10px] mt-0.5" style={{ color: isDark ? "#34d399" : "#059669" }}>
                          Checked in {new Date(reg.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* Interactive attendee sheet */}
      <AttendeeSheet
        isOpen={!!activeFilter}
        onClose={() => setActiveFilter(null)}
        title={activeFilter?.label ?? ""}
        subtitle={activeFilter?.subtitle}
        registrations={sheetRegs ?? []}
        loading={sheetLoading}
      />

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
