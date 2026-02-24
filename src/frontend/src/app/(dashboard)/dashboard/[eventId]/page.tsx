"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Sun,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";
import { dashboard, events as eventsApi, type EventResponse, type EventDashboard } from "@/lib/api";
import { colors, PIE_COLORS } from "@/lib/theme";
import { DEMO_EVENTS, DEMO_DASHBOARD, isDemoMode } from "@/lib/demo-data";
import { formatCents, formatDateLong } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";

function ProgressBar({
  value,
  max,
  color = colors.canopy,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function EventDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

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
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const total = dash.total_registrations;
  const sb = dash.status_breakdown;
  const acc = dash.accommodation_breakdown;
  const dietary = dash.dietary_summary;

  const pieData = [
    { name: "Complete", value: sb.complete },
    { name: "Pending", value: sb.pending_payment },
    { name: "Expired", value: sb.expired },
    { name: "Cancelled", value: sb.cancelled },
  ].filter((d) => d.value > 0);

  const vegCount = (dietary["Vegetarian"] || 0) + (dietary["Vegan"] || 0);
  const veganCount = dietary["Vegan"] || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: colors.forest,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          {event.name}
        </h2>
        <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
          <Calendar size={13} />
          {formatDateLong(event.event_date)}
          {event.meeting_point_a && (
            <>
              {" "}
              · <MapPin size={13} />
              {event.meeting_point_a}
            </>
          )}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Attendees" value={total} color={colors.forest} />
        <StatCard
          icon={CheckCircle}
          label="Complete"
          value={sb.complete}
          accent={total > 0 ? Math.round((sb.complete / total) * 100) : 0}
          color={colors.canopy}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={sb.pending_payment}
          sub="Awaiting payment"
          color="#92700c"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expired"
          value={sb.expired}
          sub="Auto-expired"
          color={colors.ember}
        />
        <StatCard
          icon={AlertTriangle}
          label="Cancelled"
          value={sb.cancelled}
          color="#71717a"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCents(dash.total_revenue_cents)}
          color={colors.bark}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Registration Status Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            Registration Status
          </h3>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">
              No attendees yet
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {[
              { l: "Complete", c: PIE_COLORS[0], v: sb.complete },
              { l: "Pending", c: PIE_COLORS[1], v: sb.pending_payment },
              { l: "Expired", c: PIE_COLORS[2], v: sb.expired },
              { l: "Cancelled", c: PIE_COLORS[3], v: sb.cancelled },
            ].map((d) => (
              <span
                key={d.l}
                className="flex items-center gap-1.5 text-[11px] text-gray-500"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: d.c }}
                />
                {d.l}: {d.v}
              </span>
            ))}
          </div>
        </div>

        {/* Accommodation Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">
            Accommodation Breakdown
          </h3>
          {[
            { l: "Bell Tent", v: acc.bell_tent, cl: colors.canopy, e: "⛺" },
            { l: "Nylon Tent", v: acc.nylon_tent, cl: colors.moss, e: "🏕️" },
            { l: "Self-Camping", v: acc.self_camping, cl: colors.earth, e: "🌲" },
          ].map((t) => (
            <div key={t.l} className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{t.e}</span>
                <span className="text-sm text-gray-600 flex-1">{t.l}</span>
                <span className="text-sm font-bold" style={{ color: colors.forest }}>
                  {t.v}
                </span>
              </div>
              <ProgressBar value={t.v} max={total} color={t.cl} />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[
              { l: "Bell", v: acc.bell_tent, e: "⛺" },
              { l: "Nylon", v: acc.nylon_tent, e: "🏕️" },
              { l: "Self", v: acc.self_camping, e: "🌲" },
            ].map((t) => (
              <div key={t.l} className="py-3 rounded-xl bg-gray-50">
                <span className="text-lg">{t.e}</span>
                <p
                  className="text-xl font-bold mt-0.5"
                  style={{ color: colors.forest }}
                >
                  {t.v}
                </p>
                <p className="text-[10px] text-gray-400">{t.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">
            Dietary Restrictions
          </h3>
          {[
            { l: "Vegetarian", v: dietary["Vegetarian"] || 0, c: colors.moss, e: "🥬" },
            { l: "Vegan", v: dietary["Vegan"] || 0, c: colors.canopy, e: "🌱" },
            { l: "Gluten-Free", v: dietary["Gluten-Free"] || dietary["Gluten-free"] || 0, c: colors.earth, e: "🚫" },
            { l: "None / Not Specified", v: dietary["None"] || 0, c: colors.sage, e: "" },
          ].map((d) => (
            <div key={d.l} className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {d.e ? d.e + " " : ""}
                  {d.l}
                </span>
                <span className="font-bold" style={{ color: colors.forest }}>
                  {d.v}
                </span>
              </div>
              <ProgressBar value={d.v} max={total} color={d.c} />
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <UtensilsCrossed size={13} />
              Catering Summary
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {vegCount} plant-based meals needed ({veganCount} fully vegan)
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          className="text-white font-semibold rounded-xl"
          style={{ background: colors.canopy }}
          onClick={() => router.push(`/day-of/${eventId}`)}
        >
          <Sun size={14} />
          Day-of View
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          onClick={() => router.push(`/events/${eventId}`)}
        >
          <AlertTriangle size={14} />
          Review Flagged
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          onClick={() => router.push(`/events/${eventId}`)}
        >
          <Users size={14} />
          All Attendees
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", eventId] });
            queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
            toast.success("Data refreshed");
          }}
        >
          <RefreshCw size={14} />
          Sync Now
        </Button>
      </div>
    </div>
  );
}
