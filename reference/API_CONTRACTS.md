# JLF ERP — API Contracts (PRD v4 — Post 02-25-26 Meeting)

> **Changelog (v4):** Added form template CRUD, sub-event endpoints, composite registration flow,
> multi-guest registration, cash payment toggle, recurring date picker, two-way SMS, expenses/settlement
> CRUD, scholarship links, operating expenses, membership endpoints. Modified registration flow to
> support payment_method enum. Removed pending-payment reminder/escalation endpoints.

## Base URL
- Local dev: `http://localhost:8000/api/v1`
- Production: `https://jlf-event-platform-production.up.railway.app/api/v1`

## Authentication
- **Operators/Admins:** JWT Bearer token (login with email/password)
- **Co-Creators:** Magic link → JWT token (scoped to assigned events + expense upload)
- **Public endpoints:** Registration form submission, Stripe/Twilio webhooks (verified by signature)

---

## Public Endpoints (No Auth)

### POST /register/{event_slug}
Create a new registration and get Stripe Checkout URL (or confirm immediately for free/cash).

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone": "+14045551234",
  "payment_method": "stripe",
  "accommodation_type": "bell_tent",
  "dietary_restrictions": "vegan, no nuts",
  "waiver_accepted": true,
  "intake_data": {
    "form_template_id_1": {"field_id_a": "answer", "field_id_b": true},
    "form_template_id_2": {"field_id_c": "answer"}
  },
  "scholarship_code": null
}
```

**Response (201 — Stripe payment):**
```json
{
  "registration_id": "uuid",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx",
  "status": "pending_payment"
}
```

**Response (201 — Cash payment):**
```json
{
  "registration_id": "uuid",
  "status": "cash_pending",
  "message": "Registration received. Please bring payment to the event."
}
```

**Response (201 — Free event):**
```json
{
  "registration_id": "uuid",
  "status": "complete",
  "message": "You're registered! Check your email for confirmation."
}
```

**Error (409 — duplicate):**
```json
{
  "detail": "You are already registered for this event. Check your email for confirmation.",
  "code": "DUPLICATE_REGISTRATION"
}
```

### POST /register/{event_slug}/group *(NEW v4)*
Multi-guest registration — one payer, multiple attendees.

**Request:**
```json
{
  "payer": {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "+14045551234"
  },
  "guests": [
    {
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "jane@example.com",
      "intake_data": {...},
      "waiver_accepted": true
    },
    {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "intake_data": {...},
      "waiver_accepted": true
    }
  ],
  "payment_method": "stripe",
  "accommodation_type": "bell_tent"
}
```

**Response (201):**
```json
{
  "group_id": "uuid",
  "registrations": [
    {"registration_id": "uuid1", "attendee_name": "Jane Doe"},
    {"registration_id": "uuid2", "attendee_name": "John Doe"}
  ],
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx",
  "status": "pending_payment"
}
```

### GET /register/{event_slug}/info
Get event details for the registration form (public, no auth).

**Response:**
```json
{
  "event": {
    "name": "Loving Awareness Retreat",
    "slug": "loving-awareness-2026",
    "event_date": "2026-03-20T15:00:00-04:00",
    "event_end_date": "2026-03-22T11:30:00-04:00",
    "event_type": "retreat",
    "pricing_model": "fixed",
    "fixed_price_cents": 25000,
    "capacity": 20,
    "spots_remaining": 12,
    "allow_cash_payment": true,
    "location_text": "Directions to Just Love Forest will be sent.",
    "is_recurring": false,
    "sub_events": null,
    "forms": [
      {
        "form_template_id": "uuid",
        "name": "Dietary Considerations",
        "form_type": "dietary",
        "is_waiver": false,
        "sort_order": 1,
        "fields": [
          {"id": "diet_type", "type": "dropdown", "label": "Dietary preference", "options": ["Vegan", "Vegetarian", "Gluten-free", "No restrictions"], "required": true},
          {"id": "allergies", "type": "textarea", "label": "Allergies or food sensitivities", "required": false}
        ]
      },
      {
        "form_template_id": "uuid",
        "name": "Community Well-being Agreement",
        "form_type": "legal",
        "is_waiver": true,
        "sort_order": 2,
        "fields": [...]
      }
    ],
    "accommodation_options": ["bell_tent", "tipi_twin", "self_camping"]
  }
}
```

### GET /register/{event_slug}/info (composite event variant)
When event has `pricing_model: "composite"`, includes sub-events:

```json
{
  "event": {
    "name": "Community Weekend March 2026",
    "pricing_model": "composite",
    "sub_events": [
      {"id": "uuid", "name": "Friday Night Gathering", "pricing_model": "donation", "min_donation_cents": 0, "is_required": false, "sort_order": 1},
      {"id": "uuid", "name": "Saturday Day Program", "pricing_model": "donation", "min_donation_cents": 0, "is_required": false, "sort_order": 2},
      {"id": "uuid", "name": "Saturday Night Stay", "pricing_model": "fixed", "fixed_price_cents": 5000, "is_required": false, "sort_order": 3},
      {"id": "uuid", "name": "Sunday Forest Therapy", "pricing_model": "fixed", "fixed_price_cents": 12500, "is_required": false, "sort_order": 4}
    ],
    "forms": [...]
  }
}
```

### GET /events/{slug}/recurring-dates *(NEW v4)*
List all upcoming dates for a recurring event.

**Response:**
```json
{
  "event_name": "Hanuman Tuesday",
  "recurrence_rule": "FREQ=WEEKLY;BYDAY=TU",
  "dates": [
    {"date": "2026-03-03", "spots_remaining": null, "is_full": false},
    {"date": "2026-03-10", "spots_remaining": null, "is_full": false},
    {"date": "2026-03-24", "spots_remaining": 8, "is_full": false}
  ]
}
```

### GET /register/{event_slug}/success?session_id={cs_xxx}
Registration success page data.

### GET /register/{event_slug}/cancelled
Registration cancelled/abandoned page data.

### POST /register/{event_slug}/cancel-request *(NEW v4)*
Self-service cancellation request. Does NOT auto-cancel — creates admin notification.

**Request:**
```json
{
  "registration_id": "uuid",
  "email": "jane@example.com",
  "reason": "Schedule conflict"
}
```

**Response (200):**
```json
{
  "message": "Your cancellation request has been received. We'll be in touch shortly."
}
```

---

## Webhook Endpoints

### POST /webhooks/stripe
Stripe sends webhooks here. Verified via `stripe.Webhook.construct_event()`.

**Events handled:**
- `checkout.session.completed` → Update registration to COMPLETE, send confirmation email. For composite events, extract line items and populate registration_sub_events.
- `checkout.session.expired` → Update registration to EXPIRED
- `charge.refunded` → Update registration to REFUNDED

**Security:** HMAC signature verification. Reject unverified with 400.
**Idempotency:** All handlers check `webhooks_raw.stripe_event_id` before processing.

### POST /webhooks/twilio/inbound *(NEW v4)*
Receive inbound SMS from attendees. Verified via Twilio request signature.

**Twilio POST body (form-encoded):**
- `From`: Sender phone number
- `Body`: Message text
- `MessageSid`: Twilio message SID
- `To`: Our Twilio number

**Handler logic:**
1. Store raw payload in `webhooks_raw` (source=twilio)
2. Match `From` to `attendees.phone` → find active `registrations`
3. Store in `sms_conversations`
4. If message contains ETA pattern (e.g., "arriving at 3pm", "ETA 2:30", "be there by 4") → parse and update `registrations.estimated_arrival`
5. Create admin notification for inbox view

**Response:** 200 with TwiML (empty `<Response/>`)

---

## Form Template Endpoints *(NEW v4)* (Admin Auth)

### GET /form-templates
List all form templates. Filterable by `form_type`.

### POST /form-templates
Create a new form template.

**Request:**
```json
{
  "name": "Dietary Considerations & Allergies",
  "description": "Collects dietary restrictions and allergy information",
  "form_type": "dietary",
  "fields": [
    {"id": "diet_type", "type": "dropdown", "label": "Dietary preference", "options": ["Vegan", "Vegetarian", "Gluten-free", "No restrictions"], "required": true},
    {"id": "allergies", "type": "textarea", "label": "Allergies or food sensitivities", "required": false, "placeholder": "Please list any food allergies..."}
  ],
  "is_default": false
}
```

### PUT /form-templates/{id}
Update a form template. Changes propagate to future registrations only.

### DELETE /form-templates/{id}
Delete (soft) a form template. Fails if currently linked to active events.

### POST /form-templates/{id}/duplicate
Duplicate a form template with a new name.

---

## Authenticated Endpoints (JWT Required)

### Auth
- `POST /auth/login` — Email/password → JWT token
- `POST /auth/magic-link` — Send magic link to co-creator email
- `GET /auth/verify?token={token}` — Verify magic link → JWT token
- `POST /auth/forgot-password` — Send password reset magic link
- `GET /auth/me` — Current user info

### Events (Admin/Operator)
- `GET /events` — List all events (filterable by status, date range, event_type, is_recurring)
- `POST /events` — Create new event (including sub-events for composite, form template links)
- `GET /events/{id}` — Get event details with stats
- `PUT /events/{id}` — Update event (including sub-events, form links)
- `DELETE /events/{id}` — Soft-delete (set status=cancelled)
- `POST /events/{id}/duplicate` — *(NEW v4)* Duplicate event with all form links and sub-events

### Sub-Events (Admin/Operator) *(NEW v4)*
- `GET /events/{id}/sub-events` — List sub-events for a composite event
- `POST /events/{id}/sub-events` — Add sub-event
- `PUT /events/{id}/sub-events/{sub_id}` — Update sub-event
- `DELETE /events/{id}/sub-events/{sub_id}` — Remove sub-event

### Event Form Links (Admin/Operator) *(NEW v4)*
- `GET /events/{id}/forms` — List form templates attached to event (ordered by sort_order)
- `POST /events/{id}/forms` — Attach form template to event
- `DELETE /events/{id}/forms/{link_id}` — Detach form template

### Registrations (Admin/Operator)
- `GET /events/{event_id}/registrations` — List registrations (filterable by status, payment_method, searchable by name/email). **v4:** Added `payment_method` filter, `group_id` grouping.
- `GET /registrations/{id}` — Get single registration detail (includes sub-event selections for composite events)
- `PUT /registrations/{id}` — Update registration (accommodation, notes, status override, mark cash as paid)
- `POST /events/{event_id}/registrations/manual` — Create manual registration (walk-in, cash, comp)
- `GET /events/{event_id}/registrations/export` — CSV export
- `PUT /registrations/{id}/check-in` — Mark as checked in (from PR #13)
- `PUT /registrations/{id}/mark-paid` — *(NEW v4)* Mark cash_pending registration as paid → COMPLETE

### Dashboard (Admin/Operator)
- `GET /dashboard/overview` — Aggregate stats across all active events
- `GET /dashboard/events/{event_id}` — Event-specific dashboard data:
  - Headcount (total, by status, **by sub-event** for composites)
  - Accommodation breakdown (bell_tent, tipi_twin, self_camping, day_only)
  - Dietary restrictions summary (confirmed-only, per PR #19)
  - Revenue (total, average, by pricing model, **by sub-event**)
  - Registration timeline
  - **Cash pending count** (v4)

### Co-Creator Portal (Co-Creator JWT)
- `GET /portal/events` — List events assigned to this co-creator
- `GET /portal/events/{event_id}` — Event detail with attendee list
- `GET /portal/events/{event_id}/expenses` — *(NEW v4)* View event expenses
- `POST /portal/events/{event_id}/expenses` — *(NEW v4)* Submit expense
- `GET /portal/events/{event_id}/settlement` — *(NEW v4)* View settlement/payout breakdown
- `POST /portal/events/{event_id}/attendees/{id}/notes` — *(NEW v4)* Add notes to attendee

### Expenses (Admin/Co-Creator) *(NEW v4)*
- `GET /events/{id}/expenses` — List all expenses for an event
- `POST /events/{id}/expenses` — Create expense
- `PUT /events/{id}/expenses/{eid}` — Update expense
- `DELETE /events/{id}/expenses/{eid}` — Delete expense (soft delete, audit logged)
- `POST /events/{id}/expenses/{eid}/receipt` — Upload receipt image (multipart/form-data)

### Settlements (Admin) *(NEW v4)*
- `GET /events/{id}/settlement` — Get current settlement calculation
- `POST /events/{id}/settlement` — Calculate/recalculate settlement (creates new version)
- `GET /events/{id}/settlement/history` — List all settlement versions

### Scholarship Links (Admin) *(NEW v4)*
- `GET /scholarship-links` — List all scholarship links (filterable by event_id)
- `POST /scholarship-links` — Create scholarship link
- `DELETE /scholarship-links/{id}` — Deactivate scholarship link

### Memberships (Admin) *(NEW v4)*
- `GET /memberships` — List all memberships
- `POST /memberships` — Create membership for attendee
- `PUT /memberships/{id}` — Update membership
- `DELETE /memberships/{id}` — Deactivate membership

### Operating Expenses (Admin) *(NEW v4)*
- `GET /operating-expenses` — List non-event expenses (filterable by category, date range, reimbursed status)
- `POST /operating-expenses` — Create operating expense
- `PUT /operating-expenses/{id}` — Update
- `POST /operating-expenses/{id}/receipt` — Upload receipt image
- `PUT /operating-expenses/{id}/reimburse` — Mark as reimbursed

### SMS Conversations (Admin) *(NEW v4)*
- `GET /sms/conversations` — List all SMS conversations (grouped by attendee phone, sorted by most recent)
- `GET /sms/conversations/{phone}` — Get threaded conversation with specific attendee
- `POST /sms/conversations/{phone}/reply` — Send SMS reply to attendee

### Notifications (Admin/Operator)
- `POST /events/{event_id}/notifications/sms` — Send day-of or custom SMS to attendees (filterable by status)
- `POST /events/{event_id}/notifications/email` — *(NEW v4)* Send branded email to attendees
- `GET /notifications/log` — View sent/received notifications

---

## WebSocket (Phase 2+)
- `WS /ws/dashboard` — Real-time dashboard updates when registrations change
- `WS /ws/sms` — *(NEW v4)* Real-time inbound SMS notifications for admin inbox

---

## Standard Response Envelope
```json
{
  "data": {},
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 25
  }
}
```

## Error Response
```json
{
  "detail": "Human-readable error message",
  "code": "DUPLICATE_REGISTRATION",
  "field": "email"
}
```

## File Upload Convention *(NEW v4)*
Receipt image uploads use `multipart/form-data`:
- Max size: 10MB
- Accepted types: image/jpeg, image/png, image/webp, application/pdf
- Stored in configured backend (S3, R2, or Railway volume)
- Returns URL in response body
