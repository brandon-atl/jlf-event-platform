# JLF ERP — Database Schema (PRD v4 — Post 02-25-26 Meeting)

> **Changelog (v4):** Added form_templates, event_form_links, sub_events, registration_sub_events,
> expenses, event_settlements, sms_conversations, memberships, scholarship_links, operating_expenses.
> Modified events (recurring + composite + location), registrations (payment_method, group_id, ETA,
> cash_pending status), attendees (membership, notes), co_creators (phone, venmo), event_co_creators
> (split_percentage, expenses), notifications_log (direction, threading).
> Removed pending_payment timer/escalation logic from registrations.

## events
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique event identifier |
| name | VARCHAR(255) | Event display name |
| slug | VARCHAR(100) UNIQUE | URL-friendly identifier for registration page |
| description | TEXT | Event description (markdown supported) |
| event_date | TIMESTAMPTZ | Event start date/time |
| event_end_date | TIMESTAMPTZ (nullable) | End date for multi-day retreats |
| event_type | VARCHAR(50) | Category: retreat, community_weekend, ashram, forest_therapy, hermitage, etc. |
| pricing_model | ENUM(fixed, donation, free, composite) | Fixed-price, pay-what-you-want, free, or composite (sub-events have own pricing) |
| fixed_price_cents | INTEGER (nullable) | Price in cents for fixed-price events |
| min_donation_cents | INTEGER (nullable) | Minimum donation for pay-what-you-want events |
| stripe_price_id | VARCHAR(100) (nullable) | Stripe Price or Product ID for Checkout |
| capacity | INTEGER (nullable) | Max attendees (null = unlimited) |
| meeting_point_a | TEXT | Meeting point A details |
| meeting_point_b | TEXT | Meeting point B details |
| location_text | TEXT (nullable) | **NEW v4** — Human-readable location or directions. Included in reminders/confirmation. |
| zoom_link | VARCHAR(500) (nullable) | **NEW v4** — Zoom/virtual meeting link for hybrid events |
| is_recurring | BOOLEAN (default: false) | **NEW v4** — Whether this event recurs on a schedule |
| recurrence_rule | VARCHAR(255) (nullable) | **NEW v4** — iCal RRULE string or simple pattern (e.g., "FREQ=WEEKLY;BYDAY=TU") |
| parent_event_id | UUID FK → events (nullable) | **NEW v4** — Self-ref for composite events. If set, this event is a sub-component of parent. Deprecated in favor of sub_events table — kept for backward compat only. |
| allow_cash_payment | BOOLEAN (default: false) | **NEW v4** — Whether "I'll pay in person" toggle is available on registration form |
| max_member_discount_slots | INTEGER (default: 3) | **NEW v4** — Max members who can use membership discount per event. First-signup-first-serve. |
| day_of_sms_time | TIME (nullable) | When to send day-of logistics SMS |
| registration_fields | JSONB | Legacy configurable form fields per event. **Replaced by form_templates in v4** — kept for backward compat with existing events. New events use form_templates. |
| notification_templates | JSONB | Per-event email/SMS templates. Keys: confirmation_message, reminder, day_of, post_event, cancellation_request. |
| status | ENUM(draft, active, completed, cancelled) | Event lifecycle |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

**Removed columns (v4):**
- `reminder_delay_minutes` — Pending payment reminders eliminated (D1). Reminders are now event-based (1 week, 1 day before), not payment-chase-based.
- `auto_expire_hours` — No more auto-expiry of pending payments (D1).

## form_templates *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Template identifier |
| name | VARCHAR(255) | Admin-facing name (e.g., "Dietary & Allergy Info") |
| description | TEXT (nullable) | What this form collects |
| form_type | ENUM(intake, waiver, accommodation, dietary, travel, logistics, health, legal, custom) | Template category for organization |
| fields | JSONB | Ordered array of field objects: `[{id, type, label, options, required, placeholder, help_text}]`. Types: text, textarea, dropdown, checkbox, multi_select, radio, date, number |
| is_default | BOOLEAN (default: false) | Whether this form is auto-attached to new events |
| created_by | UUID FK → users (nullable) | Who created the template |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## event_form_links *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Link identifier |
| event_id | UUID FK → events | Which event |
| form_template_id | UUID FK → form_templates | Which form |
| is_waiver | BOOLEAN (default: false) | If true, requires explicit acceptance (checkbox + timestamp) |
| sort_order | INTEGER (default: 0) | Display order in registration flow |
| UNIQUE(event_id, form_template_id) | | No duplicate links |

