# 02-25-26 Meeting Analysis

**Source:** Transcript is ground truth. Requirements Summary, Client Needs, and Summary docs used as cross-references.
**Baseline:** CLAUDE.md + reference/DATA_MODEL.md + reference/API_CONTRACTS.md

---

## Requirements

### New Features (not in current specs)

| # | Description | Priority | Size | Notes |
|---|---|---|---|---|
| N1 | **Custom Form Builder** — Admin UI to create/save/duplicate/delete intake form templates with checkbox, dropdown, text, textarea field types; attach forms to events | P0 | XL | Currently `registration_fields` is JSONB defined by devs. Client needs self-serve form creation. Replaces Acuity's core form builder. Brian: "intake forms are really important for us" |
| N2 | **Composite/Multi-Part Events** — Model Community Weekend as parent event with sub-events (Friday Night, Saturday Day, Saturday Night, Sunday Forest Therapy), each with its own pricing model, headcount, and selectable checkboxes | P0 | XL | Community Weekend is monthly, most complex event. Mixed pricing: Friday/Saturday Day = donation-based, Saturday Night = $50 fixed, Sunday Forest Therapy = $125 fixed. Single consolidated waiver per weekend. Consolidated headcount view per sub-event. |
| N3 | **Recurring Event Date Picker** — For recurring events (Hanuman Tuesdays, Community Weekends), show all upcoming dates for the year; attendee picks specific date | P0 | M | Brian: "they need to be able to pick the date for the upcoming event" — not just next occurrence |
| N4 | **Cash/In-Person Payment Toggle** — "Back door" for registering without online payment; triggers automated reminders | P0 | S | Brian: "I need some sort of back door where they can register without paying." Status would be something like `CASH_PENDING` instead of `PENDING_PAYMENT` |
| N5 | **Multi-Guest Registration** — Select number of guests (couples/families); system generates separate form pages per attendee with individual waiver capture; legal language certifying individual consent | P1 | L | Brian: "I have to email them back… we actually need Brandon to register separately because we need him to submit his waivers." Common pain point. |
| N6 | **Two-Way SMS** — Admin sees inbound replies from attendees in a threaded/inbox view and can respond directly through the platform (not just blast) | P1 | L | Brian: "if they reply back, I want to be able to reply back to them." Requires Twilio inbound webhook + message threading. |
| N7 | **ETA Tracking via SMS** — Day-of text invites attendees to reply with ETA; system parses and displays ETAs in Day-of View | P1 | M | Brian: "the divergent time… if they're going to be late that changes it." Currently tracked via manual notepad. |
| N8 | **Post-Event Financial Module** — Receipt image uploads, itemized expenses, rolling operational costs (e.g. $9/person/retreat for replenishables), Stripe fee deduction, configurable profit splits (50/50, 70/30, etc., 2-6 co-creators), net payout calculator, audit trail | P1 | XL | Currently: receipts via phone texts → manual spreadsheet → manual Venmo. Brian: "the problem statement is… I got to get all the expenses on our side." Navay: "it's a ballbreaker." |
| N9 | **Expense Reconciliation** — Edit/add receipts after initial calculation; full recalculation of splits; versioned history | P1 | M | Navay: "if Sean forgot the cacao receipt… he might actually owe us money" — late receipt changes net split, not just additive |
| N10 | **Scholarship / Special Pricing Links** — Private Stripe product links for reduced-price registrations tied to attendee records; scholarship database | P2 | M | Currently: separate PayPal link sent manually, reconciled by memory. Liz paid $30 for a $250 event via PayPal. Needs to go through Stripe for tax consistency. |
| N11 | **Membership Discounts** — Member flag on attendee; apply flat fee or percentage discount automatically | P2 | M | Community Weekend members pay $50 flat for full weekend. Other events get percentage discount. Exact tier structure TBD. |
| N12 | **Internal Operating Expenses** — Separate expense tracking for non-retreat costs (propane, water, soaps, forest funds); upload receipts; Navay reimburses from forest funds | P2 | M | Navay: "money being exchanged between the two of us… that could look kind of weird." Needs clean separation from event financials. |
| N13 | **Multi-Event Shopping Cart** — Register for multiple instances of a recurring event in a single transaction | P3 | L | Brian: "ideally… register for three events… add them to their cart." Explicitly marked not Day 1. |
| N14 | **Google Calendar / iCal Links** — "Add to Calendar" links on registration confirmation | P3 | S | Noted in transcript, low priority. Brian: "I don't really care about the calendar view." |
| N15 | **Weather API Conditional Messaging** — Pull forecast and conditionally include messaging (e.g., "bring a raincoat") in reminders | P3 | S | Navay mentioned enthusiastically; Brian didn't confirm priority. Ambiguous. |

