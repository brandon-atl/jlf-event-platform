/**
 * API client for the JLF ERP backend (FastAPI).
 *
 * This layer transforms backend responses into the shapes the frontend
 * components expect — keeping pages agnostic of backend schema evolution.
 */

// Ensure the API URL has a protocol prefix. Vercel env vars sometimes omit it.
function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw; // relative path, use as-is
  return `https://${raw}`;
}

const API_BASE = resolveApiBase();

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

// ── Response transformers ───────────────────────

/** Backend event → frontend EventResponse (flatten stats) */
function transformEvent(raw: BackendEventResponse): EventResponse {
  const stats = raw.stats;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    event_date: raw.event_date,
    event_end_date: raw.event_end_date,
    event_type: raw.event_type,
    pricing_model: raw.pricing_model as "fixed" | "donation" | "free",
    fixed_price_cents: raw.fixed_price_cents,
    min_donation_cents: raw.min_donation_cents,
    capacity: raw.capacity,
    meeting_point_a: raw.meeting_point_a,
    meeting_point_b: raw.meeting_point_b,
    reminder_delay_minutes: raw.reminder_delay_minutes,
    auto_expire_hours: raw.auto_expire_hours,
    registration_fields: raw.registration_fields,
    notification_templates: raw.notification_templates,
    virtual_meeting_url: raw.virtual_meeting_url,
    status: raw.status as EventResponse["status"],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    // Flatten stats
    total_registrations: stats?.total_registrations ?? 0,
    complete_count: stats?.complete ?? 0,
    pending_count: stats?.pending_payment ?? 0,
    total_revenue_cents: stats?.total_revenue_cents ?? 0,
    spots_remaining: stats?.spots_remaining,
  };
}

/** Backend dashboard → frontend EventDashboard */
function transformDashboard(raw: BackendEventDashboard): EventDashboard {
  // Convert dietary_summary from array to Record
  const dietaryMap: Record<string, number> = {};
  if (Array.isArray(raw.dietary_summary)) {
    for (const item of raw.dietary_summary) {
      // Capitalize first letter for display
      const key = item.restriction.charAt(0).toUpperCase() + item.restriction.slice(1);
      dietaryMap[key] = item.count;
    }
  } else if (raw.dietary_summary && typeof raw.dietary_summary === "object") {
    Object.assign(dietaryMap, raw.dietary_summary);
  }

  return {
    event_id: raw.event_id,
    event_name: raw.event_name,
    total_registrations: raw.headcount?.total ?? 0,
    status_breakdown: {
      complete: raw.headcount?.complete ?? 0,
      pending_payment: raw.headcount?.pending_payment ?? 0,
      expired: raw.headcount?.expired ?? 0,
      cancelled: raw.headcount?.cancelled ?? 0,
      refunded: raw.headcount?.refunded ?? 0,
    },
    accommodation_breakdown: raw.accommodation ?? {
      bell_tent: 0,
      nylon_tent: 0,
      self_camping: 0,
      yurt_shared: 0,
      none: 0,
    },
    dietary_summary: dietaryMap,
    total_revenue_cents: raw.revenue?.total_cents ?? 0,
    average_payment_cents: raw.revenue?.average_cents ?? 0,
    spots_remaining: raw.spots_remaining,
  };
}

/** Backend registration → frontend RegistrationDetail (flatten attendee) */
function transformRegistration(raw: BackendRegistrationDetail): RegistrationDetail {
  const att = raw.attendee;
  return {
    id: raw.id,
    attendee_id: raw.attendee_id,
    event_id: raw.event_id,
    status: raw.status as RegistrationDetail["status"],
    payment_amount_cents: raw.payment_amount_cents,
    accommodation_type: raw.accommodation_type ?? "",
    dietary_restrictions: raw.dietary_restrictions,
    intake_data: raw.intake_data,
    waiver_accepted_at: raw.waiver_accepted_at,
    source: raw.source as RegistrationDetail["source"],
    notes: raw.notes,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    // Flatten attendee
    attendee_name: att
      ? `${att.first_name} ${att.last_name}`
      : undefined,
    attendee_email: att?.email,
    attendee_phone: att?.phone,
    checked_in_at: raw.checked_in_at ?? null,
    checked_in_by: raw.checked_in_by ?? null,
  };
}

