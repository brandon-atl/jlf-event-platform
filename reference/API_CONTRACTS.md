# JLF ERP — API Contracts (PRD v3 — Single-System Architecture)

## Base URL
- Local dev: `http://localhost:8000/api/v1`
- Production: `https://api.justloveforest.com/api/v1` (or Railway URL)

## Authentication
- **Operators/Admins:** JWT Bearer token (login with email/password)
- **Co-Creators:** Magic link → JWT token (scoped to assigned events)
- **Public endpoints:** Registration form submission, Stripe webhooks (verified by signature)

---

## Public Endpoints (No Auth)

### POST /register/{event_slug}
Create a new registration and get Stripe Checkout URL.

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone": "+14045551234",
  "accommodation_type": "bell_tent",
  "dietary_restrictions": "vegan, no nuts",
  "waiver_accepted": true,
  "intake_data": {
    "questions_for_team": "Is there parking near the yurt?",
    "how_did_you_hear": "Instagram"
  }
}
```

**Response (201):**
```json
{
  "registration_id": "uuid",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx",
  "status": "pending_payment"
}
```

**Error (409 — duplicate):**
```json
{
  "detail": "You are already registered for this event. Check your email for confirmation."
}
```

### GET /register/{event_slug}/info
Get event details for the registration form (public, no auth).

**Response:**
```json
{
  "event": {
    "name": "Emerging from Winter",
    "slug": "emerging-from-winter",
    "event_date": "2026-02-21T13:00:00-05:00",
    "event_end_date": "2026-02-22T11:30:00-05:00",
    "event_type": "retreat",
    "pricing_model": "fixed",
    "fixed_price_cents": 25000,
    "capacity": 20,
    "spots_remaining": 12,
    "registration_fields": {
      "accommodation_options": ["yurt_shared"],
      "custom_questions": [
        {"id": "questions_for_team", "label": "Questions for our team?", "type": "textarea", "required": false},
        {"id": "how_did_you_hear", "label": "How did you hear about us?", "type": "text", "required": false}
      ]
    }
  }
}
```

### GET /register/{event_slug}/success?session_id={cs_xxx}
Registration success page data.

### GET /register/{event_slug}/cancelled
Registration cancelled/abandoned page data.

---

## Stripe Webhook

### POST /webhooks/stripe
Stripe sends webhooks here. Verified via `stripe.Webhook.construct_event()`.

**Events handled:**
- `checkout.session.completed` → Update registration to COMPLETE, send confirmation email
- `checkout.session.expired` → Update registration to EXPIRED
- `charge.refunded` → Update registration to REFUNDED

**Security:** HMAC signature verification. Reject unverified with 400.

**Idempotency:** All handlers check `webhooks_raw.stripe_event_id` before processing. Safe to replay.

---

## Authenticated Endpoints (JWT Required)

### Auth
- `POST /auth/login` — Email/password → JWT token
- `POST /auth/magic-link` — Send magic link to co-creator email
- `GET /auth/verify?token={token}` — Verify magic link → JWT token
- `GET /auth/me` — Current user info

### Events (Admin/Operator)
- `GET /events` — List all events (filterable by status, date range)
- `POST /events` — Create new event
- `GET /events/{id}` — Get event details with stats (headcount, revenue, accommodation breakdown)
- `PUT /events/{id}` — Update event
- `DELETE /events/{id}` — Soft-delete (set status=cancelled)

### Registrations (Admin/Operator)
- `GET /events/{event_id}/registrations` — List registrations (filterable by status, searchable by name/email)
- `GET /registrations/{id}` — Get single registration detail
- `PUT /registrations/{id}` — Update registration (accommodation change, notes, manual status override)
- `POST /events/{event_id}/registrations/manual` — Create manual registration (walk-in, cash payment, comp)
- `GET /events/{event_id}/registrations/export` — CSV export

### Dashboard (Admin/Operator)
- `GET /dashboard/overview` — Aggregate stats across all active events
- `GET /dashboard/events/{event_id}` — Event-specific dashboard data:
  - Headcount (total, by status)
  - Accommodation breakdown (bell_tent, nylon_tent, self_camping, yurt_shared)
  - Dietary restrictions summary
  - Revenue (total, average, by pricing model)
  - Registration timeline (for charts)

### Co-Creator Portal (Co-Creator JWT)
- `GET /portal/events` — List events assigned to this co-creator
- `GET /portal/events/{event_id}` — Event detail with attendee list (scoped by permissions)

### Notifications (Admin/Operator)
- `POST /events/{event_id}/notifications/sms` — Send day-of SMS to all COMPLETE attendees
- `GET /notifications/log` — View sent notifications

---

## WebSocket (Optional, Phase 2)
- `WS /ws/dashboard` — Real-time dashboard updates when registrations change

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
