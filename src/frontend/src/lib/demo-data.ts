/**
 * Demo data — mirrors the Railway production seed exactly.
 * Same 15 attendees, same registrations, same statuses, same dietary/accommodation.
 * When Brian demos the system, what he shows = what's in the live DB.
 *
 * Sync with: src/backend/scripts/seed_demo.py
 */

// ── Types ────────────────────────────────────────────────────────────────────

type RegStatus = "complete" | "pending_payment" | "expired" | "cancelled";

interface DemoRegistration {
  id: string;
  attendee_id: string;
  event_id: string;
  status: RegStatus;
  payment_amount_cents: number;
  accommodation_type: string;
  dietary_restrictions?: string;
  source: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  intake_data: {
    experience: string;
    emergency_contact: string;
    how_heard: string;
  };
}

// ── 15 Recurring Community Members ───────────────────────────────────────────

const PEOPLE: Record<string, { name: string; email: string; phone: string; dietary?: string }> = {
  mara:    { name: "Mara Chen",        email: "mara.chen@gmail.com",         phone: "+1-770-555-0101", dietary: "Vegetarian" },
  devon:   { name: "Devon Okafor",     email: "devon.okafor@gmail.com",      phone: "+1-404-555-0102", dietary: "Vegan" },
  sage:    { name: "Sage Willowbrook", email: "sage.willowbrook@icloud.com", phone: "+1-678-555-0103", dietary: "Gluten-Free" },
  river:   { name: "River Nakamura",   email: "river.nakamura@gmail.com",    phone: "+1-770-555-0104", dietary: "None" },
  juniper: { name: "Juniper Hayes",    email: "juniper.hayes@gmail.com",     phone: "+1-404-555-0105", dietary: "Vegetarian" },
  aspen:   { name: "Aspen Torres",     email: "aspen.torres@gmail.com",      phone: "+1-678-555-0106", dietary: "None" },
  indigo:  { name: "Indigo Park",      email: "indigo.park@icloud.com",      phone: "+1-404-555-0107", dietary: "Vegetarian" },
  wren:    { name: "Wren Delacroix",   email: "wren.delacroix@gmail.com",    phone: "+1-770-555-0108", dietary: "Vegan" },
  cedar:   { name: "Cedar Mbeki",      email: "cedar.mbeki@gmail.com",       phone: "+1-404-555-0109", dietary: "Gluten-Free" },
  fern:    { name: "Fern Kowalski",    email: "fern.kowalski@gmail.com",     phone: "+1-678-555-0110", dietary: "None" },
  sol:     { name: "Sol Reeves",       email: "sol.reeves@gmail.com",        phone: "+1-404-555-0111", dietary: "None" },
  lark:    { name: "Lark Johansson",   email: "lark.johansson@icloud.com",   phone: "+1-770-555-0112", dietary: "Vegetarian" },
  willow:  { name: "Willow Tanaka",    email: "willow.tanaka@gmail.com",     phone: "+1-404-555-0113", dietary: "Vegan" },
  rowan:   { name: "Rowan Baptiste",   email: "rowan.baptiste@gmail.com",    phone: "+1-678-555-0114", dietary: "Gluten-Free" },
  sky:     { name: "Sky Petrov",       email: "sky.petrov@gmail.com",        phone: "+1-404-555-0115", dietary: "None" },
};

const HOW_HEARD = ["Instagram", "Friend referral", "Newsletter", "Website", "Returning attendee"];
const EXPERIENCE = ["Beginner", "Returning", "Regular"];

