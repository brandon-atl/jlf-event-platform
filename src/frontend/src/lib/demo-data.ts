/**
 * Demo data for showcasing the ERP — based on real JLF events.
 */

export const DEMO_EVENTS = [
  {
    id: "e1", name: "Intro to Loving Awareness (Zoom)", slug: "loving-awareness-zoom",
    event_date: "2026-02-19", event_type: "Ashram", pricing_model: "free" as const,
    fixed_price_cents: 0, status: "active" as const, meeting_point_a: "Zoom (link emailed)",
    total_registrations: 34, complete_count: 28, pending_count: 6, total_revenue_cents: 0,
    created_at: "2026-01-15", updated_at: "2026-02-19",
  },
  {
    id: "e2", name: "Emerging from Winter Retreat", slug: "emerging-winter",
    event_date: "2026-02-21", event_end_date: "2026-02-22", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 12500, status: "active" as const,
    meeting_point_a: "Heated Yurt — Basecamp", meeting_point_b: "Stargazing Meadow",
    total_registrations: 18, complete_count: 14, pending_count: 3, total_revenue_cents: 225000,
    created_at: "2026-01-10", updated_at: "2026-02-21",
  },
  {
    id: "e3", name: "Green Burial 101 Virtual Tour", slug: "green-burial-101",
    event_date: "2026-02-22", event_type: "Green Burial", pricing_model: "free" as const,
    fixed_price_cents: 0, status: "active" as const, meeting_point_a: "Zoom (link emailed)",
    total_registrations: 22, complete_count: 20, pending_count: 2, total_revenue_cents: 0,
    created_at: "2026-01-20", updated_at: "2026-02-22",
  },
  {
    id: "e4", name: "March Community Weekend", slug: "march-community",
    event_date: "2026-03-06", event_end_date: "2026-03-08", event_type: "Community Weekend",
    pricing_model: "fixed" as const, fixed_price_cents: 5000, status: "active" as const,
    meeting_point_a: "Basecamp Welcome Circle", meeting_point_b: "Fire Circle",
    total_registrations: 26, complete_count: 18, pending_count: 7, total_revenue_cents: 182000,
    created_at: "2026-01-25", updated_at: "2026-02-23",
  },
  {
    id: "e5", name: "Ram Dass Evenings — Satsang", slug: "satsang-march",
    event_date: "2026-03-06", event_end_date: "2026-03-07", event_type: "Meditation",
    pricing_model: "donation" as const, fixed_price_cents: 0, status: "active" as const,
    meeting_point_a: "Meditation Yurt",
    total_registrations: 15, complete_count: 12, pending_count: 3, total_revenue_cents: 67500,
    created_at: "2026-02-01", updated_at: "2026-02-23",
  },
  {
    id: "e6", name: "March Forest Therapy — Shinrin Yoku", slug: "forest-therapy-march",
    event_date: "2026-03-08", event_type: "Forest Therapy", pricing_model: "fixed" as const,
    fixed_price_cents: 12500, status: "active" as const,
    meeting_point_a: "Yurt — Rose Tea Ceremony", meeting_point_b: "Forest Trailhead",
    total_registrations: 12, complete_count: 10, pending_count: 2, total_revenue_cents: 150000,
    created_at: "2026-02-01", updated_at: "2026-02-23",
  },
  {
    id: "e7", name: "Loving Awareness Retreat w/ Sitaram Dass", slug: "loving-awareness-retreat",
    event_date: "2026-03-20", event_end_date: "2026-03-22", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 25000, status: "active" as const,
    meeting_point_a: "Ashram Main Gathering", meeting_point_b: "Bhakti Mountain Trail",
    total_registrations: 32, complete_count: 22, pending_count: 9, total_revenue_cents: 800000,
    created_at: "2026-01-05", updated_at: "2026-02-23",
  },
  {
    id: "e8", name: "5-Day Forest Sadhana w/ Sitaram Dass", slug: "forest-sadhana",
    event_date: "2026-03-22", event_end_date: "2026-03-27", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 45000, status: "active" as const,
    meeting_point_a: "Ashram Main Gathering", meeting_point_b: "Bhakti Mountain Summit",
    total_registrations: 16, complete_count: 12, pending_count: 4, total_revenue_cents: 720000,
    created_at: "2026-01-05", updated_at: "2026-02-23",
  },
  {
    id: "e9", name: "Intimacy & Connection Retreat", slug: "intimacy-connection",
    event_date: "2026-04-24", event_end_date: "2026-04-26", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 27500, status: "active" as const,
    meeting_point_a: "Welcome Circle — Basecamp",
    total_registrations: 20, complete_count: 14, pending_count: 5, total_revenue_cents: 550000,
    created_at: "2026-02-01", updated_at: "2026-02-23",
  },
  {
    id: "e10", name: "GAY by NATURE Retreat", slug: "gay-by-nature",
    event_date: "2026-05-28", event_end_date: "2026-05-31", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 30000, status: "draft" as const,
    meeting_point_a: "Basecamp Welcome", meeting_point_b: "Fire Circle",
    total_registrations: 0, complete_count: 0, pending_count: 0, total_revenue_cents: 0,
    created_at: "2026-02-15", updated_at: "2026-02-23",
  },
];

