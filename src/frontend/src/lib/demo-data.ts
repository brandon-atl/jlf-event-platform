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

// Single source of truth for demo attendee cap — keep in sync with NAMES array
const DEMO_MAX_ATTENDEES = 15;

export const DEMO_DASHBOARD = (eventId: string) => {
  const ev = DEMO_EVENTS.find(e => e.id === eventId) || DEMO_EVENTS[1];
  // Derive status_breakdown from actual DEMO_REGISTRATIONS so numbers match
  const regs = DEMO_REGISTRATIONS(eventId).data;
  const cappedTotal = regs.length;
  const statusCounts = { complete: 0, pending_payment: 0, expired: 0, cancelled: 0, refunded: 0 };
  for (const r of regs) {
    if (r.status in statusCounts) statusCounts[r.status as keyof typeof statusCounts]++;
  }
  return {
    event_id: ev.id,
    event_name: ev.name,
    total_registrations: cappedTotal,
    status_breakdown: statusCounts,
    accommodation_breakdown: (() => {
      const acc = { bell_tent: 0, nylon_tent: 0, self_camping: 0, yurt_shared: 0, none: 0 };
      for (const r of regs) if (r.accommodation_type in acc) acc[r.accommodation_type as keyof typeof acc]++;
      return acc;
    })(),
    dietary_summary: (() => {
      const diet: Record<string, number> = {};
      for (const r of regs) {
        const key = r.dietary_restrictions || "None";
        diet[key] = (diet[key] || 0) + 1;
      }
      return diet;
    })(),
    total_revenue_cents: regs.reduce((sum, r) => sum + (r.status === "complete" ? (r.payment_amount_cents || 0) : 0), 0),
    average_payment_cents: (() => {
      const paid = regs.filter(r => r.status === "complete" && r.payment_amount_cents);
      return paid.length > 0 ? Math.round(paid.reduce((s, r) => s + (r.payment_amount_cents || 0), 0) / paid.length) : 0;
    })(),
    spots_remaining: 30 - cappedTotal,
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
  const count = Math.min(ev.total_registrations, DEMO_MAX_ATTENDEES);
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `r${eventId}-${i}`,
      attendee_id: `att-${i}`,
      event_id: ev.id,
      status: STATUSES[i % STATUSES.length],
      payment_amount_cents: ev.pricing_model === "free" ? 0 : (ev.fixed_price_cents || Math.floor(Math.random() * 10000) + 2000),
      accommodation_type: ACCOM[i % ACCOM.length],
      dietary_restrictions: DIET[i % DIET.length] || undefined,
      source: i < count - 2 ? "registration_form" : "manual",
      notes: i === 5 ? "Amount exceeds event average — possible group payment" : undefined,
      created_at: new Date(Date.now() - (count - i) * 2 * 86400000).toISOString(),
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
