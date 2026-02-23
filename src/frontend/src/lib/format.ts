/** Format cents to dollar string */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

/** Format ISO date to short display */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format ISO date to long display */
export function formatDateLong(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Format ISO date to short (no year) */
export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Get initials from a name */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Status display config */
export const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  complete: {
    label: "Complete",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending_payment: {
    label: "Pending Payment",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-50 text-purple-600 border-purple-200",
  },
};

/** Event status color */
export function eventStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "#2d5a3d",
    draft: "#9ca3af",
    completed: "#5b9bd5",
    cancelled: "#d4644a",
  };
  return map[status] || "#9ca3af";
}
