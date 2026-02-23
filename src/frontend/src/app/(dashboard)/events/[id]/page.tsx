"use client";

import { use, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

import {
  registrations,
  events as eventsApi,
  type RegistrationDetail,
  type EventResponse,
} from "@/lib/api";
import { colors } from "@/lib/theme";
import { DEMO_EVENTS, DEMO_REGISTRATIONS, isDemoMode } from "@/lib/demo-data";
import { formatCents, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    tx: string;
    bdr: string;
    Icon: React.ElementType;
  }
> = {
  complete: {
    label: "Complete",
    bg: `${colors.canopy}18`,
    tx: colors.canopy,
    bdr: `${colors.canopy}40`,
    Icon: CheckCircle,
  },
  pending_payment: {
    label: "Pending Payment",
    bg: `${colors.sun}20`,
    tx: "#92700c",
    bdr: `${colors.sun}50`,
    Icon: Clock,
  },
  expired: {
    label: "Expired",
    bg: "#f4f4f5",
    tx: "#71717a",
    bdr: "#d4d4d8",
    Icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    bg: "#f4f4f5",
    tx: "#71717a",
    bdr: "#d4d4d8",
    Icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    bg: `${colors.berry}15`,
    tx: colors.berry,
    bdr: `${colors.berry}40`,
    Icon: RotateCcw,
  },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.complete;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{ background: c.bg, color: c.tx, borderColor: c.bdr }}
    >
      <c.Icon size={11} />
      {c.label}
    </span>
  );
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "complete", label: "Complete" },
  { key: "pending_payment", label: "Pending" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
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

  const { data, isLoading } = useQuery({
    queryKey: [
      "registrations",
      eventId,
      statusFilter === "all" ? undefined : statusFilter,
      search || undefined,
    ],
    queryFn: () => {
      if (isDemoMode()) {
        const demo = DEMO_REGISTRATIONS(eventId);
        let filtered = demo.data;
        if (statusFilter !== "all") filtered = filtered.filter(r => r.status === statusFilter);
        if (search) filtered = filtered.filter(r => r.attendee_name?.toLowerCase().includes(search.toLowerCase()) || r.attendee_email?.toLowerCase().includes(search.toLowerCase()));
        return Promise.resolve({ data: filtered as unknown as RegistrationDetail[], meta: { ...demo.meta, total: filtered.length } });
      }
      return registrations.list(eventId, {
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
        per_page: 100,
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

  const attendees = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  const handleExport = () => {
    const url = registrations.exportCsv(eventId);
    window.open(url, "_blank");
    toast.success("CSV export started");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              color: colors.forest,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Attendees
          </h2>
          <p className="text-sm text-gray-400">
            {event?.name} · {attendees.length} of {totalCount} shown
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={handleExport}>
          <Download size={14} />
          Export
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition ${
                statusFilter === tab.key
                  ? "text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              style={
                statusFilter === tab.key
                  ? { background: colors.forest }
                  : {}
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    Loading attendees...
                  </td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No attendees match the current filter.
                  </td>
                </tr>
              ) : (
                attendees.flatMap((a) => renderAttendeeRows(a))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
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
    const name = a.attendee_name || "Unknown";
    const email = a.attendee_email || "";
    const hasFlag = a.notes && a.notes.toLowerCase().includes("flag");

    const rows = [
      <tr
        key={a.id}
        onClick={() => setExpanded(isExpanded ? null : a.id)}
        className={`hover:bg-gray-50/50 cursor-pointer transition ${
          hasFlag ? "bg-rose-50/30" : ""
        }`}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{
                background: hasFlag ? colors.ember : colors.sage,
              }}
            >
              {initials(name)}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-[13px]">{name}</p>
              <p className="text-[11px] text-gray-400">{email}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <StatusBadge status={a.status} />
        </td>
        <td
          className="px-5 py-3.5 font-semibold"
          style={{ color: colors.forest }}
        >
          {a.payment_amount_cents ? formatCents(a.payment_amount_cents) : "—"}
        </td>
        <td className="px-5 py-3.5 text-gray-600 capitalize text-xs">
          {a.accommodation_type?.replace(/_/g, " ") || "—"}
        </td>
        <td className="px-5 py-3.5 text-gray-600 text-xs">
          {a.dietary_restrictions || "—"}
        </td>
        <td className="px-5 py-3.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              a.source === "registration_form"
                ? "bg-gray-100 text-gray-500"
                : a.source === "manual"
                ? "bg-purple-50 text-purple-600 border border-purple-200"
                : "bg-blue-50 text-blue-600 border border-blue-200"
            }`}
          >
            {a.source === "registration_form" ? "form" : a.source}
          </span>
        </td>
        <td className="px-5 py-3.5">
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-300" />
          ) : (
            <ChevronDown size={14} className="text-gray-300" />
          )}
        </td>
      </tr>,
    ];

    if (isExpanded) {
      rows.push(
        <tr key={a.id + "x"}>
          <td colSpan={7} className="px-5 py-4 bg-gray-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Phone</span>
                <span className="text-gray-700 font-medium">
                  {a.attendee_phone || "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Source</span>
                <span className="text-gray-700 font-medium capitalize">
                  {a.source}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Waiver</span>
                <span className="text-gray-700 font-medium">
                  {a.waiver_accepted_at ? "Accepted" : "Not accepted"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Registered</span>
                <span className="text-gray-700 font-medium">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              {(() => {
                const intake = a.intake_data as Record<string, string> | undefined;
                return intake?.emergency_contact ? (
                  <div>
                    <span className="text-gray-400 block mb-0.5">
                      Emergency Contact
                    </span>
                    <span className="text-gray-700 font-medium">
                      {intake.emergency_contact}
                    </span>
                  </div>
                ) : null;
              })()}
              {(() => {
                const intake = a.intake_data as Record<string, string> | undefined;
                return intake?.how_heard ? (
                  <div>
                    <span className="text-gray-400 block mb-0.5">
                      How They Heard
                    </span>
                    <span className="text-gray-700 font-medium">
                      {intake.how_heard}
                    </span>
                  </div>
                ) : null;
              })()}
              {a.notes && (
                <div className="col-span-full p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="text-rose-600 font-semibold flex items-center gap-1.5 text-xs">
                    <AlertTriangle size={12} />
                    {a.notes}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {a.status !== "complete" && (
                <Button
                  size="sm"
                  className="text-white rounded-xl text-[11px] h-7"
                  style={{ background: colors.canopy }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`Reminder sent to ${name}`);
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
