"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, ArrowUpDown } from "lucide-react";

import { events as eventsApi, type EventResponse } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { formatCents, formatDate, initials } from "@/lib/format";
import { isDemoMode, DEMO_EVENTS, DEMO_REGISTRATIONS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Input } from "@/components/ui/input";

interface AttendeeRow {
  name: string;
  email: string;
  phone: string;
  eventCount: number;
  events: { name: string; status: string }[];
  totalPaid: number;
  lastRegistration: string;
}

const STATUS_BADGE: Record<string, { bg: string; tx: string; darkBg: string; darkTx: string }> = {
  complete: { bg: "#dcfce7", tx: "#166534", darkBg: "rgba(52,211,153,0.15)", darkTx: "#34d399" },
  pending_payment: { bg: "#fef9c3", tx: "#854d0e", darkBg: "rgba(251,191,36,0.15)", darkTx: "#fbbf24" },
  expired: { bg: "#f4f4f5", tx: "#71717a", darkBg: "rgba(100,116,139,0.15)", darkTx: "#94a3b8" },
  cancelled: { bg: "#f4f4f5", tx: "#71717a", darkBg: "rgba(100,116,139,0.15)", darkTx: "#94a3b8" },
};

type SortKey = "name" | "eventCount" | "totalPaid";

export default function AttendeesDirectoryPage() {
  const { isDark } = useDarkMode();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";

  const { data: eventsList } = useQuery({
    queryKey: ["events"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve({
          data: DEMO_EVENTS as unknown as EventResponse[],
          meta: { total: DEMO_EVENTS.length, page: 1, per_page: 50 },
        });
      }
      return eventsApi.list({ per_page: 100 });
    },
  });

  const allEvents = eventsList?.data ?? [];

  // Aggregate attendees across all events
  const attendees = useMemo<AttendeeRow[]>(() => {
    if (!isDemoMode() || allEvents.length === 0) return [];

    const map = new Map<string, AttendeeRow>();

    for (const ev of allEvents) {
      const regs = DEMO_REGISTRATIONS(ev.id);
      for (const r of regs.data) {
        const name = r.attendee_name || "Unknown";
        const existing = map.get(name);
        if (existing) {
          existing.eventCount++;
          existing.events.push({ name: ev.name, status: r.status });
          existing.totalPaid += r.payment_amount_cents || 0;
          if (r.created_at > existing.lastRegistration) {
            existing.lastRegistration = r.created_at;
          }
        } else {
          map.set(name, {
            name,
            email: r.attendee_email || "",
            phone: r.attendee_phone || "",
            eventCount: 1,
            events: [{ name: ev.name, status: r.status }],
            totalPaid: r.payment_amount_cents || 0,
            lastRegistration: r.created_at,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [allEvents]);

  // Filter and sort
  const filtered = useMemo(() => {
    let list = attendees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "eventCount") cmp = a.eventCount - b.eventCount;
      else if (sortKey === "totalPaid") cmp = a.totalPaid - b.totalPaid;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [attendees, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <button
      onClick={() => handleSort(sKey)}
      className="flex items-center gap-1 font-semibold"
      style={{ color: textMuted }}
    >
      {label}
      <ArrowUpDown size={11} className={sortKey === sKey ? "opacity-100" : "opacity-30"} />
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>
          Directory
        </p>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
        >
          Attendees
        </h2>
        <p className="text-sm mt-0.5" style={{ color: textMuted }}>
          Cross-event attendee directory &middot; {filtered.length} people
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="pl-10 rounded-xl"
          style={isDark ? { background: cardBg, borderColor, color: textMain } : {}}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: cardBg, borderColor }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider" style={{ borderColor }}>
                <th className="px-5 py-3"><SortHeader label="Attendee" sKey="name" /></th>
                <th className="px-5 py-3"><SortHeader label="Events" sKey="eventCount" /></th>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Event History</th>
                <th className="px-5 py-3"><SortHeader label="Total Paid" sKey="totalPaid" /></th>
                <th className="px-5 py-3 font-semibold" style={{ color: textMuted }}>Last Registration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center" style={{ color: textMuted }}>
                    {isDemoMode() ? "No attendees match your search." : "Attendee data is available in demo mode."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.name}
                    className="border-b transition"
                    style={{ borderColor }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: isDark ? darkColors.bark : colors.sage }}
                        >
                          {initials(a.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]" style={{ color: textMain }}>{a.name}</p>
                          <p className="text-[11px]" style={{ color: textMuted }}>{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: textMain }}>{a.eventCount}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {a.events.map((ev, i) => {
                          const badge = STATUS_BADGE[ev.status] || STATUS_BADGE.complete;
                          return (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: isDark ? badge.darkBg : badge.bg,
                                color: isDark ? badge.darkTx : badge.tx,
                              }}
                              title={ev.status}
                            >
                              {ev.name.length > 25 ? ev.name.slice(0, 25) + "..." : ev.name}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: textMain }}>
                      {a.totalPaid > 0 ? formatCents(a.totalPaid) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: textSub }}>
                      {formatDate(a.lastRegistration)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor, color: textMuted }}>
          <span>Showing {filtered.length} attendees</span>
          <span>Aggregated across {allEvents.length} events</span>
        </div>
      </div>
    </div>
  );
}
