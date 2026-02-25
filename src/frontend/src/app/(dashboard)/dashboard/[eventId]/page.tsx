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
  TrendingUp,
  BarChart2,
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
import { colors, darkColors, PIE_COLORS, DARK_PIE_COLORS } from "@/lib/theme";
import { DEMO_EVENTS, DEMO_DASHBOARD, DEMO_REGISTRATIONS, isDemoMode } from "@/lib/demo-data";
import { formatCents, formatDateLong } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/use-dark-mode";

function ProgressBar({
  value,
  max,
  color = colors.canopy,
  isDark = false,
}: {
  value: number;
  max: number;
  color?: string;
  isDark?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: isDark ? darkColors.surfaceHover : "#f3f4f6" }}>
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
  const { isDark } = useDarkMode();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";
  const pieColors = isDark ? DARK_PIE_COLORS : PIE_COLORS;

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
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: borderColor }} />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5 h-28 animate-pulse"
              style={{ background: cardBg, borderColor }}
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

  // Hide accommodation for virtual/Zoom events
  const isVirtual =
    /zoom|virtual/i.test(event.event_type) ||
    (event.pricing_model === "free" && /zoom/i.test(event.meeting_point_a || ""));

  // C4: Registration timeline — group registrations by week
  const timelineData = (() => {
    if (!isDemoMode()) return [];
    const regs = DEMO_REGISTRATIONS(eventId).data;
    const weeks: Record<string, number> = {};
    for (const r of regs) {
      const d = new Date(r.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[key] = (weeks[key] || 0) + 1;
    }
    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  })();

  // C4: Revenue by accommodation type
  const revenueByAccom = (() => {
    if (!isDemoMode()) return [];
    const regs = DEMO_REGISTRATIONS(eventId).data;
    const map: Record<string, number> = {};
    for (const r of regs) {
      if (r.status === "complete" && r.payment_amount_cents) {
        const key = r.accommodation_type?.replace(/_/g, " ") || "none";
        map[key] = (map[key] || 0) + r.payment_amount_cents;
      }
    }
    return Object.entries(map).map(([type, cents]) => ({ type, cents }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          {event.name}
        </h2>
        <p className="text-sm flex items-center gap-1.5 mt-0.5" style={{ color: textMuted }}>
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
        <StatCard icon={Users} label="Total Attendees" value={total} color={isDark ? darkColors.canopy : colors.forest} />
        <StatCard
          icon={CheckCircle}
          label="Complete"
          value={sb.complete}
          accent={total > 0 ? Math.round((sb.complete / total) * 100) : 0}
          color={isDark ? darkColors.canopy : colors.canopy}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={sb.pending_payment}
          sub="Awaiting payment"
          color={isDark ? darkColors.sun : "#92700c"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Expired"
          value={sb.expired}
          sub="Auto-expired"
          color={isDark ? darkColors.ember : colors.ember}
        />
        <StatCard
          icon={AlertTriangle}
          label="Cancelled"
          value={sb.cancelled}
          color={isDark ? darkColors.textMuted : "#71717a"}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCents(dash.total_revenue_cents)}
          color={isDark ? darkColors.bark : colors.bark}
        />
      </div>

      {/* Charts Row */}
      <div className={`grid gap-4 ${isVirtual ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {/* Registration Status Pie Chart */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: textSub }}>
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
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: isDark ? darkColors.surfaceElevated : "#fff",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    color: textMain,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-16 text-center" style={{ color: textMuted }}>
              No attendees yet
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {[
              { l: "Complete", c: pieColors[0], v: sb.complete },
              { l: "Pending", c: pieColors[1], v: sb.pending_payment },
              { l: "Expired", c: pieColors[2], v: sb.expired },
              { l: "Cancelled", c: pieColors[3], v: sb.cancelled },
            ].map((d) => (
              <span
                key={d.l}
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: textSub }}
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

        {/* Accommodation Breakdown — hidden for virtual events */}
        {!isVirtual && (
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: textSub }}>
            Accommodation Breakdown
          </h3>
          {[
            { l: "Bell Tent", v: acc.bell_tent, cl: isDark ? darkColors.canopy : colors.canopy, e: "⛺" },
            { l: "Nylon Tent", v: acc.nylon_tent, cl: isDark ? darkColors.moss : colors.moss, e: "🏕️" },
            { l: "Self-Camping", v: acc.self_camping, cl: isDark ? darkColors.earth : colors.earth, e: "🌲" },
          ].map((t) => (
            <div key={t.l} className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{t.e}</span>
                <span className="text-sm flex-1" style={{ color: textSub }}>{t.l}</span>
                <span className="text-sm font-bold" style={{ color: textMain }}>
                  {t.v}
                </span>
              </div>
              <ProgressBar value={t.v} max={total} color={t.cl} isDark={isDark} />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[
              { l: "Bell", v: acc.bell_tent, e: "⛺" },
              { l: "Nylon", v: acc.nylon_tent, e: "🏕️" },
              { l: "Self", v: acc.self_camping, e: "🌲" },
            ].map((t) => (
              <div key={t.l} className="py-3 rounded-xl" style={{ background: subtleBg }}>
                <span className="text-lg">{t.e}</span>
                <p className="text-xl font-bold mt-0.5" style={{ color: textMain }}>{t.v}</p>
                <p className="text-[10px]" style={{ color: textMuted }}>{t.l}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Dietary Restrictions */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: textSub }}>
            Dietary Restrictions
          </h3>
          {[
            { l: "Vegetarian", v: dietary["Vegetarian"] || 0, c: isDark ? darkColors.moss : colors.moss, e: "🥬" },
            { l: "Vegan", v: dietary["Vegan"] || 0, c: isDark ? darkColors.canopy : colors.canopy, e: "🌱" },
            { l: "Gluten-Free", v: dietary["Gluten-Free"] || dietary["Gluten-free"] || 0, c: isDark ? darkColors.earth : colors.earth, e: "🚫" },
            { l: "None / Not Specified", v: dietary["None"] || 0, c: isDark ? darkColors.sage : colors.sage, e: "" },
          ].map((d) => (
            <div key={d.l} className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: textSub }}>
                  {d.e ? d.e + " " : ""}
                  {d.l}
                </span>
                <span className="font-bold" style={{ color: textMain }}>{d.v}</span>
              </div>
              <ProgressBar value={d.v} max={total} color={d.c} isDark={isDark} />
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl border" style={{
            background: isDark ? `${darkColors.sun}10` : "#fffbeb",
            borderColor: isDark ? `${darkColors.sun}30` : "#fef3c7",
          }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: isDark ? darkColors.sun : "#b45309" }}>
              <UtensilsCrossed size={13} />
              Catering Summary
            </div>
            <p className="text-xs mt-1" style={{ color: isDark ? darkColors.sun : "#d97706" }}>
              {vegCount} plant-based meals needed ({veganCount} fully vegan)
            </p>
          </div>
        </div>
      </div>

      {/* C4: Revenue Breakdown + Registration Timeline */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue Breakdown Card */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: textSub }}>
            <DollarSign size={15} />
            Revenue Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: subtleBg }}>
              <p className="text-xs" style={{ color: textMuted }}>Total Revenue</p>
              <p className="text-xl font-bold" style={{ color: textMain }}>{formatCents(dash.total_revenue_cents)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: subtleBg }}>
              <p className="text-xs" style={{ color: textMuted }}>Avg. Payment</p>
              <p className="text-xl font-bold" style={{ color: textMain }}>{formatCents(dash.average_payment_cents)}</p>
            </div>
          </div>
          {revenueByAccom.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>By Accommodation</p>
              {revenueByAccom.map((r) => (
                <div key={r.type} className="flex items-center justify-between text-sm">
                  <span className="capitalize" style={{ color: textSub }}>{r.type}</span>
                  <span className="font-semibold" style={{ color: textMain }}>{formatCents(r.cents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registration Timeline */}
        <div className="rounded-2xl border p-5 shadow-sm" style={{ background: cardBg, borderColor }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: textSub }}>
            <BarChart2 size={15} />
            Registration Timeline
          </h3>
          {timelineData.length > 0 ? (
            <div className="space-y-3">
              {timelineData.map((t) => (
                <div key={t.week}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span style={{ color: textSub }}>Week of {t.week}</span>
                    <span className="font-bold" style={{ color: textMain }}>{t.count}</span>
                  </div>
                  <ProgressBar value={t.count} max={Math.max(...timelineData.map(d => d.count))} color={isDark ? darkColors.canopy : colors.canopy} isDark={isDark} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8" style={{ color: textMuted }}>
              <TrendingUp size={16} className="mr-2" />
              <span className="text-sm">Timeline data available in demo mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          className="text-white font-semibold rounded-xl"
          style={{ background: isDark ? darkColors.canopy : colors.canopy }}
          onClick={() => router.push(`/day-of/${eventId}`)}
        >
          <Sun size={14} />
          Day-of View
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          style={isDark ? { borderColor, color: textSub } : {}}
          onClick={() => router.push(`/events/${eventId}`)}
        >
          <AlertTriangle size={14} />
          Review Flagged
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          style={isDark ? { borderColor, color: textSub } : {}}
          onClick={() => router.push(`/events/${eventId}`)}
        >
          <Users size={14} />
          All Attendees
        </Button>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          style={isDark ? { borderColor, color: textSub } : {}}
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
