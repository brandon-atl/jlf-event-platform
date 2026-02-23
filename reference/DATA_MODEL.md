# JLF ERP — Database Schema (PRD v3 — Acuity Removed)

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
| pricing_model | ENUM(fixed, donation, free) | Fixed-price, pay-what-you-want, or free |
| fixed_price_cents | INTEGER (nullable) | Price in cents for fixed-price events |
| min_donation_cents | INTEGER (nullable) | Minimum donation for pay-what-you-want events |
| stripe_price_id | VARCHAR(100) (nullable) | Stripe Price or Product ID for Checkout |
| capacity | INTEGER (nullable) | Max attendees (null = unlimited) |
| meeting_point_a | TEXT | Meeting point A details |
| meeting_point_b | TEXT | Meeting point B details |
| reminder_delay_minutes | INTEGER (default: 60) | Delay before first payment reminder |
| auto_expire_hours | INTEGER (default: 24) | Hours before PENDING_PAYMENT records expire |
| day_of_sms_time | TIME (nullable) | When to send day-of logistics SMS |
| registration_fields | JSONB | Configurable form fields per event |
| notification_templates | JSONB | Per-event email/SMS templates |
| status | ENUM(draft, active, completed, cancelled) | Event lifecycle |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## attendees
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique attendee identifier |
| email | VARCHAR(255) UNIQUE | Primary identifier |
| first_name | VARCHAR(100) | From registration form |
| last_name | VARCHAR(100) | From registration form |
| phone | VARCHAR(20) (nullable) | For SMS notifications |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## registrations (Single source of truth — replaces old attendee_events)
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record identifier |
| attendee_id | UUID (FK → attendees) | Attendee reference |
| event_id | UUID (FK → events) | Event reference (UNIQUE with attendee_id) |
| status | ENUM(pending_payment, complete, expired, cancelled, refunded) | Registration lifecycle state |
| payment_amount_cents | INTEGER (nullable) | Actual amount paid |
| stripe_checkout_session_id | VARCHAR(255) (nullable) | Stripe Checkout Session identifier |
| stripe_payment_intent_id | VARCHAR(255) (nullable) | Stripe Payment Intent (idempotency key) |
| accommodation_type | ENUM(bell_tent, nylon_tent, self_camping, yurt_shared, none) | Promoted from intake data |
| dietary_restrictions | TEXT (nullable) | Promoted from intake data |
| intake_data | JSONB | Full intake form responses (flexible per event) |
| waiver_accepted_at | TIMESTAMPTZ (nullable) | When attendee accepted waiver/terms |
| reminder_sent_at | TIMESTAMPTZ (nullable) | When first reminder was sent |
| escalation_sent_at | TIMESTAMPTZ (nullable) | When escalation reminder was sent |
| source | ENUM(registration_form, manual, walk_in) | How the record was created |
| notes | TEXT (nullable) | Operator notes (manual overrides, etc.) |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

## co_creators
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Display name |
| email | VARCHAR(255) UNIQUE | Login / magic link target |
| auth_token_hash | VARCHAR(255) (nullable) | Hashed magic link token |
| token_expires_at | TIMESTAMPTZ (nullable) | Magic link expiry |
| created_at | TIMESTAMPTZ | Audit timestamp |

## event_co_creators (Junction)
| Column | Type | Description |
|---|---|---|
| event_id | UUID (FK → events) | Event reference |
| co_creator_id | UUID (FK → co_creators) | Co-creator reference |
| can_see_amounts | BOOLEAN (default: false) | Whether co-creator sees payment amounts |

## notifications_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| registration_id | UUID (FK → registrations) | Which registration triggered this |
| channel | ENUM(email, sms) | Delivery channel |
| template_id | VARCHAR(100) | Which template was used |
| content_hash | VARCHAR(64) | SHA-256 of sent content |
| sent_at | TIMESTAMPTZ | When sent |
| status | ENUM(sent, failed, bounced) | Delivery status |

## webhooks_raw
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record ID |
| stripe_event_id | VARCHAR(255) UNIQUE | Stripe event ID (idempotency) |
| event_type | VARCHAR(100) | Stripe event type |
| payload_json | JSONB | Raw webhook payload (PCI-safe metadata only) |
| processed_at | TIMESTAMPTZ (nullable) | When processed |
| created_at | TIMESTAMPTZ | When received |

## audit_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| entity_type | VARCHAR(50) | e.g., "registration", "event" |
| entity_id | UUID | ID of affected record |
| action | VARCHAR(50) | e.g., "status_change", "manual_override" |
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