### Changes to Existing Plans (deltas from CLAUDE.md / reference docs)

| # | Description | Priority | Size | Notes |
|---|---|---|---|---|
| D1 | **Remove `PENDING_PAYMENT` as primary status** — Client confirmed they will not have a "signed up but didn't pay" state under new flow. Replace with: `CASH_PENDING` (for in-person payment toggle) and keep `PENDING_PAYMENT` only as a transient state during Stripe redirect (seconds, not days). Remove reminder/escalation/expiry logic for non-paying registrants. | P0 | S | Brian: "I think we can totally remove all the pending payments." CLAUDE.md currently has full reminder → escalation → auto-expire flow. |
| D2 | **Co-Creator Portal: expand from read-only to interactive** — Add expense upload (receipt images + dollar amounts), notes per attendee, profit split visibility, reconciliation view. Currently portal is scoped as read-only event data. | P1 | L | Transcript is clear: co-creators upload receipts, see their split calculation, can flag missing expenses. |
| D3 | **Registration form captures attendee name independently of billing** — Current schema uses `first_name`/`last_name` from registration. Must ensure Stripe billing name doesn't overwrite attendee name if payer ≠ attendee. | P1 | S | Brandon flagged: "some of the forms aren't capturing… they're extracting the names from billing info" |
| D4 | **Day-of View: add ETA display + late arrival flags** — Existing check-in view needs enhancement to show per-attendee ETA (from SMS replies) and flag divergent arrival times | P1 | M | Brian described manual notepad tracking of late arrivals. ETA data feeds from N7. |
| D5 | **Email templates: add logo/branding** — Current templates are text-based. Need branded HTML emails with JLF logo. | P2 | S | Brian: "I just would like to have the logo on the emails." Logo saved to assets during meeting. |
| D6 | **Cancellation/change flow** — Acuity had change/cancel links in reminder emails that notify admin. System should support self-service cancellation requests that create a notification (not auto-cancel). | P2 | S | Brian: "it doesn't actually do it… it tells me." Just a notification, not auto-processing. |
| D7 | **Printable check-in roster** — Day-of view needs a print-friendly format for clipboard use at the meeting point | P2 | S | Brian: "having the spreadsheet I can print out and be like 'here is everyone who's attending'" |
| D8 | **Accommodation enum update** — Remove `yurt_shared`, rename `nylon_tent` → `tipi_twin` (per PR #15/17). Confirm with client: current options are bell tent, tipi twin, self-camping, none. Add "day only" option for non-overnight events. | P2 | S | Already partially done in PR #17. Needs final confirmation against Acuity options. |

### Data Model & API Changes

#### New Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `form_templates` | id, name, description, fields (JSONB), is_default, created_by, created_at, updated_at | Reusable intake form definitions. `fields` is an ordered array of field objects (type, label, options, required, etc.) |
| `event_form_links` | event_id (FK), form_template_id (FK), is_waiver, sort_order | Junction: which forms are attached to which events. Supports multiple forms per event (intake + waiver). |
| `sub_events` | id, parent_event_id (FK → events), name, pricing_model, fixed_price_cents, min_donation_cents, sort_order, capacity | Child events within a composite (Community Weekend). Each sub-event has its own pricing. |
| `registration_sub_events` | registration_id (FK), sub_event_id (FK), payment_amount_cents | Junction: which sub-events an attendee selected for their registration. |
| `expenses` | id, event_id (FK), submitted_by (FK → co_creators or users), description, amount_cents, category (enum: groceries, supplies, replenishables, cacao, other), receipt_image_url, notes, created_at, updated_at | Per-event expense line items with optional receipt image. |
| `event_settlements` | id, event_id (FK), gross_revenue_cents, stripe_fees_cents, total_expenses_cents, net_cents, split_config (JSONB), calculated_at, version | Snapshot of financial calculation per event. JSONB `split_config` holds [{co_creator_id, percentage, payout_cents}]. Versioned for reconciliation. |
| `sms_conversations` | id, registration_id (FK), attendee_phone, direction (inbound/outbound), body, twilio_sid, created_at | Two-way SMS message log for threading |
| `memberships` | id, attendee_id (FK), tier (enum), started_at, expires_at, is_active | Track member status for discount application |
| `scholarship_links` | id, event_id (FK), attendee_id (FK, nullable), stripe_price_id, discount_cents or discount_percent, code, max_uses, uses, created_at | Private discount links for scholarship pricing |
| `operating_expenses` | id, submitted_by (FK), description, amount_cents, category, receipt_image_url, notes, expense_date, created_at | Non-event expenses (forest funds, maintenance, propane) |

#### Modified Tables

| Table | Change | Reason |
|---|---|---|
| `events` | Add: `is_recurring` BOOLEAN, `recurrence_rule` VARCHAR (iCal RRULE or simple enum), `parent_event_id` UUID FK (nullable, self-ref for composite events) | Support recurring date picker (N3) and composite events (N2) |
| `events` | Add: `location_text` TEXT, `zoom_link` VARCHAR(500) | Reminder emails need location or Zoom link (from Acuity review) |
| `registrations` | Add: `payment_method` ENUM(stripe, cash, scholarship, free), `group_id` UUID (nullable, links multi-guest registrations), `estimated_arrival` TIMESTAMPTZ (nullable) | Cash toggle (N4), multi-guest (N5), ETA tracking (N7) |
| `registrations` | Modify: `status` enum — add `cash_pending`; consider removing `pending_payment` timer logic | D1 |
| `attendees` | Add: `is_member` BOOLEAN, `membership_id` UUID FK (nullable), `admin_notes` TEXT (nullable) | Membership (N11), co-creator/admin notes |
| `co_creators` | Add: `phone` VARCHAR(20), `venmo_handle` VARCHAR(100) | For payout instructions and SMS |
| `event_co_creators` | Add: `split_percentage` DECIMAL, `can_upload_expenses` BOOLEAN (default true) | Profit split config (N8) |
| `notifications_log` | Add: `direction` ENUM(outbound, inbound), `reply_to_id` UUID FK (nullable, self-ref) | Two-way SMS threading (N6) |

#### New API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/v1/form-templates` | Admin | CRUD for form templates (N1) |
| GET | `/api/v1/events/{slug}/recurring-dates` | Public | List all upcoming dates for a recurring event (N3) |
| POST | `/api/v1/register/{slug}/group` | Public | Multi-guest registration: accepts array of attendee intake data (N5) |
| GET/POST | `/api/v1/events/{id}/expenses` | Admin/Co-Creator | List and submit expenses (N8) |
| POST | `/api/v1/events/{id}/expenses/{eid}/receipt` | Admin/Co-Creator | Upload receipt image (N8) |
| GET/POST | `/api/v1/events/{id}/settlement` | Admin | Calculate or retrieve financial settlement (N8) |
| PUT | `/api/v1/events/{id}/settlement/recalculate` | Admin | Reconciliation recalculation (N9) |
| GET/POST | `/api/v1/sms/conversations` | Admin | List/send two-way SMS (N6) |
| POST | `/api/v1/webhooks/twilio/inbound` | Twilio Signature | Receive inbound SMS (N6, N7) |
| GET/POST | `/api/v1/scholarship-links` | Admin | CRUD for scholarship/discount links (N10) |
| GET/POST | `/api/v1/operating-expenses` | Admin | Internal non-event expense tracking (N12) |
| POST | `/api/v1/register/{slug}` | Public | Modify to accept `payment_method: "cash"` for in-person toggle (N4) |

### Integration Changes

| Integration | Change | Priority | Notes |
|---|---|---|---|
| **Stripe** | Support multi-line-item Checkout Sessions for composite events (sub-events as line items); scholarship coupon/price support; handle `payment_method: cash` registrations that skip Checkout | P0 | Currently single-product per checkout. Community Weekend needs Friday ($0-donation) + Saturday Night ($50) + Sunday ($125) as separate line items. |
| **Twilio** | Add inbound SMS webhook handler; message threading/conversation model; parse ETA replies; Twilio Conversations API or basic webhook + DB threading | P1 | Currently outbound-only. Need `POST /webhooks/twilio/inbound` + Twilio number config for incoming. Brian: "I want to be able to reply back to them" |
| **Resend** | Add HTML email template support with logo embedding; branded layout wrapper | P2 | Currently text-only templates. Brian wants logo in all emails. |
| **File Storage** | Add receipt image upload storage (S3/Railway volume/Cloudflare R2) | P1 | Receipt uploads for expenses. Need to pick a storage backend. |
| **WhatsApp** | No direct integration. Post-event SMS blast includes WhatsApp group invite link. | P3 | Explicit decision: SMS with link, not WhatsApp API |
| **Weather API** | Optional: Open-Meteo or wttr.in for conditional reminder content | P3 | Ambiguous priority — see Open Questions |
| **Google Calendar / iCal** | Generate `.ics` file and Google Calendar deep link on registration confirmation | P3 | Low priority per Brian |

### Open Questions (need client decision)

| # | Question | Context | Impact |
|---|---|---|---|
| Q1 | **Weather API: required or nice-to-have?** | Navay was enthusiastic; Brian didn't explicitly confirm. Transcript: "if there's bandwidth" | Determines if it goes in Phase 3 or backlog |
| Q2 | **Multi-event cart: target phase?** | Brian: "if that's complicated, that's not a big deal." Explicitly deferred. When should it be built? | Scope for Phase 2 vs. post-launch |
| Q3 | **Stripe payouts to co-creators: feasible?** | Stripe can't pay non-Stripe users directly. Brandon flagged for research. Stripe Connect requires co-creators to onboard. Is Venmo acceptable long-term? | If Venmo stays, system just calculates + generates instructions. If Stripe Connect, add onboarding flow. |
| Q4 | **Offline check-in capability?** | Forest location likely has poor connectivity ("down here in the sticks"). Not discussed in meeting. | If no signal at meeting point, check-in feature is useless. Consider PWA/service worker or offline cache. |
| Q5 | **How many Acuity form templates need migration?** | Brian said ~6 are used every time + one-offs. Need to audit Acuity to scope form builder MVP. | Determines form builder complexity and testing scope |
| Q6 | **Forest Therapy included in member $50 weekend pricing?** | Navay: "I can't remember… we'll have to check in with him." | Affects member discount logic for Community Weekend |
| Q7 | ~~**Membership tier structure?**~~ **RESOLVED** | **Confirmed post-meeting:** Single tier. $25 flat off per event. Max 3 members per event (first-signup-first-serve). Active members flagged `is_member=true`. | Data model updated. |
| Q8 | ~~**Who approves scholarships?**~~ **RESOLVED** | **Confirmed post-meeting:** Admin (Brian) only. Scholarship = flat $30 event cost. Brian creates link at his discretion. Scholarship attendees flagged in system. | Permissions: admin-only creation. |
| Q9 | **Cancellation policy impact on revenue splits?** | If someone cancels and gets refunded, does that recalculate co-creator payout? | Settlement versioning logic |
| Q10 | **Attendee name vs. billing name: exact handling?** | Brandon flagged billing name overwriting attendee name. Should we always prefer form-submitted name and ignore Stripe billing name? | Registration flow + Stripe webhook handler |
| Q11 | **Post-event WhatsApp group: one per event or reuse?** | Brian has event-specific groups + a master community group. Does SMS blast link to event group or master? | Template variable needed |
| Q12 | **Operating expenses: who has access?** | Navay submits forest expenses for reimbursement. Can other co-creators submit operating expenses too? | Permissions scope |

---

## Implementation Plan

### Phase 1: Custom Forms + Registration Flow Overhaul
**Goal:** Replace Acuity's form system and fix the register-first-then-pay flow.

- [ ] **Form template CRUD** — `form_templates` table + admin UI (create, edit, duplicate, delete templates with field types: text, textarea, dropdown, checkbox, multi-select) — `src/backend/app/models/form_template.py`, `src/backend/app/routers/form_templates.py`, `src/frontend/src/pages/FormBuilder.jsx`
- [ ] **Event ↔ form linking** — `event_form_links` junction table; admin event editor gains "Attach Forms" section — `src/backend/app/models/event_form_link.py`, `src/frontend/src/pages/EventEditor.jsx`
- [ ] **Public registration form renderer** — Dynamic form that reads `form_templates` fields for the event and renders them — `src/frontend/src/pages/Register.jsx`
- [ ] **Cash payment toggle** — "I'll pay in person" option on registration form; creates registration with `status=cash_pending`, `payment_method=cash`; skips Stripe redirect — `src/backend/app/routers/registrations.py`
- [ ] **Remove pending-payment timer logic** — Simplify: `PENDING_PAYMENT` is transient (Stripe redirect in progress); `CASH_PENDING` has no auto-expiry; remove escalation email chain — `src/backend/app/tasks/`
- [ ] **Multi-guest registration** — Guest count selector; generates N form pages; each attendee gets their own `registrations` row linked by `group_id`; legal consent language — `src/frontend/src/pages/Register.jsx`, `src/backend/app/routers/registrations.py`
- [ ] **Waiver per event (not per sub-event)** — Single waiver acceptance for composite events — `src/frontend/src/components/WaiverAccept.jsx`
- [ ] **Alembic migration** — `form_templates`, `event_form_links`, registration schema changes (`payment_method`, `group_id`)

**Demo-able:** Admin creates a form template → attaches to event → public user fills form → pays on Stripe → confirmed. Also: cash toggle, multi-guest flow.

**Blockers:** Acuity admin access (granted in meeting) to audit existing forms for parity check.

---

### Phase 2: Composite Events + Recurring Dates
**Goal:** Model Community Weekend and recurring events correctly.

- [ ] **Sub-events data model** — `sub_events` table, `registration_sub_events` junction — `src/backend/app/models/sub_event.py`
- [ ] **Admin UI: create composite event** — Parent event → add sub-events with individual pricing models — `src/frontend/src/pages/EventEditor.jsx`
- [ ] **Registration flow for composites** — Checkbox selection of sub-events → dynamic price calculation → multi-line-item Stripe Checkout Session — `src/backend/app/services/stripe_service.py`, `src/frontend/src/pages/Register.jsx`
- [ ] **Consolidated headcount dashboard** — Per-sub-event headcount (Friday: 12, Saturday Day: 8, Saturday Night: 15, Sunday: 10) — `src/frontend/src/pages/Dashboard.jsx`
- [ ] **Recurring event model** — `is_recurring` + `recurrence_rule` on events; bulk-generate upcoming dates — `src/backend/app/models/event.py`
- [ ] **Recurring date picker UI** — Public-facing date selector showing all upcoming instances for the year — `src/frontend/src/pages/Register.jsx`
- [ ] **Alembic migration** — `sub_events`, `registration_sub_events`, events recurring columns

**Demo-able:** Create a Community Weekend with 4 sub-events → register and pick sub-events → Stripe checkout with correct total → dashboard shows per-sub-event headcounts. Recurring Hanuman Tuesday shows all upcoming dates.

**Blockers:** Need final pricing confirmation for each Community Weekend sub-event from Brian. Need to resolve Q6 (forest therapy in member pricing).

---

### Phase 3: Communications Enhancement
**Goal:** Two-way SMS, branded emails, ETA tracking.

- [ ] **Twilio inbound webhook** — `POST /webhooks/twilio/inbound`; parse incoming SMS; store in `sms_conversations` — `src/backend/app/routers/webhooks.py`, `src/backend/app/models/sms_conversation.py`
- [ ] **SMS conversation UI** — Admin view: threaded conversations per attendee; send replies — `src/frontend/src/pages/SMSInbox.jsx`
- [ ] **ETA parsing** — Detect time/ETA in inbound SMS; update `registrations.estimated_arrival`; display in Day-of View — `src/backend/app/services/sms_service.py`, `src/frontend/src/pages/DayOfView.jsx`
- [ ] **Branded HTML email templates** — Resend integration with HTML layout, JLF logo, attendee name merge fields, location/Zoom link — `src/backend/app/services/email_service.py`, `src/backend/app/templates/`
- [ ] **Post-event SMS blast** — Bulk SMS with WhatsApp group invite link; uses existing blast infrastructure + new template variable — `src/frontend/src/pages/Communications.jsx`
- [ ] **Printable check-in roster** — Print-friendly CSS layout for Day-of View roster — `src/frontend/src/pages/DayOfView.jsx`
- [ ] **Cancellation request flow** — Self-service cancellation link in reminder emails → creates notification for admin (not auto-cancel) — `src/backend/app/routers/registrations.py`
- [ ] **Alembic migration** — `sms_conversations`, `notifications_log.direction`

**Demo-able:** Send day-of SMS → attendee replies with ETA → admin sees it in inbox → replies → Day-of View shows ETA. Branded HTML reminder email with logo.

**Blockers:** Twilio number must be purchased ($1.15/mo) and configured for inbound. Need Brian's event-specific text message examples for template seeding.

---

### Phase 4: Financial Module
**Goal:** Expense tracking, receipt uploads, profit split calculator, reconciliation.

- [ ] **Expenses CRUD** — `expenses` table; co-creators and admins can add line items with description, amount, category — `src/backend/app/models/expense.py`, `src/backend/app/routers/expenses.py`
- [ ] **Receipt image upload** — File upload endpoint; store on S3/R2/Railway volume; link to expense record — `src/backend/app/services/storage_service.py`
- [ ] **Settlement calculator** — `event_settlements` table; compute: gross revenue (from registrations) – Stripe fees – total expenses = net; apply split percentages; store versioned snapshot — `src/backend/app/services/settlement_service.py`
- [ ] **Co-creator payout view** — Co-creator portal shows: total revenue, all expenses, net, their split percentage, their payout amount, receipt images — `src/frontend/src/pages/CoCreatorPortal.jsx`
- [ ] **Reconciliation** — Add/edit expenses after initial settlement; recalculate; version history with diff — `src/frontend/src/pages/SettlementHistory.jsx`
- [ ] **Scholarship links** — Admin creates private Stripe price/coupon for reduced rate; link tied to event; usage tracking — `src/backend/app/routers/scholarship_links.py`
- [ ] **Membership model** — `memberships` table; member flag on attendee; discount application during registration/checkout — `src/backend/app/models/membership.py`
- [ ] **Operating expenses** — Separate `operating_expenses` table for non-event costs; admin + Navay access — `src/backend/app/routers/operating_expenses.py`
- [ ] **Alembic migration** — `expenses`, `event_settlements`, `scholarship_links`, `memberships`, `operating_expenses`

**Demo-able:** After an event, upload receipts → system calculates settlement → co-creator logs in and sees their payout → admin adds a forgotten receipt → recalculates → delta shown. Scholarship link used during registration → discounted checkout.

**Blockers:** File storage backend decision (S3 vs R2 vs Railway volume). Resolve Q3 (Stripe Connect vs Venmo for payouts). Need example financial summary from Brian (sent during meeting).

---

### Phase 5: Polish, Migration & Decommission
**Goal:** Final features, data migration, SOP, and decommission old tools.

- [ ] **Google Calendar / iCal links** — Generate `.ics` download and Google Calendar URL on confirmation page — `src/frontend/src/pages/RegistrationSuccess.jsx`
- [ ] **Weather API (if confirmed)** — Conditional content in day-of reminders based on forecast — `src/backend/app/services/weather_service.py`
- [ ] **Multi-event cart (if prioritized)** — Shopping cart for multiple recurring event dates in one checkout — `src/frontend/src/pages/Register.jsx`, `src/backend/app/services/stripe_service.py`
- [ ] **Acuity form migration** — Audit all ~6 standard Acuity forms; recreate in form builder; verify field parity — Manual + `form_templates` seed data
- [ ] **Data migration** — Import existing Google Sheets attendee/registration data into new system — `src/backend/scripts/migrate_legacy.py`
- [ ] **SOP documentation** — User guide covering event setup, form creation, registration flow, cash exceptions, messaging, check-in, financial settlement — `docs/SOP.md`
- [ ] **Subscription decommission plan** — Identify when each old tool can be turned off (Acuity first → Zapier → Squarespace Email tier downgrade) — `docs/DECOMMISSION_PLAN.md`
- [ ] **Live event test** — Run one real event end-to-end with Brian using the new system

**Demo-able:** Full end-to-end event lifecycle: create event → attach forms → open registration → attendees register + pay → day-of check-in → post-event settlement → co-creator payout view.

**Blockers:** Brian schedules a live test event. Resend DNS records (Brian). Domain → Vercel migration (Brian). Squarespace link swap (Brian).
