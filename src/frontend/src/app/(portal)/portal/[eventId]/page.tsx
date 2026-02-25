"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Users, MapPin, DollarSign } from "lucide-react";
import { portal } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { formatDate, formatCents } from "@/lib/format";

export default function PortalEventDetailPage({
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

  const { data: event, isLoading } = useQuery({
    queryKey: ["portal-event", eventId],
    queryFn: () => portal.event(eventId),
  });

  if (isLoading) {
    return (
      <div className="text-center py-16" style={{ color: textMuted }}>
        <p className="text-sm">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16" style={{ color: textMuted }}>
        <p className="text-sm">Event not found</p>
      </div>
    );
  }

  // Compute summary stats
  const attendees = event.attendees ?? [];
  // Show the payment column when any attendee has a non-null payment_amount_cents.
  // This is effectively permission-based: the backend only populates
  // payment_amount_cents when the co-creator's `can_see_amounts` flag is true,
  // so the field is null for all attendees when the co-creator lacks permission.
  const showPayment = attendees.some((a) => a.payment_amount_cents != null);
  const accommodationCounts: Record<string, number> = {};
  const dietaryCounts: Record<string, number> = {};

  for (const att of attendees) {
    const accom = att.accommodation_type || "none";
    accommodationCounts[accom] = (accommodationCounts[accom] || 0) + 1;
    if (att.dietary_restrictions) {
      const diet = att.dietary_restrictions;
      dietaryCounts[diet] = (dietaryCounts[diet] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-sm transition hover:opacity-70"
        style={{ color: textMuted }}
      >
        <ArrowLeft size={14} />
        Back to events
      </Link>

      {/* Event header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{
                color: textMain,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              {event.name}
            </h2>
            <p className="text-sm mt-0.5 capitalize" style={{ color: textMuted }}>
              {event.event_type}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              background:
                event.status === "active"
                  ? `${c.canopy}15`
                  : `${c.bark}15`,
              color: event.status === "active" ? c.canopy : c.bark,
            }}
          >
            {event.status}
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm" style={{ color: textSub }}>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDate(event.event_date)}
            {event.event_end_date && ` - ${formatDate(event.event_end_date)}`}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {attendees.length} confirmed
            {event.capacity && ` / ${event.capacity} capacity`}
          </span>
          {event.meeting_point_a && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {event.meeting_point_a}
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4" style={{ background: cardBg, borderColor }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: textMuted }}>
            Headcount
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: textMain }}>
            {attendees.length}
          </p>
        </div>
        {Object.entries(accommodationCounts).map(([type, count]) => (
          <div
            key={type}
            className="rounded-xl border p-4"
            style={{ background: cardBg, borderColor }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: textMuted }}>
              {type.replace(/_/g, " ")}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: c.canopy }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Dietary summary */}
      {Object.keys(dietaryCounts).length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: cardBg, borderColor }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>
            Dietary Needs
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dietaryCounts).map(([diet, count]) => (
              <span
                key={diet}
                className="text-xs px-2.5 py-1 rounded-full border font-medium"
                style={{
                  background: `${c.sun}15`,
                  color: c.bark,
                  borderColor: `${c.sun}30`,
                }}
              >
                {diet} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attendee table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: cardBg, borderColor }}>
        <div className="px-5 py-3 border-b" style={{ borderColor }}>
          <p
            className="text-sm font-bold"
            style={{ color: textMain }}
          >
            Attendees ({attendees.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: isDark ? darkColors.surfaceHover : "rgba(249,250,251,0.5)" }}>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Name
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Email
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Phone
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Accommodation
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Dietary
                </th>
                {showPayment && (
                  <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Payment
                  </th>
                )}
              </tr>
            </thead>
            <tbody style={{ borderColor }}>
              {attendees.map((att) => (
                <tr key={att.email} className="border-t transition" style={{ borderColor }}>
                  <td className="px-5 py-3 font-medium" style={{ color: textMain }}>
                    {att.first_name} {att.last_name}
                  </td>
                  <td className="px-5 py-3" style={{ color: textSub }}>{att.email}</td>
                  <td className="px-5 py-3" style={{ color: textSub }}>
                    {att.phone || "-"}
                  </td>
                  <td className="px-5 py-3 capitalize" style={{ color: textSub }}>
                    {att.accommodation_type?.replace(/_/g, " ") || "-"}
                  </td>
                  <td className="px-5 py-3" style={{ color: textSub }}>
                    {att.dietary_restrictions || "-"}
                  </td>
                  {showPayment && (
                    <td className="px-5 py-3" style={{ color: textSub }}>
                      {att.payment_amount_cents != null ? (
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {formatCents(att.payment_amount_cents)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {attendees.length === 0 && (
                <tr>
                  <td
                    colSpan={showPayment ? 6 : 5}
                    className="px-5 py-8 text-center"
                    style={{ color: textMuted }}
                  >
                    No confirmed attendees yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
