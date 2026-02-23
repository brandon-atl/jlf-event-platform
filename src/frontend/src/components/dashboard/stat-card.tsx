"use client";

import { type LucideIcon } from "lucide-react";
import { colors } from "@/lib/theme";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  accent?: number;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = colors.canopy,
  accent,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300 shadow-sm">
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
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-500 bg-rose-50"
            }`}
          >
            {accent >= 0 ? "↗" : "↘"} {Math.abs(accent)}%
          </span>
        )}
      </div>
      <p
        className="text-2xl font-bold mt-3 tracking-tight"
        style={{ color: colors.forest }}
      >
        {value}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