## sub_events *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Sub-event identifier |
| parent_event_id | UUID FK → events (NOT NULL) | The composite parent event |
| name | VARCHAR(255) | Sub-event name (e.g., "Friday Night Gathering") |
| description | TEXT (nullable) | Sub-event description |
| pricing_model | ENUM(fixed, donation, free) | This sub-event's pricing |
| fixed_price_cents | INTEGER (nullable) | Price in cents if fixed |
| min_donation_cents | INTEGER (nullable) | Minimum if donation-based |
| stripe_price_id | VARCHAR(100) (nullable) | Stripe Price ID for this sub-event |
| capacity | INTEGER (nullable) | Sub-event-specific capacity (null = uses parent) |
| sort_order | INTEGER (default: 0) | Display order in registration |
| is_required | BOOLEAN (default: false) | If true, all registrants must include this sub-event |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## attendees
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique attendee identifier |
| email | VARCHAR(255) UNIQUE | Primary identifier |
| first_name | VARCHAR(100) | From registration form (NOT from Stripe billing — see ADR-012) |
| last_name | VARCHAR(100) | From registration form |
| phone | VARCHAR(20) (nullable) | For SMS notifications |
| is_member | BOOLEAN (default: false) | **NEW v4** — JLF membership flag |
| membership_id | UUID FK → memberships (nullable) | **NEW v4** — Active membership record |
| admin_notes | TEXT (nullable) | **NEW v4** — Admin/co-creator notes about this attendee |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## registrations
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record identifier |
| attendee_id | UUID FK → attendees | Attendee reference |
| event_id | UUID FK → events | Event reference (UNIQUE with attendee_id) |
| status | ENUM(pending_payment, cash_pending, complete, expired, cancelled, refunded) | Registration lifecycle. **v4:** Added `cash_pending`. `pending_payment` is now transient only (seconds during Stripe redirect, not days). |
| payment_method | ENUM(stripe, cash, scholarship, free) (default: stripe) | **NEW v4** — How this registration was/will be paid |
| payment_amount_cents | INTEGER (nullable) | Actual amount paid |
| stripe_checkout_session_id | VARCHAR(255) (nullable) | Stripe Checkout Session identifier |
| stripe_payment_intent_id | VARCHAR(255) (nullable) | Stripe Payment Intent (idempotency key) |
| group_id | UUID (nullable) | **NEW v4** — Links multi-guest registrations from same payer |
| accommodation_type | ENUM(bell_tent, tipi_twin, self_camping, day_only, none) | **v4:** Renamed nylon_tent→tipi_twin, removed yurt_shared, added day_only |
| dietary_restrictions | TEXT (nullable) | Promoted from intake data |
| intake_data | JSONB | Full intake form responses (flexible per event) |
| waiver_accepted_at | TIMESTAMPTZ (nullable) | When attendee accepted waiver/terms |
| estimated_arrival | TIMESTAMPTZ (nullable) | **NEW v4** — ETA from SMS reply (N7) |
| source | ENUM(registration_form, manual, walk_in, group) | How the record was created. **v4:** Added `group` source. |
| notes | TEXT (nullable) | Operator notes (manual overrides, etc.) |
| checked_in_at | TIMESTAMPTZ (nullable) | Day-of check-in timestamp (from PR #13) |
| checked_in_by | VARCHAR(100) (nullable) | Who checked them in (from PR #13) |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

**Removed columns (v4):**
- `reminder_sent_at` — Payment-chase reminders eliminated. Event reminders are managed via notifications_log.
- `escalation_sent_at` — No escalation flow for pending payments.

## registration_sub_events *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record identifier |
| registration_id | UUID FK → registrations | Which registration |
| sub_event_id | UUID FK → sub_events | Which sub-event selected |
| payment_amount_cents | INTEGER (nullable) | Amount paid for this sub-event specifically |
| UNIQUE(registration_id, sub_event_id) | | No duplicates |

## co_creators
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Display name |
| email | VARCHAR(255) UNIQUE | Login / magic link target |
| phone | VARCHAR(20) (nullable) | **NEW v4** — For SMS and contact |
| venmo_handle | VARCHAR(100) (nullable) | **NEW v4** — Payout instructions |
| auth_token_hash | VARCHAR(255) (nullable) | Hashed magic link token |
| token_expires_at | TIMESTAMPTZ (nullable) | Magic link expiry |
| created_at | TIMESTAMPTZ | Audit timestamp |

## event_co_creators (Junction)
| Column | Type | Description |
|---|---|---|
| event_id | UUID FK → events | Event reference |
| co_creator_id | UUID FK → co_creators | Co-creator reference |
| can_see_amounts | BOOLEAN (default: false) | Whether co-creator sees payment amounts |
| split_percentage | DECIMAL(5,2) (nullable) | **NEW v4** — Co-creator's profit split percentage |
| can_upload_expenses | BOOLEAN (default: true) | **NEW v4** — Whether co-creator can upload expenses for this event |

## expenses *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Expense identifier |
| event_id | UUID FK → events | Which event this expense belongs to |
| submitted_by | UUID FK → users or co_creators | Who submitted (polymorphic via actor_type) |
| actor_type | ENUM(admin, co_creator) | Who submitted it |
| description | VARCHAR(500) | What the expense was |
| amount_cents | INTEGER | Amount in cents |
| category | ENUM(groceries, supplies, replenishables, cacao, venue, transportation, other) | Expense category |
| receipt_image_url | VARCHAR(500) (nullable) | URL to uploaded receipt image |
| notes | TEXT (nullable) | Additional context |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## event_settlements *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Settlement identifier |
| event_id | UUID FK → events | Which event |
| version | INTEGER (default: 1) | Increments on recalculation |
| gross_revenue_cents | INTEGER | Total collected from registrations |
| stripe_fees_cents | INTEGER | Total Stripe processing fees |
| total_expenses_cents | INTEGER | Sum of all expenses |
| net_cents | INTEGER | gross - fees - expenses |
| split_config | JSONB | Array of `[{co_creator_id, name, percentage, payout_cents}]` |
| calculated_at | TIMESTAMPTZ | When this version was computed |
| calculated_by | UUID FK → users | Who triggered the calculation |
| notes | TEXT (nullable) | What changed in this version |

## sms_conversations *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Message identifier |
| registration_id | UUID FK → registrations (nullable) | Linked registration (if identifiable) |
| attendee_phone | VARCHAR(20) | Phone number |
| direction | ENUM(inbound, outbound) | Message direction |
| body | TEXT | Message content |
| twilio_sid | VARCHAR(100) (nullable) | Twilio message SID |
| sent_by | UUID FK → users (nullable) | Admin who sent (for outbound manual replies) |
| created_at | TIMESTAMPTZ | Audit timestamp |

## memberships *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Membership identifier |
| attendee_id | UUID FK → attendees | Member |
| tier | VARCHAR(50) (default: 'standard') | Membership tier (single-tier for now) |
| discount_type | ENUM(flat) (default: flat) | How discount is applied. **Confirmed: $25 flat off per event.** |
| discount_value_cents | INTEGER (default: 2500) | **Confirmed: 2500 cents = $25 off** |
| started_at | TIMESTAMPTZ | When membership started |
| expires_at | TIMESTAMPTZ (nullable) | When membership expires (null = no expiry) |
| is_active | BOOLEAN (default: true) | Current status |
| created_at | TIMESTAMPTZ | Audit timestamp |

## scholarship_links *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Link identifier |
| event_id | UUID FK → events | Which event |
| attendee_id | UUID FK → attendees (nullable) | If locked to specific attendee |
| code | VARCHAR(50) UNIQUE | URL-safe code for the link |
| scholarship_price_cents | INTEGER (default: 3000) | **Confirmed: $30 flat scholarship price** (Brian's discretion) |
| stripe_coupon_id | VARCHAR(100) (nullable) | Stripe coupon if pre-created |
| max_uses | INTEGER (default: 1) | How many times link can be used |
| uses | INTEGER (default: 0) | Current usage count |
| created_by | UUID FK → users | Admin who created |
| created_at | TIMESTAMPTZ | Audit timestamp |

## operating_expenses *(NEW v4)*
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Expense identifier |
| submitted_by | UUID FK → users | Who submitted |
| description | VARCHAR(500) | What the expense was |
| amount_cents | INTEGER | Amount in cents |
| category | ENUM(propane, water, maintenance, forest_fund, supplies, other) | Expense category |
| receipt_image_url | VARCHAR(500) (nullable) | URL to receipt image |
| notes | TEXT (nullable) | Additional context |
| expense_date | DATE | When the expense occurred |
| reimbursed | BOOLEAN (default: false) | Whether this has been reimbursed |
| reimbursed_at | TIMESTAMPTZ (nullable) | When reimbursed |
| created_at | TIMESTAMPTZ | Audit timestamp |

## notifications_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| registration_id | UUID FK → registrations (nullable) | Which registration triggered this (nullable for broadcast) |
| channel | ENUM(email, sms) | Delivery channel |
| direction | ENUM(outbound, inbound) | **NEW v4** — Message direction (inbound for SMS replies) |
| template_id | VARCHAR(100) (nullable) | Which template was used (nullable for manual sends / inbound) |
| content_hash | VARCHAR(64) (nullable) | SHA-256 of sent content |
| reply_to_id | UUID FK → notifications_log (nullable) | **NEW v4** — Self-ref for threading |
| sent_at | TIMESTAMPTZ | When sent/received |
| status | ENUM(sent, failed, bounced, received) | Delivery status. **v4:** Added `received` for inbound. |

## webhooks_raw
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record ID |
| source | ENUM(stripe, twilio) | **NEW v4** — Which service sent the webhook |
| stripe_event_id | VARCHAR(255) (nullable, UNIQUE when not null) | Stripe event ID (idempotency) |
| twilio_sid | VARCHAR(255) (nullable) | **NEW v4** — Twilio message SID for inbound SMS |
| event_type | VARCHAR(100) | Event type (e.g., checkout.session.completed, sms.inbound) |
| payload_json | JSONB | Raw webhook payload (PCI-safe metadata only) |
| processed_at | TIMESTAMPTZ (nullable) | When processed |
| created_at | TIMESTAMPTZ | When received |

## audit_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| entity_type | VARCHAR(50) | e.g., "registration", "event", "expense", "settlement" |
| entity_id | UUID | ID of affected record |
| action | VARCHAR(50) | e.g., "status_change", "manual_override", "settlement_recalc" |
| actor | VARCHAR(100) | Who performed action (user email or "system") |
| old_value | JSONB (nullable) | Previous state |
| new_value | JSONB (nullable) | New state |
| timestamp | TIMESTAMPTZ | When it happened |

## users (Operator/Admin accounts)
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | User ID |
| email | VARCHAR(255) UNIQUE | Login email |
| name | VARCHAR(100) | Display name |
| role | ENUM(admin, operator) | Permission level |
| password_hash | VARCHAR(255) | bcrypt hash |
| created_at | TIMESTAMPTZ | Audit timestamp |

---

## Indexes (Performance)

| Table | Index | Type |
|---|---|---|
| registrations | (event_id, status) | Composite — dashboard headcount queries |
| registrations | (attendee_id, event_id) | Unique — prevent duplicate registrations |
| registrations | (group_id) | B-tree — multi-guest lookup |
| registrations | (status) WHERE status = 'cash_pending' | Partial — cash payment tracking |
| sub_events | (parent_event_id) | B-tree — composite event lookup |
| registration_sub_events | (registration_id) | B-tree — sub-event selection lookup |
| expenses | (event_id) | B-tree — per-event expense listing |
| sms_conversations | (attendee_phone, created_at DESC) | Composite — conversation threading |
| form_templates | (form_type) | B-tree — template filtering |
| event_form_links | (event_id, sort_order) | Composite — ordered form retrieval |
| scholarship_links | (code) | Unique — link lookup |
| memberships | (attendee_id) WHERE is_active = true | Partial — active member lookup |

## Enum Reference

### Registration Status Flow (v4)
```
[New Registration]
    │
    ├─ payment_method=stripe ──▶ PENDING_PAYMENT ──▶ (Stripe webhook) ──▶ COMPLETE
    │                                │                                       │
    │                                └─ (session expires) ──▶ EXPIRED        ├──▶ CANCELLED
    │                                                                        └──▶ REFUNDED
    ├─ payment_method=cash ────▶ CASH_PENDING ──▶ (operator marks paid) ──▶ COMPLETE
    │
    ├─ payment_method=free ────▶ COMPLETE (immediate)
    │
    └─ payment_method=scholarship ──▶ PENDING_PAYMENT ──▶ (discounted Stripe) ──▶ COMPLETE
```

### Accommodation Types (v4)
`bell_tent` | `tipi_twin` | `self_camping` | `day_only` | `none`

### Pricing Models (v4)
`fixed` | `donation` | `free` | `composite` (parent event with sub-events)
