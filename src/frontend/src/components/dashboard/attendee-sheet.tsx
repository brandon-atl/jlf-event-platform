"use client";

import { X, Mail, Phone, Tent, Utensils, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { formatCents } from "@/lib/format";
import type { RegistrationDetail } from "@/lib/api";

interface AttendeeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  registrations: RegistrationDetail[];
  loading?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const { isDark } = useDarkMode();
  const map: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    complete: {
      bg: isDark ? "rgba(52,211,153,0.15)" : "#d1fae5",
      text: isDark ? "#34d399" : "#065f46",
      icon: CheckCircle,
    },
    pending_payment: {
      bg: isDark ? "rgba(251,191,36,0.15)" : "#fef3c7",
      text: isDark ? "#fbbf24" : "#92400e",
      icon: Clock,
    },
    expired: {
      bg: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
      text: isDark ? "#f87171" : "#991b1b",
      icon: AlertTriangle,
    },
    cancelled: {
      bg: isDark ? "rgba(156,163,175,0.15)" : "#f3f4f6",
      text: isDark ? "#9ca3af" : "#6b7280",
      icon: X,
    },
  };
  const s = map[status] ?? map.cancelled;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ background: s.bg, color: s.text }}
    >
      <Icon size={10} />
      {status.replace("_", " ")}
    </span>
  );
}

export function AttendeeSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  registrations,
  loading = false,
}: AttendeeSheetProps) {
  const { isDark } = useDarkMode();
  const c = isDark ? darkColors : colors;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f0f0f0";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        style={{ background: isDark ? darkColors.cream : "#f9fafb" }}
      >
        <SheetHeader className="pb-4 border-b" style={{ borderColor }}>
          <SheetTitle style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
            {title}
          </SheetTitle>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: textSub }}>{subtitle}</p>
          )}
          <p className="text-xs font-semibold" style={{ color: textMuted }}>
            {loading ? "Loading…" : `${registrations.length} attendee${registrations.length !== 1 ? "s" : ""}`}
          </p>
        </SheetHeader>

        <div className="pt-4 space-y-3">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4 h-24 animate-pulse"
                  style={{ background: cardBg, borderColor }}
                />
              ))}
            </div>
          )}

          {!loading && registrations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: textMuted }}>No attendees in this group</p>
            </div>
          )}

          {!loading && registrations.map((reg) => (
            <div
              key={reg.id}
              className="rounded-xl border p-4 shadow-sm"
              style={{ background: cardBg, borderColor }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: `${c.canopy}20`, color: c.canopy }}
                  >
                    {(reg.attendee_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight" style={{ color: textMain }}>
                      {reg.attendee_name ?? "—"}
                    </p>
                    <StatusBadge status={reg.status} />
                  </div>
                </div>
                {reg.payment_amount_cents != null && reg.payment_amount_cents > 0 && (
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: c.bark }}>
                    {formatCents(reg.payment_amount_cents)}
                  </span>
                )}
              </div>

              <div className="space-y-1 mt-2">
                {reg.attendee_email && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: textSub }}>
                    <Mail size={11} style={{ color: textMuted }} />
                    {reg.attendee_email}
                  </p>
                )}
                {reg.attendee_phone && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: textSub }}>
                    <Phone size={11} style={{ color: textMuted }} />
                    {reg.attendee_phone}
                  </p>
                )}
                {reg.accommodation_type && reg.accommodation_type !== "none" && (
                  <p className="text-xs flex items-center gap-1.5 capitalize" style={{ color: textSub }}>
                    <Tent size={11} style={{ color: textMuted }} />
                    {reg.accommodation_type.replace(/_/g, " ")}
                  </p>
                )}
                {reg.dietary_restrictions && reg.dietary_restrictions !== "None" && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: textSub }}>
                    <Utensils size={11} style={{ color: textMuted }} />
                    {reg.dietary_restrictions}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