function mkReg(
  eventId: string,
  idx: number,
  key: string,
  status: RegStatus,
  amountCents: number,
  accom: string,
  dietaryOverride: string | null | undefined,
  checkinISO: string | null,
  createdISO: string,
): DemoRegistration {
  const p = PEOPLE[key];
  const dietary = dietaryOverride !== undefined ? (dietaryOverride ?? undefined) : p.dietary;
  const keyHash = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const evHash = eventId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    id: `r${eventId}-${idx}`,
    attendee_id: `att-${key}`,
    event_id: eventId,
    status,
    payment_amount_cents: status === "complete" ? amountCents : 0,
    accommodation_type: accom,
    dietary_restrictions: dietary,
    source: "registration_form",
    created_at: createdISO,
    updated_at: createdISO,
    attendee_name: p.name,
    attendee_email: p.email,
    attendee_phone: p.phone,
    checked_in_at: status === "complete" ? checkinISO : null,
    checked_in_by: checkinISO && status === "complete" ? "brian@justloveforest.com" : null,
    intake_data: {
      experience: EXPERIENCE[keyHash % 3],
      how_heard: HOW_HEARD[(keyHash + evHash) % 5],
      emergency_contact: `${key.charAt(0).toUpperCase() + key.slice(1)} Emergency, 555-${(900 + keyHash % 100).toString().padStart(4, "0")}`,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(d: number, h = 2): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(dt.getHours() - h);
  return dt.toISOString();
}

// ── Events ────────────────────────────────────────────────────────────────────

export const DEMO_EVENTS = [
  {
    id: "e1", name: "Intro to Loving Awareness (Zoom)", slug: "loving-awareness-zoom",
    event_date: "2026-02-19", event_type: "Ashram", pricing_model: "free" as const,
    fixed_price_cents: 0, status: "active" as const, meeting_point_a: "Zoom (link emailed)",
    total_registrations: 11, complete_count: 8, pending_count: 2, total_revenue_cents: 0,
    created_at: "2026-01-15", updated_at: "2026-02-19",
  },
  {
    id: "e2", name: "Emerging from Winter Retreat", slug: "emerging-winter",
    event_date: "2026-02-21", event_end_date: "2026-02-22", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 12500, status: "active" as const,
    meeting_point_a: "Heated Yurt — Basecamp", meeting_point_b: "Stargazing Meadow",
    total_registrations: 12, complete_count: 10, pending_count: 1, total_revenue_cents: 125000,
    created_at: "2026-01-10", updated_at: "2026-02-21",
  },
  {
    id: "e3", name: "Green Burial 101 Virtual Tour", slug: "green-burial-101",
    event_date: "2026-02-22", event_type: "Green Burial", pricing_model: "free" as const,
    fixed_price_cents: 0, status: "active" as const, meeting_point_a: "Zoom (link emailed)",
    total_registrations: 8, complete_count: 7, pending_count: 1, total_revenue_cents: 0,
    created_at: "2026-01-20", updated_at: "2026-02-22",
  },
  {
    id: "e4", name: "March Community Weekend", slug: "march-community",
    event_date: "2026-03-06", event_end_date: "2026-03-08", event_type: "Community Weekend",
    pricing_model: "fixed" as const, fixed_price_cents: 5000, status: "active" as const,
    meeting_point_a: "Basecamp Welcome Circle", meeting_point_b: "Fire Circle",
    total_registrations: 15, complete_count: 11, pending_count: 3, total_revenue_cents: 55000,
    created_at: "2026-01-25", updated_at: "2026-02-25",
  },
  {
    id: "e5", name: "Ram Dass Evenings — Satsang", slug: "satsang-march",
    event_date: "2026-03-06", event_end_date: "2026-03-07", event_type: "Meditation",
    pricing_model: "donation" as const, fixed_price_cents: 0, status: "active" as const,
    meeting_point_a: "Meditation Yurt",
    total_registrations: 11, complete_count: 8, pending_count: 2, total_revenue_cents: 30500,
    created_at: "2026-02-01", updated_at: "2026-02-25",
  },
  {
    id: "e6", name: "March Forest Therapy — Shinrin Yoku", slug: "forest-therapy-march",
    event_date: "2026-03-08", event_type: "Forest Therapy", pricing_model: "fixed" as const,
    fixed_price_cents: 12500, status: "active" as const,
    meeting_point_a: "Yurt — Rose Tea Ceremony", meeting_point_b: "Forest Trailhead",
    total_registrations: 10, complete_count: 7, pending_count: 2, total_revenue_cents: 87500,
    created_at: "2026-02-01", updated_at: "2026-02-25",
  },
  {
    id: "e7", name: "Loving Awareness Retreat w/ Sitaram Dass", slug: "loving-awareness-retreat",
    event_date: "2026-03-20", event_end_date: "2026-03-22", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 25000, status: "active" as const,
    meeting_point_a: "Ashram Main Gathering", meeting_point_b: "Bhakti Mountain Trail",
    total_registrations: 15, complete_count: 12, pending_count: 3, total_revenue_cents: 300000,
    created_at: "2026-01-05", updated_at: "2026-02-25",
  },
  {
    id: "e8", name: "5-Day Forest Sadhana w/ Sitaram Dass", slug: "forest-sadhana",
    event_date: "2026-03-22", event_end_date: "2026-03-27", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 45000, status: "active" as const,
    meeting_point_a: "Ashram Main Gathering", meeting_point_b: "Bhakti Mountain Summit",
    total_registrations: 12, complete_count: 9, pending_count: 2, total_revenue_cents: 405000,
    created_at: "2026-01-05", updated_at: "2026-02-25",
  },
  {
    id: "e9", name: "Intimacy & Connection Retreat", slug: "intimacy-connection",
    event_date: "2026-04-24", event_end_date: "2026-04-26", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 27500, status: "active" as const,
    meeting_point_a: "Welcome Circle — Basecamp",
    total_registrations: 15, complete_count: 10, pending_count: 3, total_revenue_cents: 275000,
    created_at: "2026-02-01", updated_at: "2026-02-25",
  },
  {
    id: "e10", name: "GAY by NATURE Retreat", slug: "gay-by-nature",
    event_date: "2026-05-28", event_end_date: "2026-05-31", event_type: "Retreats",
    pricing_model: "fixed" as const, fixed_price_cents: 30000, status: "draft" as const,
    meeting_point_a: "Basecamp Welcome", meeting_point_b: "Fire Circle",
    total_registrations: 0, complete_count: 0, pending_count: 0, total_revenue_cents: 0,
    created_at: "2026-02-15", updated_at: "2026-02-25",
  },
];

// ── Registration Data ─────────────────────────────────────────────────────────
// Exactly mirrors seed_demo.py — same people, same statuses, same amounts.

const REG_DATA: Record<string, DemoRegistration[]> = {

  // e1: Intro to Loving Awareness (Zoom) — free, 11 registrations
  e1: [
    mkReg("e1",0,"mara",   "complete",       0,   "none",undefined,null,         daysAgo(21)),
    mkReg("e1",1,"devon",  "complete",       0,   "none",undefined,null,         daysAgo(19)),
    mkReg("e1",2,"sage",   "complete",       0,   "none",undefined,null,         daysAgo(17)),
    mkReg("e1",3,"river",  "complete",       0,   "none",undefined,null,         daysAgo(16)),
    mkReg("e1",4,"fern",   "complete",       0,   "none",undefined,null,         daysAgo(14)),
    mkReg("e1",5,"juniper","complete",       0,   "none",undefined,null,         daysAgo(12)),
    mkReg("e1",6,"willow", "complete",       0,   "none",undefined,null,         daysAgo(10)),
    mkReg("e1",7,"sky",    "complete",       0,   "none",undefined,null,         daysAgo(8)),
    mkReg("e1",8,"wren",   "pending_payment",0,   "none",undefined,null,         daysAgo(5)),
    mkReg("e1",9,"cedar",  "pending_payment",0,   "none",undefined,null,         daysAgo(3)),
    mkReg("e1",10,"aspen", "expired",        0,   "none",undefined,null,         daysAgo(2)),
  ],

  // e2: Emerging from Winter — past retreat, $125, all checked in
  e2: [
    mkReg("e2",0, "mara",   "complete", 12500,"bell_tent",   undefined,"2026-02-21T15:10:00Z",daysAgo(28)),
    mkReg("e2",1, "devon",  "complete", 12500,"nylon_tent",  undefined,"2026-02-21T15:25:00Z",daysAgo(27)),
    mkReg("e2",2, "sage",   "complete", 12500,"self_camping",undefined,"2026-02-21T15:05:00Z",daysAgo(26)),
    mkReg("e2",3, "river",  "complete", 12500,"self_camping",undefined,"2026-02-21T14:55:00Z",daysAgo(25)),
    mkReg("e2",4, "juniper","complete", 12500,"bell_tent",   undefined,"2026-02-21T15:00:00Z",daysAgo(24)),
    mkReg("e2",5, "indigo", "complete", 12500,"nylon_tent",  undefined,"2026-02-21T15:30:00Z",daysAgo(23)),
    mkReg("e2",6, "wren",   "complete", 12500,"self_camping",undefined,"2026-02-21T15:45:00Z",daysAgo(22)),
    mkReg("e2",7, "fern",   "complete", 12500,"self_camping",undefined,"2026-02-21T14:50:00Z",daysAgo(20)),
    mkReg("e2",8, "lark",   "complete", 12500,"bell_tent",   undefined,"2026-02-21T16:00:00Z",daysAgo(18)),
    mkReg("e2",9, "willow", "complete", 12500,"bell_tent",   undefined,"2026-02-21T15:15:00Z",daysAgo(17)),
    mkReg("e2",10,"aspen",  "expired",      0,"bell_tent",   undefined, null,                  daysAgo(15)),
    mkReg("e2",11,"sol",    "pending_payment",0,"nylon_tent",undefined, null,                  daysAgo(4)),
  ],

  // e3: Green Burial 101 (Zoom) — free, 8 registrations
  e3: [
    mkReg("e3",0,"river", "complete",       0,"none",undefined,null,daysAgo(18)),
    mkReg("e3",1,"sage",  "complete",       0,"none",undefined,null,daysAgo(16)),
    mkReg("e3",2,"lark",  "complete",       0,"none",undefined,null,daysAgo(14)),
    mkReg("e3",3,"sol",   "complete",       0,"none",undefined,null,daysAgo(13)),
    mkReg("e3",4,"sky",   "complete",       0,"none",undefined,null,daysAgo(11)),
    mkReg("e3",5,"rowan", "complete",       0,"none",undefined,null,daysAgo(10)),
    mkReg("e3",6,"cedar", "complete",       0,"none",undefined,null,daysAgo(8)),
    mkReg("e3",7,"wren",  "pending_payment",0,"none",undefined,null,daysAgo(4)),
  ],

  // e4: March Community Weekend — primary demo event, 15 registrations
  // 11 complete (5 checked in), 3 pending, 1 expired
  // Accommodation: bell_tent(4), nylon_tent(3), self_camping(3), none(1 day-visitor) — 11 complete total
  // Dietary: everyone has a value (form is required)
  e4: [
    mkReg("e4",0, "mara",   "complete",        5000,"bell_tent",   "Vegetarian",  "2026-03-06T16:45:00Z", daysAgo(14)),
    mkReg("e4",1, "devon",  "complete",        5000,"nylon_tent",  "Vegan",        null,                   daysAgo(13)),
    mkReg("e4",2, "sage",   "complete",        5000,"self_camping","Gluten-Free",  null,                   daysAgo(12)),
    mkReg("e4",3, "river",  "complete",        5000,"self_camping", undefined,     "2026-03-06T18:00:00Z", daysAgo(11)),
    mkReg("e4",4, "juniper","complete",        5000,"bell_tent",   "Vegetarian",   null,                   daysAgo(10)),
    mkReg("e4",5, "aspen",  "expired",            0,"nylon_tent",   undefined,      null,                  daysAgo(9)),
    mkReg("e4",6, "indigo", "complete",        5000,"nylon_tent",  "Vegetarian",  "2026-03-06T18:42:00Z", daysAgo(8)),
    mkReg("e4",7, "wren",   "pending_payment",    0,"self_camping","Vegan",         null,                  daysAgo(7)),
    mkReg("e4",8, "cedar",  "pending_payment",    0,"nylon_tent",  "Gluten-Free",   null,                  daysAgo(6)),
    mkReg("e4",9, "fern",   "complete",        5000,"self_camping", undefined,     "2026-03-06T19:03:00Z", daysAgo(5)),
    mkReg("e4",10,"sol",    "complete",        5000,"bell_tent",    undefined,      null,                  daysAgo(4)),
    mkReg("e4",11,"lark",   "complete",        5000,"bell_tent",    undefined,     "2026-03-06T19:22:00Z", daysAgo(3)),
    { ...mkReg("e4",12,"willow", "complete",        5000,"none",        "Vegan",         null,                  daysAgo(2)), notes: "[CANCEL REQUEST] Schedule conflict — requested via email 2026-02-25" },
    mkReg("e4",13,"rowan",  "pending_payment",    0,"nylon_tent",  "Gluten-Free",   null,                  daysAgo(1)),
    mkReg("e4",14,"sky",    "complete",        5000,"self_camping", undefined,       null,                  daysAgo(0)),
  ],

  // e5: Ram Dass Evenings — donation-based, evening check-ins
  e5: [
    mkReg("e5",0, "mara",   "complete",        4500,"none","Vegetarian",  "2026-03-06T18:45:00Z",daysAgo(12)),
    mkReg("e5",1, "river",  "complete",        6000,"none", null,          "2026-03-06T17:55:00Z",daysAgo(11)),
    mkReg("e5",2, "sage",   "complete",        3000,"none","Gluten-Free", "2026-03-06T19:20:00Z",daysAgo(10)),
    mkReg("e5",3, "devon",  "complete",        4500,"none","Vegan",        null,                  daysAgo(9)),
    mkReg("e5",4, "fern",   "complete",           0,"none", null,          "2026-03-06T19:10:00Z",daysAgo(8)),
    mkReg("e5",5, "indigo", "complete",        5000,"none","Vegetarian",   null,                  daysAgo(7)),
    mkReg("e5",6, "wren",   "pending_payment",    0,"none","Vegan",        null,                  daysAgo(6)),
    mkReg("e5",7, "cedar",  "expired",            0,"none", null,           null,                  daysAgo(5)),
    mkReg("e5",8, "sky",    "complete",        4000,"none", null,          "2026-03-06T19:48:00Z",daysAgo(4)),
    mkReg("e5",9, "lark",   "complete",        3500,"none", null,           null,                  daysAgo(3)),
    mkReg("e5",10,"rowan",  "pending_payment",    0,"none","Gluten-Free",  null,                  daysAgo(2)),
  ],

  // e6: Forest Therapy — $125, small group, morning check-ins
  e6: [
    mkReg("e6",0,"juniper","complete", 12500,"none",        "Vegetarian", "2026-03-08T10:30:00Z",daysAgo(10)),
    mkReg("e6",1,"mara",   "complete", 12500,"none",        "Vegetarian", "2026-03-08T10:45:00Z",daysAgo(9)),
    mkReg("e6",2,"devon",  "complete", 12500,"self_camping","Vegan",       null,                  daysAgo(8)),
    mkReg("e6",3,"river",  "complete", 12500,"none",         null,         "2026-03-08T11:00:00Z",daysAgo(7)),
    mkReg("e6",4,"aspen",  "complete", 12500,"none",         null,          null,                  daysAgo(6)),
    mkReg("e6",5,"willow", "pending_payment",0,"nylon_tent","Vegan",       null,                  daysAgo(5)),
    mkReg("e6",6,"cedar",  "pending_payment",0,"none",      "Gluten-Free", null,                  daysAgo(4)),
    mkReg("e6",7,"sky",    "complete", 12500,"none",         null,          null,                  daysAgo(3)),
    mkReg("e6",8,"sol",    "complete", 12500,"nylon_tent",   null,          null,                  daysAgo(2)),
    mkReg("e6",9,"rowan",  "expired",      0,"none",        "Gluten-Free", null,                  daysAgo(1)),
  ],

  // e7: Loving Awareness Retreat — $250, 15 registrations
  e7: [
    mkReg("e7",0, "mara",   "complete", 25000,"bell_tent",   "Vegetarian", null,daysAgo(42)),
    mkReg("e7",1, "devon",  "complete", 25000,"nylon_tent",  "Vegan",      null,daysAgo(40)),
    mkReg("e7",2, "sage",   "complete", 25000,"self_camping","Gluten-Free",null,daysAgo(38)),
    mkReg("e7",3, "river",  "complete", 25000,"self_camping", undefined,   null,daysAgo(36)),
    mkReg("e7",4, "juniper","complete", 25000,"bell_tent",   "Vegetarian", null,daysAgo(35)),
    mkReg("e7",5, "aspen",  "complete", 25000,"nylon_tent",   undefined,   null,daysAgo(33)),
    mkReg("e7",6, "indigo", "complete", 25000,"bell_tent",   "Vegetarian", null,daysAgo(31)),
    mkReg("e7",7, "fern",   "complete", 25000,"self_camping", undefined,   null,daysAgo(28)),
    mkReg("e7",8, "lark",   "complete", 25000,"bell_tent",    undefined,   null,daysAgo(25)),
    mkReg("e7",9, "willow", "complete", 25000,"bell_tent",   "Vegan",      null,daysAgo(22)),
    mkReg("e7",10,"sol",    "complete", 25000,"nylon_tent",   undefined,   null,daysAgo(20)),
    mkReg("e7",11,"sky",    "complete", 25000,"self_camping", undefined,   null,daysAgo(18)),
    mkReg("e7",12,"wren",   "pending_payment",0,"nylon_tent","Vegan",      null,daysAgo(10)),
    mkReg("e7",13,"cedar",  "pending_payment",0,"nylon_tent","Gluten-Free",null,daysAgo(8)),
    mkReg("e7",14,"rowan",  "pending_payment",0,"self_camping","Gluten-Free",null,daysAgo(5)),
  ],

  // e8: 5-Day Forest Sadhana — $450, premium retreat, 12 registrations
  e8: [
    mkReg("e8",0, "mara",   "complete", 45000,"bell_tent",   "Vegetarian",  null,daysAgo(50)),
    mkReg("e8",1, "devon",  "complete", 45000,"bell_tent",   "Vegan",       null,daysAgo(48)),
    mkReg("e8",2, "river",  "complete", 45000,"self_camping", undefined,    null,daysAgo(45)),
    mkReg("e8",3, "juniper","complete", 45000,"bell_tent",   "Vegetarian",  null,daysAgo(42)),
    mkReg("e8",4, "indigo", "complete", 45000,"nylon_tent",  "Vegetarian",  null,daysAgo(40)),
    mkReg("e8",5, "lark",   "complete", 45000,"bell_tent",    undefined,    null,daysAgo(38)),
    mkReg("e8",6, "willow", "complete", 45000,"bell_tent",   "Vegan",       null,daysAgo(35)),
    mkReg("e8",7, "sol",    "complete", 45000,"nylon_tent",   undefined,    null,daysAgo(33)),
    mkReg("e8",8, "sky",    "complete", 45000,"self_camping", undefined,    null,daysAgo(30)),
    mkReg("e8",9, "wren",   "pending_payment",0,"bell_tent", "Vegan",      null,daysAgo(15)),
    mkReg("e8",10,"cedar",  "pending_payment",0,"nylon_tent","Gluten-Free", null,daysAgo(10)),
    mkReg("e8",11,"rowan",  "expired",      0,"nylon_tent",  "Gluten-Free", null,daysAgo(5)),
  ],

  // e9: Intimacy & Connection Retreat — $275, 15 registrations
  e9: [
    mkReg("e9",0, "mara",   "complete", 27500,"bell_tent",   "Vegetarian",  null,daysAgo(55)),
    mkReg("e9",1, "sage",   "complete", 27500,"self_camping","Gluten-Free", null,daysAgo(52)),
    mkReg("e9",2, "river",  "complete", 27500,"self_camping", undefined,    null,daysAgo(50)),
    mkReg("e9",3, "aspen",  "complete", 27500,"nylon_tent",   undefined,    null,daysAgo(48)),
    mkReg("e9",4, "indigo", "complete", 27500,"bell_tent",   "Vegetarian",  null,daysAgo(45)),
    mkReg("e9",5, "fern",   "complete", 27500,"self_camping", undefined,    null,daysAgo(42)),
    mkReg("e9",6, "lark",   "complete", 27500,"bell_tent",    undefined,    null,daysAgo(40)),
    mkReg("e9",7, "willow", "complete", 27500,"bell_tent",   "Vegan",       null,daysAgo(38)),
    mkReg("e9",8, "sol",    "complete", 27500,"nylon_tent",   undefined,    null,daysAgo(35)),
    mkReg("e9",9, "sky",    "complete", 27500,"self_camping", undefined,    null,daysAgo(32)),
    mkReg("e9",10,"wren",   "pending_payment",0,"bell_tent", "Vegan",      null,daysAgo(20)),
    mkReg("e9",11,"cedar",  "pending_payment",0,"nylon_tent","Gluten-Free", null,daysAgo(15)),
    mkReg("e9",12,"rowan",  "pending_payment",0,"nylon_tent","Gluten-Free", null,daysAgo(10)),
    mkReg("e9",13,"devon",  "expired",      0,"nylon_tent",  "Vegan",       null,daysAgo(5)),
    mkReg("e9",14,"juniper","expired",      0,"bell_tent",   "Vegetarian",  null,daysAgo(3)),
  ],
};

// ── Exported Functions ────────────────────────────────────────────────────────

export const DEMO_REGISTRATIONS = (eventId: string) => {
  const regs = REG_DATA[eventId] ?? [];
  const ev = DEMO_EVENTS.find(e => e.id === eventId) ?? DEMO_EVENTS[3];
  return {
    data: regs,
    meta: { total: regs.length, page: 1, per_page: 50 },
    event: ev,
  };
};

export const DEMO_DASHBOARD = (eventId: string) => {
  const ev = DEMO_EVENTS.find(e => e.id === eventId) ?? DEMO_EVENTS[3];
  const regs = REG_DATA[eventId] ?? [];

  const status_breakdown = { complete: 0, pending_payment: 0, expired: 0, cancelled: 0, refunded: 0 };
  const acc_map: Record<string, number> = { bell_tent: 0, nylon_tent: 0, self_camping: 0, none: 0 };
  const dietary: Record<string, number> = {};
  let revenue = 0;
  let paid_count = 0;

  for (const r of regs) {
    status_breakdown[r.status as keyof typeof status_breakdown] = (status_breakdown[r.status as keyof typeof status_breakdown] ?? 0) + 1;
    if (r.status === "complete") {
      const a = r.accommodation_type;
      if (a in acc_map) acc_map[a]++;
      revenue += r.payment_amount_cents;
      if (r.payment_amount_cents > 0) paid_count++;
    }
    // Only count dietary for confirmed attendees (matches backend behavior)
    if (r.status === "complete") {
      const dk = r.dietary_restrictions ?? "None";
      dietary[dk] = (dietary[dk] ?? 0) + 1;
    }
  }

  return {
    event_id: ev.id,
    event_name: ev.name,
    total_registrations: regs.length,
    status_breakdown,
    accommodation_breakdown: acc_map,
    dietary_summary: dietary,
    total_revenue_cents: revenue,
    average_payment_cents: paid_count > 0 ? Math.round(revenue / paid_count) : 0,
    spots_remaining: (ev as any).capacity ?? 30 - regs.length,
  };
};

export const DEMO_AUDIT_LOG = (eventId: string) => {
  const regs = (REG_DATA[eventId] ?? []).slice(0, 6);
  const actors = ["brian@justloveforest.com", "naveed@justloveforest.com", "system"];
  const actions = [
    { action: "create",        label: "Registration created",      entity: "registration" },
    { action: "check_in",      label: "Checked in",                entity: "registration" },
    { action: "update_status", label: "Status updated to complete",entity: "registration" },
    { action: "undo_check_in", label: "Check-in undone",           entity: "registration" },
    { action: "update",        label: "Event details updated",     entity: "event" },
    { action: "create",        label: "Manual registration added", entity: "registration" },
  ];
  return regs.map((r, i) => ({
    id: `audit-${eventId}-${i}`,
    entity_type: actions[i].entity,
    entity_id: actions[i].entity === "event" ? eventId : r.id,
    action: actions[i].action,
    actor: actors[i % 3],
    old_value: actions[i].action === "update_status" ? { status: "pending_payment" } : null,
    new_value: actions[i].action === "update_status" ? { status: "complete" } :
               actions[i].action === "check_in" ? { checked_in_at: r.checked_in_at, checked_in_by: r.checked_in_by } : null,
    timestamp: new Date(Date.now() - i * 7200000).toISOString(),
    registration_name: r.attendee_name,
  }));
};

export const DEMO_COCREATORS = [
  { id: "c1", name: "Sitaram Dass",          email: "sitaram@sacredcommunityproject.org", events: ["Loving Awareness Retreat w/ Sitaram Dass", "5-Day Forest Sadhana w/ Sitaram Dass"], last_active: "2026-02-16" },
  { id: "c2", name: "Christina Della Iacono",email: "christina@justloveforest.com",       events: ["Intimacy & Connection Retreat"],                                                    last_active: "2026-02-10" },
  { id: "c3", name: "Naveed N.",             email: "naveed@justloveforest.com",           events: ["March Community Weekend", "March Forest Therapy — Shinrin Yoku"],                  last_active: "2026-02-17" },
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
