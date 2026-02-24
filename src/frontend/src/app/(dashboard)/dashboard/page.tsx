"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, BarChart3, ChevronRight } from "lucide-react";

import { events as eventsApi, type EventResponse } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDateShort } from "@/lib/format";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";

export default function DashboardPage() {
  const router = useRouter();

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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
          Analytics
        </p>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: colors.forest,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Dashboard
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Select an event to view its dashboard
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">
            No events yet. Create an event to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {allEvents.map((event, i) => (
            <div
              key={event.id}
              onClick={() => router.push(`/dashboard/${event.id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,.08)] active:translate-y-0 transition-all duration-250 group shadow-sm animate-in slide-in-from-bottom-2 fade-in"
              style={{
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${colors.canopy}10` }}
              >
                <BarChart3 size={24} style={{ color: colors.canopy }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-bold truncate group-hover:opacity-80 transition mb-1"
                  style={{ color: colors.forest }}
                >
                  {event.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
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
                        color: "#92700c",
                        borderColor: "#92700c50",
                        background: "#92700c12",
                      }}
                    >
                      {event.pending_count} pending
                    </span>
                  )}
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      color: event.status === "active" ? colors.canopy : "#666",
                      background:
                        event.status === "active"
                          ? `${colors.canopy}12`
                          : "#66666612",
                    }}
                  >
                    {event.status}
                  </span>
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-gray-300 group-hover:text-gray-500 transition shrink-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
