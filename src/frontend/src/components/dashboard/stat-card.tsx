"use client";

import { type LucideIcon } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { colors, darkColors } from "@/lib/theme";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  accent?: number;
  onClick?: () => void;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = colors.canopy,
  accent,
  onClick,
}: StatCardProps) {
  const { isDark } = useDarkMode();
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 ${onClick ? "cursor-pointer hover:shadow-md hover:ring-1 hover:ring-inset active:scale-[0.98]" : "hover:shadow-md"}`}
      style={{ background: cardBg, borderColor, ...(onClick ? { ["--tw-ring-color" as string]: `${color}40` } : {}) }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {accent !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              accent >= 0
                ? isDark ? "text-emerald-400 bg-emerald-400/10" : "text-emerald-600 bg-emerald-50"
                : isDark ? "text-rose-400 bg-rose-400/10" : "text-rose-500 bg-rose-50"
            }`}
          >
            {accent >= 0 ? "↗" : "↘"} {Math.abs(accent)}%
          </span>
        )}
      </div>
      <p
        className="text-2xl font-bold mt-3 tracking-tight"
        style={{ color: textMain }}
      >
        {value}
      </p>
      <p className="text-sm" style={{ color: textSub }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: textMuted }}>{sub}</p>}
    </div>
  );
}
