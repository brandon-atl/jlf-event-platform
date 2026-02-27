"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Send,
  Edit,
  CheckCircle,
  CreditCard,
  Calendar,
  XCircle,
  RotateCcw,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  registrations,
  events as eventsApi,
  type RegistrationDetail,
  type EventResponse,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { DEMO_EVENTS, DEMO_REGISTRATIONS, isDemoMode } from "@/lib/demo-data";
import { formatCents, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDarkMode } from "@/hooks/use-dark-mode";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    tx: string;
    bdr: string;
    darkBg?: string;
    darkTx?: string;
    darkBdr?: string;
    Icon: React.ElementType;
  }
> = {
  complete: {
    label: "Complete",
    bg: `${colors.canopy}18`,
    tx: colors.canopy,
    bdr: `${colors.canopy}40`,
    darkBg: `${darkColors.canopy}20`,
    darkTx: darkColors.canopy,
    darkBdr: `${darkColors.canopy}40`,
    Icon: CheckCircle,
  },
  pending_payment: {
    label: "Pending Payment",
    bg: `${colors.sun}20`,
    tx: "#92700c",
    bdr: `${colors.sun}50`,
    darkBg: `${darkColors.sun}20`,
    darkTx: darkColors.sun,
    darkBdr: `${darkColors.sun}40`,
    Icon: Clock,
  },
  cash_pending: {
    label: "Cash Pending",
    bg: `${colors.sun}20`,
    tx: "#92700c",
    bdr: `${colors.sun}50`,
    darkBg: `${darkColors.sun}20`,
    darkTx: darkColors.sun,
    darkBdr: `${darkColors.sun}40`,
    Icon: CreditCard,
  },
  expired: {
    label: "Expired",
    bg: "#f4f4f5",
    tx: "#71717a",
    bdr: "#d4d4d8",
    darkBg: `${darkColors.textMuted}18`,
    darkTx: darkColors.textMuted,
    darkBdr: `${darkColors.textMuted}40`,
    Icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    bg: "#f4f4f5",
    tx: "#71717a",
    bdr: "#d4d4d8",
    darkBg: `${darkColors.textMuted}18`,
    darkTx: darkColors.textMuted,
    darkBdr: `${darkColors.textMuted}40`,
    Icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    bg: `${colors.berry}15`,
    tx: colors.berry,
    bdr: `${colors.berry}40`,
    darkBg: `${darkColors.berry}18`,
    darkTx: darkColors.berry,
    darkBdr: `${darkColors.berry}40`,
    Icon: RotateCcw,
  },
};

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.complete;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{
        background: isDark ? c.darkBg || c.bg : c.bg,
        color: isDark ? c.darkTx || c.tx : c.tx,
        borderColor: isDark ? c.darkBdr || c.bdr : c.bdr,
      }}
    >
      <c.Icon size={11} />
      {c.label}
    </span>
  );
}

/** "Needs Action" badge for manual/walk-in registrations still pending */
function NeedsActionBadge({ isDark }: { isDark: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border animate-pulse"
      style={{
        background: isDark ? `${darkColors.ember}20` : "#fef2f2",
        color: isDark ? darkColors.ember : colors.ember,
        borderColor: isDark ? `${darkColors.ember}40` : "#fecaca",
      }}
    >
      <AlertTriangle size={10} />
      Needs Action
    </span>
  );
}

/** Subtle "Auto" indicator for auto-confirmed form registrations */
function AutoBadge({ isDark }: { isDark: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{
        background: isDark ? `${darkColors.canopy}12` : `${colors.canopy}0a`,
        color: isDark ? darkColors.textMuted : "#9ca3af",
      }}
    >
      <Zap size={8} />
      Auto
    </span>
  );
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "complete", label: "Complete" },
  { key: "pending_payment", label: "Pending" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
  { key: "cancel_requested", label: "Cancel Requests" },
];