export const DEMO_DASHBOARD = (eventId: string) => {
  const ev = DEMO_EVENTS.find(e => e.id === eventId) || DEMO_EVENTS[1];
  return {
    event_id: ev.id,
    event_name: ev.name,
    total_registrations: ev.total_registrations,
    status_breakdown: {
      complete: ev.complete_count,
      pending_payment: ev.pending_count,
      expired: Math.floor(ev.total_registrations * 0.05),
      cancelled: Math.max(0, ev.total_registrations - ev.complete_count - ev.pending_count - Math.floor(ev.total_registrations * 0.05)),
      refunded: 0,
    },
    accommodation_breakdown: {
      bell_tent: Math.floor(ev.complete_count * 0.4),
      nylon_tent: Math.floor(ev.complete_count * 0.25),
      self_camping: Math.floor(ev.complete_count * 0.2),
      yurt_shared: Math.floor(ev.complete_count * 0.1),
      none: ev.complete_count - Math.floor(ev.complete_count * 0.4) - Math.floor(ev.complete_count * 0.25) - Math.floor(ev.complete_count * 0.2) - Math.floor(ev.complete_count * 0.1),
    },
    dietary_summary: {
      vegetarian: Math.floor(ev.complete_count * 0.3),
      vegan: Math.floor(ev.complete_count * 0.2),
      "gluten-free": Math.floor(ev.complete_count * 0.1),
      none: ev.complete_count - Math.floor(ev.complete_count * 0.3) - Math.floor(ev.complete_count * 0.2) - Math.floor(ev.complete_count * 0.1),
    },
    total_revenue_cents: ev.total_revenue_cents,
    average_payment_cents: ev.complete_count > 0 ? Math.round(ev.total_revenue_cents / ev.complete_count) : 0,
    spots_remaining: 30 - ev.total_registrations,
  };
};

const NAMES = [
  "Mara Chen", "Devon Okafor", "Sage Willowbrook", "River Nakamura", "Juniper Hayes",
  "Aspen Torres", "Indigo Park", "Wren Delacroix", "Cedar Mbeki", "Fern Kowalski",
  "Sol Reeves", "Lark Johansson", "Willow Tanaka", "Rowan Baptiste", "Sky Petrov",
];
const ACCOM = ["bell_tent", "nylon_tent", "self_camping", "yurt_shared", "none"];
const DIET = ["Vegetarian", "Vegan", "Gluten-free", "", "", ""];
const STATUSES = ["complete", "complete", "complete", "complete", "pending_payment", "expired"] as const;

export const DEMO_REGISTRATIONS = (eventId: string) => {
  const ev = DEMO_EVENTS.find(e => e.id === eventId) || DEMO_EVENTS[1];
  const count = Math.min(ev.total_registrations, NAMES.length);
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `r${eventId}-${i}`,
      attendee_id: `att-${i}`,
      event_id: ev.id,
      status: STATUSES[i % STATUSES.length],
      payment_amount_cents: ev.fixed_price_cents || Math.floor(Math.random() * 10000) + 2000,
      accommodation_type: ACCOM[i % ACCOM.length],
      dietary_restrictions: DIET[i % DIET.length] || undefined,
      source: i < count - 2 ? "registration_form" : "manual",
      notes: i === 5 ? "Amount exceeds event average — possible group payment" : undefined,
      created_at: "2026-02-15T10:00:00Z",
      updated_at: "2026-02-23T10:00:00Z",
      attendee_name: NAMES[i],
      attendee_email: NAMES[i].toLowerCase().replace(" ", ".") + "@email.com",
      attendee_phone: `+1-555-0${100 + i}`,
      intake_data: {
        experience: ["Beginner", "Intermediate", "Advanced"][i % 3],
        emergency_contact: `${["Pat", "Dana", "Sam"][i % 3]} ${NAMES[i].split(" ")[1]}, 555-0${200 + i}`,
        how_heard: ["Instagram", "Friend referral", "Website", "Newsletter", "Returning attendee"][i % 5],
      },
    })),
    meta: { total: ev.total_registrations, page: 1, per_page: 25 },
  };
};

export const DEMO_COCREATORS = [
  { id: "c1", name: "Sitaram Dass", email: "sitaram@sacredcommunityproject.org", events: ["Loving Awareness Retreat w/ Sitaram Dass", "5-Day Forest Sadhana w/ Sitaram Dass"], last_active: "2026-02-16" },
  { id: "c2", name: "Christina Della Iacono", email: "christina@justloveforest.com", events: ["Intimacy & Connection Retreat"], last_active: "2026-02-10" },
  { id: "c3", name: "Naveed N.", email: "naveed@justloveforest.com", events: ["March Community Weekend", "March Forest Therapy — Shinrin Yoku"], last_active: "2026-02-17" },
];

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("jlf_demo") === "true";
}

export function enableDemo() {
  localStorage.setItem("jlf_demo", "true");
  localStorage.setItem("jlf_token", "demo-token");
}

export function disableDemo() {
  localStorage.removeItem("jlf_demo");
  localStorage.removeItem("jlf_token");
}
