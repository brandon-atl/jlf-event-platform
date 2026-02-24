"use client";

import { Calendar, Users, CreditCard, Mountain, ChevronRight } from "lucide-react";
import { colors } from "@/lib/theme";
import { formatDateShort, formatCents, eventStatusColor } from "@/lib/format";
import type { EventResponse } from "@/lib/api";

interface EventCardProps {
  event: EventResponse;
  onClick: () => void;
  index?: number;
}

function CountPill({
  n,
  label,
  color,
}: {
  n: number;
  label: string;
  color: string;
}) {
  if (n <= 0) return null;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full border"
      style={{
        color,
        borderColor: `${color}50`,
        background: `${color}12`,
      }}
    >
      {n} {label}
    </span>
  );
}

export function EventCard({ event, onClick, index = 0 }: EventCardProps) {
  const isPast = new Date(event.event_end_date || event.event_date) < new Date();
  const displayStatus = isPast && event.status === "active" ? "past" : event.status;
  const statusColor = isPast && event.status === "active" ? "#9ca3af" : eventStatusColor(event.status);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,.08)] active:translate-y-0 transition-all duration-250 group shadow-sm animate-in slide-in-from-bottom-2 fade-in ${isPast ? "opacity-70" : ""}`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${colors.canopy}10` }}
      >
        <Mountain size={24} style={{ color: isPast ? "#9ca3af" : colors.canopy }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
          <h3
            className="text-base font-bold truncate group-hover:opacity-80 transition"
            style={{ color: isPast ? "#6b7280" : colors.forest }}
          >
            {event.name}
          </h3>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: statusColor }}
          />
          <span className="text-xs text-gray-400 capitalize">
            {displayStatus}
          </span>
          {event.event_type && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${colors.canopy}12`, color: colors.canopy }}
            >
              {event.event_type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {formatDateShort(event.event_date)}
            {event.event_end_date
              ? ` – ${formatDateShort(event.event_end_date)}`
              : ""}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} />
            {event.total_registrations} attendees
          </span>
          <span className="flex items-center gap-1">
            <CreditCard size={13} />
            {event.pricing_model === "free"
              ? "Free"
              : event.pricing_model === "donation"
              ? "Donation"
              : formatCents(event.total_revenue_cents)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <CountPill
          n={event.pending_count}
          label="pending"
          color="#92700c"
        />
        <ChevronRight
          size={16}
          className="text-gray-300 group-hover:text-gray-500 transition ml-1"
        />
      </div>
    </div>
  );
}
