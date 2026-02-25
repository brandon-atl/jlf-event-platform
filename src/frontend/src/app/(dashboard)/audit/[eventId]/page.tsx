"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, Edit, UserCheck, UserX, Trash2, Plus, Copy } from "lucide-react";
import { registrations as registrationsApi, type AuditLogEntry } from "@/lib/api";
import { isDemoMode, DEMO_AUDIT_LOG } from "@/lib/demo-data";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";

function actionMeta(action: string): { icon: typeof Activity; color: string; label: string } {
  const map: Record<string, { icon: typeof Activity; color: string; label: string }> = {
    check_in:     { icon: UserCheck, color: "#059669", label: "Checked in" },
    undo_check_in:{ icon: UserX,     color: "#dc2626", label: "Check-in undone" },
    create:       { icon: Plus,      color: "#2563eb", label: "Created" },
    update:       { icon: Edit,      color: "#d97706", label: "Updated" },
    update_status:{ icon: Edit,      color: "#7c3aed", label: "Status changed" },
    delete:       { icon: Trash2,    color: "#dc2626", label: "Deleted" },
    duplicate:    { icon: Copy,      color: "#0891b2", label: "Duplicated" },
  };
  return map[action] ?? { icon: Activity, color: "#6b7280", label: action.replace(/_/g, " ") };
}

function formatRelativeTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AuditLogPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const { isDark } = useDarkMode();

  const c = isDark ? darkColors : colors;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f0f0f0";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit", eventId],
    queryFn: () => isDemoMode()
      ? Promise.resolve(DEMO_AUDIT_LOG(eventId))
      : registrationsApi.auditLog(eventId),
    staleTime: 30_000,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl transition hover:opacity-70"
          style={{ background: isDark ? darkColors.surfaceHover : "#f3f4f6", color: textMain }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Audit Log
          </h1>
          <p className="text-sm" style={{ color: textSub }}>All changes to this event and its registrations</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-5 top-0 bottom-0 w-px"
          style={{ background: borderColor }}
        />

        {isLoading && (
          <div className="space-y-4 pl-14">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border p-4 h-16 animate-pulse" style={{ background: cardBg, borderColor }} />
            ))}
          </div>
        )}

        {!isLoading && (!logs || logs.length === 0) && (
          <div className="text-center py-16">
            <Activity size={32} className="mx-auto mb-3 opacity-30" style={{ color: textMuted }} />
            <p className="text-sm" style={{ color: textMuted }}>No activity recorded yet</p>
          </div>
        )}

        <div className="space-y-3">
          {(logs ?? []).map((log) => {
            const { icon: Icon, color, label } = actionMeta(log.action);
            return (
              <div key={log.id} className="flex gap-4">
                {/* Icon bubble */}
                <div
                  className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2"
                  style={{ background: cardBg, borderColor: `${color}40` }}
                >
                  <Icon size={15} style={{ color }} />
                </div>

                {/* Card */}
                <div
                  className="flex-1 rounded-xl border p-4 shadow-sm mb-1"
                  style={{ background: cardBg, borderColor }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: textMain }}>
                        <span
                          className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mr-2"
                          style={{ background: `${color}18`, color }}
                        >
                          {label}
                        </span>
                        <span className="text-xs font-mono" style={{ color: textMuted }}>
                          {log.entity_type}
                        </span>
                      </p>
                      <p className="text-xs mt-1" style={{ color: textSub }}>
                        by <strong style={{ color: textMain }}>{log.actor}</strong>
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: textMuted }}>
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>

                  {/* Diff */}
                  {(log.old_value || log.new_value) && (
                    <div className="mt-3 flex gap-2 text-xs font-mono flex-wrap">
                      {log.old_value && (
                        <div className="flex-1 min-w-0 p-2 rounded-lg" style={{ background: isDark ? "rgba(239,68,68,0.08)" : "#fff1f2" }}>
                          <p className="text-[10px] font-sans font-semibold mb-1" style={{ color: isDark ? "#f87171" : "#991b1b" }}>Before</p>
                          <pre className="whitespace-pre-wrap break-all text-[10px]" style={{ color: textSub }}>
                            {JSON.stringify(log.old_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div className="flex-1 min-w-0 p-2 rounded-lg" style={{ background: isDark ? "rgba(52,211,153,0.08)" : "#f0fdf4" }}>
                          <p className="text-[10px] font-sans font-semibold mb-1" style={{ color: isDark ? "#34d399" : "#065f46" }}>After</p>
                          <pre className="whitespace-pre-wrap break-all text-[10px]" style={{ color: textSub }}>
                            {JSON.stringify(log.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