export default function AttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { isDark } = useDarkMode();

  // Dark mode color variables
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";
  const hoverBg = isDark ? darkColors.surfaceHover : "#f9fafb";

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

  // For cancel_requested filter, we fetch all and filter client-side by notes
  const apiStatusFilter = statusFilter === "cancel_requested" ? undefined : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: [
      "registrations",
      eventId,
      statusFilter,
      search || undefined,
    ],
    queryFn: () => {
      if (isDemoMode()) {
        const demo = DEMO_REGISTRATIONS(eventId);
        let filtered = demo.data;
        if (statusFilter !== "all" && statusFilter !== "cancel_requested") filtered = filtered.filter(r => r.status === statusFilter);
        if (search) filtered = filtered.filter(r => r.attendee_name?.toLowerCase().includes(search.toLowerCase()) || r.attendee_email?.toLowerCase().includes(search.toLowerCase()));
        return Promise.resolve({ data: filtered as unknown as RegistrationDetail[], meta: { ...demo.meta, total: filtered.length } });
      }
      return registrations.list(eventId, {
        status: apiStatusFilter === "all" ? undefined : apiStatusFilter,
        search: search || undefined,
        per_page: 500,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      registrations.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
      toast.success("Registration updated");
    },
    onError: () => {
      toast.error("Failed to update registration");
    },
  });

  const rawAttendees = data?.data ?? [];
  const attendees = statusFilter === "cancel_requested"
    ? rawAttendees.filter((a) => a.notes?.includes("[CANCEL REQUEST]"))
    : rawAttendees;
  const totalCount = statusFilter === "cancel_requested" ? attendees.length : (data?.meta?.total ?? 0);

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === attendees.length && attendees.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(attendees.map((a) => a.id)));
    }
  }, [attendees, selected.size]);

  const isAllSelected = attendees.length > 0 && selected.size === attendees.length;
  const hasSelection = selected.size > 0;

  // Precompute lookup map for O(1) attendee access in bulk ops
  const attendeeById = useMemo(() => new Map(attendees.map(a => [a.id, a])), [attendees]);

  // Bulk actions
  const handleBulkMarkComplete = useCallback(async () => {
    if (isDemoMode()) {
      toast.info("Bulk actions are not available in demo mode");
      return;
    }
    const ids = Array.from(selected);
    const eligible = ids.filter((id) => {
      const a = attendeeById.get(id);
      return a && a.status !== "complete";
    });
    if (eligible.length === 0) {
      toast.info("All selected attendees are already complete");
      return;
    }
    const results = await Promise.allSettled(
      eligible.map((id) => registrations.update(id, { status: "complete" }))
    );
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;
    queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
    setSelected(new Set());
    if (failCount > 0) {
      toast.warning(`${successCount} marked complete, ${failCount} failed`);
    } else {
      toast.success(`${successCount} registration${successCount !== 1 ? "s" : ""} marked complete`);
    }
  }, [selected, attendeeById, queryClient, eventId]);

  const handleBulkRemind = useCallback(async () => {
    if (isDemoMode()) {
      toast.info("Reminders are not available in demo mode");
      return;
    }
    const ids = Array.from(selected);
    const eligible = ids.filter((id) => {
      const a = attendeeById.get(id);
      return a && a.status === "pending_payment";
    });
    if (eligible.length === 0) {
      toast.info("No selected attendees are pending payment");
      return;
    }
    const results = await Promise.allSettled(
      eligible.map((id) => registrations.remind(id))
    );
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;
    setSelected(new Set());
    if (failCount > 0) {
      toast.warning(`${successCount} reminder${successCount !== 1 ? "s" : ""} sent, ${failCount} failed`);
    } else {
      toast.success(`${successCount} reminder${successCount !== 1 ? "s" : ""} sent`);
    }
  }, [selected, attendeeById]);

  const handleExport = async () => {
    if (isDemoMode()) {
      toast.info("CSV export is not available in demo mode");
      return;
    }
    const url = registrations.exportCsv(eventId);
    const token = localStorage.getItem("jlf_token");
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${event?.slug || "registrations"}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay revocation so the browser finishes reading
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              color: textMain,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Attendees
          </h2>
          <p className="text-sm" style={{ color: textMuted }}>
            {event?.name} · {attendees.length} of {totalCount} shown
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl"
          style={isDark ? { borderColor, color: textSub } : {}}
          onClick={handleExport}
        >
          <Download size={14} />
          Export
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
          style={{
            background: isDark ? `${darkColors.canopy}10` : `${colors.canopy}08`,
            borderColor: isDark ? `${darkColors.canopy}30` : `${colors.canopy}25`,
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: isDark ? darkColors.canopy : colors.canopy }}
          >
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              className="text-white rounded-xl text-[11px] h-7"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
              onClick={handleBulkMarkComplete}
            >
              <CheckCircle size={11} />
              Mark Selected Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[11px] h-7"
              style={isDark ? { borderColor, color: textSub } : {}}
              onClick={handleBulkRemind}
            >
              <Send size={11} />
              Send Reminder to Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-[11px] h-7"
              style={{ color: textMuted }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: textMuted }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-10 rounded-xl"
            style={isDark ? {
              background: darkColors.surface,
              borderColor: darkColors.surfaceBorder,
              color: darkColors.textPrimary,
            } : {}}
          />
        </div>
        <div
          className="flex items-center rounded-xl border overflow-hidden"
          style={{
            background: cardBg,
            borderColor,
          }}
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="px-3 py-2 text-xs font-medium transition"
              style={
                statusFilter === tab.key
                  ? {
                      background: isDark ? darkColors.canopy : colors.forest,
                      color: isDark ? darkColors.cream : "#ffffff",
                    }
                  : {
                      color: textMuted,
                    }
              }
              onMouseEnter={(e) => {
                if (statusFilter !== tab.key) {
                  (e.currentTarget as HTMLElement).style.background = hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (statusFilter !== tab.key) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ background: cardBg, borderColor }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left text-xs uppercase tracking-wider"
                style={{ borderColor, color: textMuted }}
              >
                <th className="px-3 py-3 font-semibold w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer accent-current"
                    style={{ accentColor: isDark ? darkColors.canopy : colors.canopy }}
                    aria-label="Select all attendees"
                  />
                </th>
                {[
                  "Attendee",
                  "Status",
                  "Amount",
                  "Accommodation",
                  "Dietary",
                  "Source",
                  "",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: isDark ? darkColors.surfaceBorder + "60" : "#f9fafb" }}
            >
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center" style={{ color: textMuted }}>
                    Loading attendees...
                  </td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center" style={{ color: textMuted }}>
                    No attendees match the current filter.
                  </td>
                </tr>
              ) : (
                attendees.flatMap((a) => renderAttendeeRows(a))
              )}
            </tbody>
          </table>
        </div>
        <div
          className="px-5 py-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor, color: textMuted }}
        >
          <span>
            Showing {attendees.length} of {totalCount} attendees
          </span>
          <span>Last synced: just now</span>
        </div>
      </div>
    </div>
  );

  function renderAttendeeRows(a: RegistrationDetail) {
    const isExpanded = expanded === a.id;
    const isSelected = selected.has(a.id);
    const name = a.attendee_name || "Unknown";
    const email = a.attendee_email || "";
    const hasFlag = a.notes && a.notes.toLowerCase().includes("flag");
    const hasCancelRequest = a.notes?.includes("[CANCEL REQUEST]") || false;

    // C3: Determine if this row needs special indicators
    const isManualPending =
      (a.source === "manual" || a.source === "walk_in") &&
      a.status === "pending_payment";
    const isAutoConfirmed =
      a.source === "registration_form" && a.status === "complete";

    const rowBg = hasFlag
      ? isDark
        ? `${darkColors.ember}08`
        : "rgba(244,63,94,0.03)"
      : isSelected
        ? isDark
          ? `${darkColors.canopy}0c`
          : `${colors.canopy}06`
        : "transparent";

    const rows = [
      <tr
        key={a.id}
        onClick={() => setExpanded(isExpanded ? null : a.id)}
        className="cursor-pointer transition-colors"
        style={{ background: rowBg }}
        onMouseEnter={(e) => {
          if (!hasFlag && !isSelected) {
            (e.currentTarget as HTMLElement).style.background = hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = rowBg;
        }}
      >
        <td className="px-3 py-3.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(a.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 cursor-pointer"
            style={{ accentColor: isDark ? darkColors.canopy : colors.canopy }}
            aria-label={`Select ${name}`}
          />
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{
                background: hasFlag
                  ? isDark ? darkColors.ember : colors.ember
                  : isDark ? darkColors.bark : colors.sage,
              }}
            >
              {initials(name)}
            </div>
            <div>
              <p className="font-semibold text-[13px]" style={{ color: isDark ? darkColors.textPrimary : "#1f2937" }}>
                {name}
              </p>
              <p className="text-[11px]" style={{ color: textMuted }}>{email}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={a.status} isDark={isDark} />
            {isManualPending && <NeedsActionBadge isDark={isDark} />}
            {isAutoConfirmed && <AutoBadge isDark={isDark} />}
            {hasCancelRequest && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  background: isDark ? `${darkColors.ember}18` : "#fef2f2",
                  color: isDark ? darkColors.ember : colors.ember,
                  borderColor: isDark ? `${darkColors.ember}40` : "#fecaca",
                }}
              >
                <XCircle size={10} />
                Cancel Request
              </span>
            )}
          </div>
        </td>
        <td
          className="px-5 py-3.5 font-semibold"
          style={{ color: isDark ? darkColors.canopy : colors.forest }}
        >
          {a.payment_amount_cents ? formatCents(a.payment_amount_cents) : "\u2014"}
        </td>
        <td className="px-5 py-3.5 capitalize text-xs" style={{ color: textSub }}>
          {a.accommodation_type?.replace(/_/g, " ") || "\u2014"}
        </td>
        <td className="px-5 py-3.5 text-xs" style={{ color: textSub }}>
          {a.dietary_restrictions || "\u2014"}
        </td>
        <td className="px-5 py-3.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={
              a.source === "registration_form"
                ? {
                    background: isDark ? `${darkColors.textMuted}15` : "#f3f4f6",
                    color: isDark ? darkColors.textSecondary : "#6b7280",
                    borderColor: isDark ? darkColors.surfaceBorder : "#f3f4f6",
                  }
                : a.source === "manual"
                  ? {
                      background: isDark ? `${darkColors.berry}15` : "#faf5ff",
                      color: isDark ? darkColors.berry : "#9333ea",
                      borderColor: isDark ? `${darkColors.berry}30` : "#e9d5ff",
                    }
                  : {
                      background: isDark ? `${darkColors.sky}15` : "#eff6ff",
                      color: isDark ? darkColors.sky : "#2563eb",
                      borderColor: isDark ? `${darkColors.sky}30` : "#bfdbfe",
                    }
            }
          >
            {a.source === "registration_form" ? "form" : a.source}
          </span>
        </td>
        <td className="px-5 py-3.5">
          {isExpanded ? (
            <ChevronUp size={14} style={{ color: textMuted }} />
          ) : (
            <ChevronDown size={14} style={{ color: textMuted }} />
          )}
        </td>
      </tr>,
    ];

    if (isExpanded) {
      rows.push(
        <tr key={a.id + "x"}>
          <td colSpan={8} className="px-5 py-4" style={{ background: subtleBg }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block mb-0.5" style={{ color: textMuted }}>Phone</span>
                <span className="font-medium" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                  {a.attendee_phone || "Not provided"}
                </span>
              </div>
              <div>
                <span className="block mb-0.5" style={{ color: textMuted }}>Source</span>
                <span className="font-medium capitalize" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                  {a.source}
                </span>
              </div>
              <div>
                <span className="block mb-0.5" style={{ color: textMuted }}>Waiver</span>
                <span className="font-medium" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                  {a.waiver_accepted_at ? "Accepted" : "Not accepted"}
                </span>
              </div>
              <div>
                <span className="block mb-0.5" style={{ color: textMuted }}>Registered</span>
                <span className="font-medium" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              {(() => {
                const intake = a.intake_data as Record<string, string> | undefined;
                return intake?.emergency_contact ? (
                  <div>
                    <span className="block mb-0.5" style={{ color: textMuted }}>
                      Emergency Contact
                    </span>
                    <span className="font-medium" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                      {intake.emergency_contact}
                    </span>
                  </div>
                ) : null;
              })()}
              {(() => {
                const intake = a.intake_data as Record<string, string> | undefined;
                return intake?.how_heard ? (
                  <div>
                    <span className="block mb-0.5" style={{ color: textMuted }}>
                      How They Heard
                    </span>
                    <span className="font-medium" style={{ color: isDark ? darkColors.textPrimary : "#374151" }}>
                      {intake.how_heard}
                    </span>
                  </div>
                ) : null;
              })()}
              {a.notes && (
                <div
                  className="col-span-full p-2.5 rounded-lg border"
                  style={{
                    background: isDark ? `${darkColors.ember}10` : "#fef2f2",
                    borderColor: isDark ? `${darkColors.ember}30` : "#fecaca",
                  }}
                >
                  <span
                    className="font-semibold flex items-center gap-1.5 text-xs"
                    style={{ color: isDark ? darkColors.ember : "#dc2626" }}
                  >
                    <AlertTriangle size={12} />
                    {a.notes}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {hasCancelRequest && a.status !== "cancelled" && (
                <>
                  <Button
                    size="sm"
                    className="text-white rounded-xl text-[11px] h-7"
                    style={{ background: isDark ? darkColors.ember : colors.ember }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Approve cancellation for ${name}? This will set their status to cancelled.`)) {
                        updateMutation.mutate({ id: a.id, status: "cancelled" });
                      }
                    }}
                  >
                    <CheckCircle size={11} />
                    Approve Cancellation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[11px] h-7"
                    style={isDark ? { borderColor, color: textSub } : {}}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Deny cancellation for ${name}? The cancel request flag will be cleared.`)) {
                        const cleanedNotes = (a.notes || "")
                          .replace(/\[CANCEL REQUEST\][^\n]*/g, "")
                          .trim();
                        try {
                          await registrations.update(a.id, { notes: cleanedNotes || undefined });
                          queryClient.invalidateQueries({ queryKey: ["registrations", eventId] });
                          toast.success(`Cancellation request denied for ${name}`);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to update registration");
                        }
                      }
                    }}
                  >
                    Deny Request
                  </Button>
                </>
              )}
              {a.status !== "complete" && (
                <Button
                  size="sm"
                  className="text-white rounded-xl text-[11px] h-7"
                  style={{ background: isDark ? darkColors.canopy : colors.canopy }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateMutation.mutate({ id: a.id, status: "complete" });
                  }}
                >
                  Mark Complete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[11px] h-7"
                style={isDark ? { borderColor, color: textSub } : {}}
                disabled={a.status !== "pending_payment"}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await registrations.remind(a.id);
                    toast.success(`Reminder sent to ${name}`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to send reminder");
                  }
                }}
              >
                <Send size={11} />
                Remind
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    return rows;
  }
}
