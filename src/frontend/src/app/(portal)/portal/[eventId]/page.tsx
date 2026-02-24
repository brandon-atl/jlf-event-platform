"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Users, MapPin, DollarSign } from "lucide-react";
import { portal } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDate, formatCents } from "@/lib/format";

export default function PortalEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  const { data: event, isLoading } = useQuery({
    queryKey: ["portal-event", eventId],
    queryFn: () => portal.event(eventId),
  });

  if (isLoading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16 text-gray-400">
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition"
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
                color: colors.forest,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              {event.name}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">
              {event.event_type}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              background:
                event.status === "active"
                  ? `${colors.canopy}15`
                  : `${colors.bark}15`,
              color: event.status === "active" ? colors.canopy : colors.bark,
            }}
          >
            {event.status}
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
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
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            Headcount
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: colors.forest }}>
            {attendees.length}
          </p>
        </div>
        {Object.entries(accommodationCounts).map(([type, count]) => (
          <div
            key={type}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              {type.replace(/_/g, " ")}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: colors.canopy }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Dietary summary */}
      {Object.keys(dietaryCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Dietary Needs
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dietaryCounts).map(([diet, count]) => (
              <span
                key={diet}
                className="text-xs px-2.5 py-1 rounded-full border font-medium"
                style={{
                  background: `${colors.sun}15`,
                  color: colors.bark,
                  borderColor: `${colors.sun}30`,
                }}
              >
                {diet} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attendee table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <p
            className="text-sm font-bold"
            style={{ color: colors.forest }}
          >
            Attendees ({attendees.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Accommodation
                </th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Dietary
                </th>
                {showPayment && (
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Payment
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendees.map((att) => (
                <tr key={att.email} className="hover:bg-gray-50/30 transition">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {att.first_name} {att.last_name}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{att.email}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {att.phone || "-"}
                  </td>
                  <td className="px-5 py-3 text-gray-500 capitalize">
                    {att.accommodation_type?.replace(/_/g, " ") || "-"}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {att.dietary_restrictions || "-"}
                  </td>
                  {showPayment && (
                    <td className="px-5 py-3 text-gray-500">
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
                    className="px-5 py-8 text-center text-gray-400"
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