// ── Auth ────────────────────────────────────────
export const auth = {
  login: async (email: string, password: string) => {
    const tokenRes = await request<{ access_token: string; token_type: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    // Store token immediately so /auth/me can use it
    if (typeof window !== "undefined") {
      localStorage.setItem("jlf_token", tokenRes.access_token);
    }
    // Fetch user info
    const userInfo = await request<{ id: string; email: string; name: string; role: string }>(
      "/auth/me"
    );
    return {
      access_token: tokenRes.access_token,
      token_type: tokenRes.token_type,
      user_id: userInfo.id,
      name: userInfo.name,
      role: userInfo.role,
    };
  },
  me: () =>
    request<{ id: string; email: string; name: string; role: string }>("/auth/me"),
  sendMagicLink: (email: string) =>
    request("/auth/magic-link", { method: "POST", body: JSON.stringify({ email }) }),
  verifyMagicLink: (token: string) =>
    request<{ access_token: string; token_type: string }>(
      `/auth/verify?token=${token}`
    ),
};

// ── Events ──────────────────────────────────────
export const events = {
  list: async (params?: { status?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const raw = await request<{ data: BackendEventResponse[]; meta: PaginationMeta }>(
      `/events?${qs}`
    );
    return {
      data: raw.data.map(transformEvent),
      meta: raw.meta,
    };
  },
  get: async (id: string) => {
    const raw = await request<BackendEventResponse>(`/events/${id}`);
    return transformEvent(raw);
  },
  create: async (data: EventCreate) => {
    const raw = await request<BackendEventResponse>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return transformEvent(raw);
  },
  update: async (id: string, data: Partial<EventCreate>) => {
    const raw = await request<BackendEventResponse>(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return transformEvent(raw);
  },
  delete: (id: string) =>
    request(`/events/${id}`, { method: "DELETE" }),
  duplicate: async (id: string) => {
    const raw = await request<BackendEventResponse>(`/events/${id}/duplicate`, {
      method: "POST",
    });
    return transformEvent(raw);
  },
};

// ── Registrations ───────────────────────────────
export const registrations = {
  list: async (
    eventId: string,
    params?: { status?: string; search?: string; page?: number; per_page?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const raw = await request<{ data: BackendRegistrationDetail[]; meta: PaginationMeta }>(
      `/events/${eventId}/registrations?${qs}`
    );
    return {
      data: raw.data.map(transformRegistration),
      meta: raw.meta,
    };
  },
  get: async (id: string) => {
    const raw = await request<BackendRegistrationDetail>(`/registrations/${id}`);
    return transformRegistration(raw);
  },
  update: (id: string, data: RegistrationUpdate) =>
    request<RegistrationDetail>(`/registrations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remind: (id: string) =>
    request<{ detail: string; attendee_email: string }>(`/registrations/${id}/remind`, {
      method: "POST",
    }),
  createManual: (eventId: string, data: ManualRegistration) =>
    request(`/events/${eventId}/registrations/manual`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  exportCsv: (eventId: string) =>
    `${API_BASE}/events/${eventId}/registrations/export`,
  checkIn: async (eventId: string, registrationId: string) => {
    const raw = await request<BackendRegistrationDetail>(
      `/events/${eventId}/registrations/${registrationId}/checkin`,
      { method: "POST" }
    );
    return transformRegistration(raw);
  },
  undoCheckIn: async (eventId: string, registrationId: string) => {
    const raw = await request<BackendRegistrationDetail>(
      `/events/${eventId}/registrations/${registrationId}/checkin`,
      { method: "DELETE" }
    );
    return transformRegistration(raw);
  },
  auditLog: (eventId: string): Promise<AuditLogEntry[]> =>
    request<AuditLogEntry[]>(`/events/${eventId}/audit`),
};

// ── Dashboard ───────────────────────────────────
export const dashboard = {
  overview: () => request<OverviewDashboard>("/dashboard/overview"),
  event: async (eventId: string) => {
    const raw = await request<BackendEventDashboard>(`/dashboard/events/${eventId}`);
    return transformDashboard(raw);
  },
};

// ── Notifications ───────────────────────────────
export const notifications = {
  sendSms: (eventId: string, message: string) =>
    request(`/events/${eventId}/notifications/sms`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  log: (params?: { page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    return request(`/notifications/log?${qs}`);
  },
};

// ── Co-Creators ────────────────────────────────
export const coCreators = {
  list: () => request<CoCreatorDetail[]>("/co-creators"),
  create: (data: { name: string; email: string }) =>
    request<CoCreatorDetail>("/co-creators", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/co-creators/${id}`, { method: "DELETE" }),
  assignEvent: (id: string, data: { event_id: string; can_see_amounts?: boolean }) =>
    request<void>(`/co-creators/${id}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeEvent: (id: string, eventId: string) =>
    request<void>(`/co-creators/${id}/events/${eventId}`, { method: "DELETE" }),
  sendInvite: (id: string) =>
    request<void>(`/co-creators/${id}/invite`, { method: "POST" }),
};

// ── Attendees (cross-event) ─────────────────────
export const attendees = {
  list: (params?: { search?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const qsStr = qs.toString();
    return request<{ data: AttendeeDirectory[]; meta: PaginationMeta }>(`/attendees${qsStr ? `?${qsStr}` : ""}`);
  },
};

// ── Admin Users ────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export const adminUsers = {
  list: () => request<AdminUser[]>("/admin/users"),
  create: (data: { email: string; name: string; role: "admin" | "operator"; password: string }) =>
    request<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; role?: "admin" | "operator"; password?: string }) =>
    request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/admin/users/${id}`, { method: "DELETE" }),
};

// ── Portal (Co-Creator) ────────────────────────
export const portal = {
  events: () => request<PortalEvent[]>("/portal/events"),
  event: (eventId: string) => request<PortalEventDetail>("/portal/events/" + eventId),
};

// ── Form Templates ─────────────────────────────
export const formTemplates = {
  list: (params?: { form_type?: FormType; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.form_type) qs.set("form_type", params.form_type);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    return request<{ data: FormTemplateResponse[]; meta: PaginationMeta }>(
      `/form-templates?${qs}`
    );
  },
  get: (id: string) =>
    request<FormTemplateResponse>(`/form-templates/${id}`),
  create: (data: FormTemplateCreate) =>
    request<FormTemplateResponse>("/form-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<FormTemplateCreate>) =>
    request<FormTemplateResponse>(`/form-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/form-templates/${id}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    request<FormTemplateResponse>(`/form-templates/${id}/duplicate`, {
      method: "POST",
    }),
};

// ── Event Form Links ───────────────────────────
export const eventFormLinks = {
  list: (eventId: string) =>
    request<EventFormLinkResponse[]>(`/events/${eventId}/forms`),
  create: (eventId: string, data: EventFormLinkCreate) =>
    request<EventFormLinkResponse>(`/events/${eventId}/forms`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (eventId: string, linkId: string, data: { sort_order?: number; is_waiver?: boolean }) =>
    request<EventFormLinkResponse>(`/events/${eventId}/forms/${linkId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (eventId: string, linkId: string) =>
    request<void>(`/events/${eventId}/forms/${linkId}`, { method: "DELETE" }),
};

// ── Public Registration ─────────────────────────
export const register = {
  eventInfo: async (slug: string) => {
    const raw = await request<{ event: EventPublicInfo }>(`/register/${slug}/info`);
    return raw.event;
  },
  submit: (slug: string, data: RegistrationCreate) =>
    request<{ registration_id: string; checkout_url: string | null; status: string }>(
      `/register/${slug}`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  submitGroup: (slug: string, data: GroupRegistrationCreate) =>
    request<GroupRegistrationResponse>(
      `/register/${slug}/group`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// ── Scholarship Links ──────────────────────────
export const scholarshipLinks = {
  list: (params?: { event_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.event_id) qs.set("event_id", params.event_id);
    return request<ScholarshipLinkResponse[]>(`/scholarship-links?${qs}`);
  },
  create: (data: ScholarshipLinkCreate) =>
    request<ScholarshipLinkResponse>("/scholarship-links", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/scholarship-links/${id}`, { method: "DELETE" }),
  validate: (code: string) =>
    request<ScholarshipLinkValidation>(`/scholarship-links/validate/${code}`),
};

// ── Memberships ────────────────────────────────
export const memberships = {
  list: () => request<MembershipResponse[]>("/memberships"),
  create: (data: MembershipCreate) =>
    request<MembershipResponse>("/memberships", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: MembershipUpdate) =>
    request<MembershipResponse>(`/memberships/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/memberships/${id}`, { method: "DELETE" }),
};

// ── Backend response types (internal) ───────────

interface BackendEventResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  event_type: string;
  pricing_model: string;
  fixed_price_cents?: number;
  min_donation_cents?: number;
  capacity?: number;
  meeting_point_a?: string;
  meeting_point_b?: string;
  reminder_delay_minutes: number;
  auto_expire_hours: number;
  registration_fields?: Record<string, unknown>;
  notification_templates?: Record<string, unknown>;
  virtual_meeting_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  stats?: {
    total_registrations: number;
    complete: number;
    pending_payment: number;
    cancelled: number;
    refunded: number;
    expired: number;
    total_revenue_cents: number;
    spots_remaining?: number;
    accommodation_breakdown?: Record<string, number>;
  };
}

interface BackendEventDashboard {
  event_id: string;
  event_name: string;
  headcount: {
    total: number;
    complete: number;
    pending_payment: number;
    cancelled: number;
    refunded: number;
    expired: number;
  };
  accommodation: {
    bell_tent: number;
    nylon_tent: number;
    self_camping: number;
    yurt_shared: number;
    none: number;
  };
  dietary_summary: Array<{ restriction: string; count: number }>;
  revenue: {
    total_cents: number;
    average_cents: number;
    payment_count: number;
  };
  spots_remaining?: number;
  capacity?: number;
}

interface BackendRegistrationDetail {
  id: string;
  attendee_id: string;
  event_id: string;
  status: string;
  payment_amount_cents?: number;
  stripe_checkout_session_id?: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  intake_data?: Record<string, unknown>;
  waiver_accepted_at?: string;
  source: string;
  notes?: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  created_at: string;
  updated_at: string;
  attendee?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

// ── Public types (consumed by pages) ────────────

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
  notification_templates?: Record<string, unknown>;
  virtual_meeting_url?: string;
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
  virtual_meeting_url?: string;
  notification_templates?: Record<string, unknown>;
  reminder_delay_minutes?: number;
  auto_expire_hours?: number;
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
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  created_at: string;
  updated_at: string;
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  timestamp: string;
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
  intake_data?: Record<string, Record<string, unknown>>;
  donation_amount_cents?: number;
  payment_method?: "stripe" | "cash";
  scholarship_code?: string;
}

export interface GuestData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  intake_data?: Record<string, Record<string, unknown>>;
  waiver_accepted: boolean;
  accommodation_type?: string;
  dietary_restrictions?: string;
}

export interface GroupRegistrationCreate {
  payer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  guests: GuestData[];
  payment_method: string;
  scholarship_code?: string;
  donation_amount_cents?: number;
}

export interface GroupRegistrationResponse {
  group_id: string;
  registrations: Array<{ registration_id: string; attendee_name: string }>;
  checkout_url?: string | null;
  status: string;
  message?: string;
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
  meeting_point_a?: string;
  allow_cash_payment?: boolean;
  linked_forms?: EventFormLinkResponse[];
}

// ── Form Templates ─────────────────────────────

export interface FormTemplateField {
  id: string;
  type: "text" | "textarea" | "dropdown" | "checkbox" | "multi_select" | "radio" | "date" | "number";
  label: string;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string[];
}

export type FormType =
  | "intake"
  | "waiver"
  | "accommodation"
  | "dietary"
  | "travel"
  | "logistics"
  | "health"
  | "legal"
  | "custom";

export interface FormTemplateResponse {
  id: string;
  name: string;
  description?: string;
  form_type: FormType;
  fields: FormTemplateField[];
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateCreate {
  name: string;
  description?: string;
  form_type: FormType;
  fields: FormTemplateField[];
  is_default?: boolean;
}

export interface EventFormLinkResponse {
  id: string;
  event_id: string;
  form_template_id: string;
  is_waiver: boolean;
  sort_order: number;
  form_template: FormTemplateResponse;
}

export interface EventFormLinkCreate {
  form_template_id: string;
  is_waiver?: boolean;
  sort_order?: number;
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

export interface CoCreatorEventBrief {
  event_id: string;
  event_name: string;
  can_see_amounts: boolean;
}

export interface CoCreatorDetail {
  id: string;
  name: string;
  email: string;
  created_at: string;
  events: CoCreatorEventBrief[];
}

export interface PortalEvent {
  id: string;
  name: string;
  event_date: string;
  event_end_date?: string;
  event_type: string;
  status: string;
  total_registrations: number;
  complete_registrations: number;
  capacity?: number;
}

export interface PortalAttendee {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  accommodation_type?: string;
  dietary_restrictions?: string;
  payment_amount_cents?: number;
}

export interface PortalEventDetail {
  id: string;
  name: string;
  event_date: string;
  event_end_date?: string;
  event_type: string;
  status: string;
  capacity?: number;
  meeting_point_a?: string;
  meeting_point_b?: string;
  attendees: PortalAttendee[];
}

export interface AttendeeDirectory {
  id: string;
  name: string;
  email: string;
  phone?: string;
  event_count: number;
  total_paid_cents: number;
  last_registration: string;
}

// ── Scholarship Links ─────────────────────────

export interface ScholarshipLinkResponse {
  id: string;
  event_id: string;
  attendee_id?: string | null;
  code: string;
  scholarship_price_cents: number;
  stripe_coupon_id?: string | null;
  max_uses: number;
  uses: number;
  created_by: string;
  created_at: string;
  event_name?: string | null;
}

export interface ScholarshipLinkCreate {
  event_id: string;
  code: string;
  scholarship_price_cents?: number;
  max_uses?: number;
  attendee_id?: string;
}

export interface ScholarshipLinkValidation {
  valid: boolean;
  event_id?: string | null;
  scholarship_price_cents?: number | null;
  remaining_uses?: number | null;
}

// ── Memberships ───────────────────────────────

export interface MembershipResponse {
  id: string;
  attendee_id: string;
  tier: string;
  discount_type: string;
  discount_value_cents: number;
  started_at: string;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
}

export interface MembershipCreate {
  attendee_id: string;
  tier?: string;
  discount_value_cents?: number;
}

export interface MembershipUpdate {
  tier?: string;
  discount_value_cents?: number;
  is_active?: boolean;
}
