/**
 * API client for the JLF ERP backend (FastAPI).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  status: number;
  detail: string;
  code?: string;

  constructor(status: number, detail: string, code?: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jlf_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Unknown error", body.code);
  }

  // Handle 204 No Content
  if (res.status === 204) return null as T;

  return res.json();
}

// ── Auth ────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user_id: string; role: string; name: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  me: () =>
    request<{ id: string; email: string; name: string; role: string }>("/auth/me"),
  sendMagicLink: (email: string) =>
    request("/auth/magic-link", { method: "POST", body: JSON.stringify({ email }) }),
  verifyMagicLink: (token: string) =>
    request<{ access_token: string; token_type: string; user_id: string; role: string; name: string }>(
      `/auth/verify?token=${token}`
    ),
};

// ── Events ──────────────────────────────────────
export const events = {
  list: (params?: { status?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    return request<{ data: EventResponse[]; meta: PaginationMeta }>(`/events?${qs}`);
  },
  get: (id: string) => request<EventResponse>(`/events/${id}`),
  create: (data: EventCreate) =>
    request<EventResponse>("/events", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<EventCreate>) =>
    request<EventResponse>(`/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/events/${id}`, { method: "DELETE" }),
};

// ── Registrations ───────────────────────────────
export const registrations = {
  list: (eventId: string, params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    return request<{ data: RegistrationDetail[]; meta: PaginationMeta }>(
      `/events/${eventId}/registrations?${qs}`
    );
  },
  get: (id: string) => request<RegistrationDetail>(`/registrations/${id}`),
  update: (id: string, data: RegistrationUpdate) =>
    request<RegistrationDetail>(`/registrations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  createManual: (eventId: string, data: ManualRegistration) =>
    request(`/events/${eventId}/registrations/manual`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  exportCsv: (eventId: string) =>
    `${API_BASE}/events/${eventId}/registrations/export`,
};

// ── Dashboard ───────────────────────────────────
export const dashboard = {
  overview: () => request<OverviewDashboard>("/dashboard/overview"),
  event: (eventId: string) => request<EventDashboard>(`/dashboard/events/${eventId}`),
};

// ── Notifications ───────────────────────────────
export const notifications = {
  sendSms: (eventId: string) =>
    request(`/events/${eventId}/notifications/sms`, { method: "POST" }),
  log: (params?: { page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    return request(`/notifications/log?${qs}`);
  },
};

// ── Public Registration ─────────────────────────
export const register = {
  eventInfo: (slug: string) =>
    request<EventPublicInfo>(`/register/${slug}/info`),
  submit: (slug: string, data: RegistrationCreate) =>
    request<{ registration_id: string; checkout_url: string | null; status: string }>(
      `/register/${slug}`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// ── Types ───────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
}

export interface EventResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  event_type: string;
  pricing_model: "fixed" | "donation" | "free";
  fixed_price_cents?: number;
  min_donation_cents?: number;
  capacity?: number;
  meeting_point_a?: string;
  meeting_point_b?: string;
  reminder_delay_minutes: number;
  auto_expire_hours: number;
  registration_fields?: Record<string, unknown>;
  status: "draft" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  total_registrations: number;
  complete_count: number;
  pending_count: number;
  total_revenue_cents: number;
  spots_remaining?: number;
}

export interface EventCreate {
  name: string;
  slug: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  event_type?: string;
  pricing_model?: "fixed" | "donation" | "free";
  fixed_price_cents?: number;
  min_donation_cents?: number;
  capacity?: number;
  meeting_point_a?: string;
  meeting_point_b?: string;
  status?: "draft" | "active" | "completed" | "cancelled";
}

export interface RegistrationDetail {
  id: string;
  attendee_id: string;
  event_id: string;
  status: "pending_payment" | "complete" | "expired" | "cancelled" | "refunded";
  payment_amount_cents?: number;
  accommodation_type: string;
  dietary_restrictions?: string;
  intake_data?: Record<string, unknown>;
  waiver_accepted_at?: string;
  source: "registration_form" | "manual" | "walk_in";
  notes?: string;
  created_at: string;
  updated_at: string;
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
}

export interface RegistrationUpdate {
  status?: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  notes?: string;
  payment_amount_cents?: number;
}

export interface ManualRegistration {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  source?: string;
  payment_amount_cents?: number;
  notes?: string;
  status?: string;
}

export interface RegistrationCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  waiver_accepted: boolean;
  intake_data?: Record<string, unknown>;
}

export interface EventPublicInfo {
  name: string;
  slug: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  event_type: string;
  pricing_model: "fixed" | "donation" | "free";
  fixed_price_cents?: number;
  min_donation_cents?: number;
  capacity?: number;
  spots_remaining?: number;
  registration_fields?: Record<string, unknown>;
}

export interface OverviewDashboard {
  active_events: number;
  total_registrations: number;
  total_complete: number;
  total_pending: number;
  total_revenue_cents: number;
  upcoming_events: Array<Record<string, unknown>>;
}

export interface EventDashboard {
  event_id: string;
  event_name: string;
  total_registrations: number;
  status_breakdown: {
    pending_payment: number;
    complete: number;
    expired: number;
    cancelled: number;
    refunded: number;
  };
  accommodation_breakdown: {
    bell_tent: number;
    nylon_tent: number;
    self_camping: number;
    yurt_shared: number;
    none: number;
  };
  dietary_summary: Record<string, number>;
  total_revenue_cents: number;
  average_payment_cents: number;
  spots_remaining?: number;
}
