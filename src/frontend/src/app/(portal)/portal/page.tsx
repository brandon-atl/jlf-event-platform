"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, TreePine } from "lucide-react";
import { portal, PortalEvent } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDate } from "@/lib/format";

export default function PortalEventsPage() {
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
            color: colors.forest,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Your Events
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Events you have been assigned to co-manage
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Loading events...</p>
        </div>
      )}

      {!isLoading && eventsList.length === 0 && (
        <div className="text-center py-16 text-gray-400">
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
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p
                  className="font-bold text-gray-800 group-hover:text-green-800 transition"
                  style={{ fontFamily: "var(--font-dm-serif), serif" }}
                >
                  {evt.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {evt.event_type}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background:
                    evt.status === "active"
                      ? `${colors.canopy}15`
                      : `${colors.bark}15`,
                  color:
                    evt.status === "active" ? colors.canopy : colors.bark,
                }}
              >
                {evt.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
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
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (evt.complete_registrations / evt.capacity) * 100)}%`,
                      background: colors.canopy,
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
