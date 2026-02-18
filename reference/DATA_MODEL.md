# JLF ERP — Database Schema

## events
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique event identifier |
| name | VARCHAR(255) | Event display name |
| event_date | TIMESTAMPTZ | Event start date/time |
| event_end_date | TIMESTAMPTZ (nullable) | End date for multi-day retreats |
| acuity_appointment_type_id | VARCHAR(100) | Acuity appointment type ID |
| stripe_payment_link_id | VARCHAR(100) | Stripe payment link ID |
| pricing_model | ENUM(fixed, donation) | Fixed-price or pay-what-you-want |
| fixed_price_cents | INTEGER (nullable) | Price in cents for fixed-price events |
| meeting_point_a | TEXT | Meeting point A details |
| meeting_point_b | TEXT | Meeting point B details |
| reminder_delay_minutes | INTEGER (default: 60) | Delay before first reminder |
| escalation_delay_hours | INTEGER (default: 24) | Delay before escalation reminder |
| day_of_sms_time | TIME | When to send day-of logistics SMS |
| status | ENUM(draft, active, completed, cancelled) | Event lifecycle |
| notification_templates | JSONB | Per-event email/SMS templates |
| created_at / updated_at | TIMESTAMPTZ | Audit timestamps |

## attendees
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique attendee identifier |
| email | VARCHAR(255) UNIQUE | Primary matching key |
| first_name | VARCHAR(100) | From Acuity or Stripe |
| last_name | VARCHAR(100) | From Acuity or Stripe |
| phone | VARCHAR(20) | For SMS notifications |
| created_at / updated_at | TIMESTAMPTZ | Audit timestamps |

## attendee_events (State Table — core of the system)
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record identifier |
| attendee_id | UUID (FK → attendees) | Attendee reference |
| event_id | UUID (FK → events) | Event reference (UNIQUE with attendee_id) |
| payment_status | ENUM(none, paid, refunded) | Stripe state |
| payment_amount_cents | INTEGER | Actual amount paid |
| stripe_payment_intent_id | VARCHAR(255) | Stripe idempotency key |
| booking_status | ENUM(none, booked, cancelled, no_show) | Acuity state |
| acuity_appointment_id | VARCHAR(255) | Acuity idempotency key |
| overall_status | ENUM(incomplete, paid_only, booked_only, complete, needs_review, cancelled, refunded) | Computed |
| accommodation_type | ENUM(bell_tent, nylon_tent, self_camping, none) | From intake form |
| dietary_restrictions | TEXT | From intake form |
| intake_data | JSONB | Full intake responses (flexible per event) |
| payment_reminder_sent_at | TIMESTAMPTZ (nullable) | When first reminder sent |
| booking_reminder_sent_at | TIMESTAMPTZ (nullable) | When first reminder sent |
| escalation_reminder_sent_at | TIMESTAMPTZ (nullable) | When escalation sent |
| source | ENUM(webhook, manual, walk_in) | How record was created |
| notes | TEXT | Operator notes |
| created_at / updated_at | TIMESTAMPTZ | Audit timestamps |

## co_creators
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Display name |
| email | VARCHAR(255) UNIQUE | Login / magic link target |
| auth_token_hash | VARCHAR(255) | Hashed magic link token |
| created_at | TIMESTAMPTZ | Audit timestamp |

## event_co_creators (Junction)
| Column | Type | Description |
|---|---|---|
| event_id | UUID (FK → events) | Event reference |
| co_creator_id | UUID (FK → co_creators) | Co-creator reference |
| access_level | ENUM(read_only, edit) | Permission level (read_only for MVP) |

## notifications_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| attendee_event_id | UUID (FK → attendee_events) | Which record triggered this |
| channel | ENUM(email, sms) | Delivery channel |
| template_id | VARCHAR(100) | Which template was used |
| content_hash | VARCHAR(64) | SHA-256 of sent content |
| sent_at | TIMESTAMPTZ | When sent |
| status | ENUM(sent, failed, bounced) | Delivery status |

## payments_raw
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record ID |
| stripe_event_id | VARCHAR(255) UNIQUE | Stripe event ID (idempotency) |
| payload_json | JSONB | Raw webhook payload (PCI-safe metadata only) |
| processed_at | TIMESTAMPTZ | When processed |

## bookings_raw
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Record ID |
| acuity_event_id | VARCHAR(255) UNIQUE | Acuity event ID (idempotency) |
| payload_json | JSONB | Raw webhook payload |
| processed_at | TIMESTAMPTZ | When processed |

## audit_log
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Log entry ID |
| entity_type | VARCHAR(50) | e.g., "attendee_event", "event" |
| entity_id | UUID | ID of affected record |
| action | VARCHAR(50) | e.g., "status_change", "manual_override" |
| actor | VARCHAR(100) | Who performed action |
| old_value | JSONB | Previous state |
| new_value | JSONB | New state |
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
