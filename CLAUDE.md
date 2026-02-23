# JLF Event Management ERP — Project Instructions

## What This Project Is

A custom Event Management ERP for **Just Love Forest** (justloveforest.com), a 716-acre nature sanctuary in Poetry, GA that runs retreats, community weekends, and nature-based experiences. The system replaces a manual Acuity + Stripe + Google Sheets workflow with a unified platform.

## Architecture (PRD v3 — Single-System)

**The old way:** Acuity for registration, Stripe for payment, manual spreadsheet reconciliation.
**The new way:** Custom registration form → Stripe Checkout → PostgreSQL. One system. Atomic.

### Registration Flow
1. Attendee clicks "Register" on Squarespace event page → redirected to our custom form
2. Form collects intake data (name, email, phone, dietary, accommodation, waiver, event-specific questions)
3. On submit → save to PostgreSQL with status `PENDING_PAYMENT` → redirect to Stripe Checkout
4. Stripe `checkout.session.completed` webhook → mark as `COMPLETE` → send confirmation email
5. If abandoned → auto-reminder email → auto-expire after configurable window

### Registration States
`PENDING_PAYMENT` → `COMPLETE` → (optionally) `CANCELLED` or `REFUNDED`
`PENDING_PAYMENT` → `EXPIRED` (auto, after timeout)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11+ / FastAPI (async) |
| Database | SQLite (local dev) → PostgreSQL (Railway, production) |
| ORM | SQLAlchemy 2.0 (async) + Alembic migrations |
| Frontend (Dashboard) | React (based on existing jlf-erp-final.jsx mockup) |
| Frontend (Registration) | React (separate lightweight app or route) |
| Payment | Stripe Checkout Sessions + Webhooks |
| SMS | Twilio |
| Email | Resend |
| Auth | JWT (operators) + Magic links (co-creators) |
| Task Scheduling | APScheduler |

## Project Structure

```
jlf-erp/
├── CLAUDE.md              # This file
├── README.md              # Project overview
├── reference/             # Architecture docs (READ for context, don't modify)
│   ├── DATA_MODEL.md      # Database schema
│   ├── API_CONTRACTS.md   # API endpoints and request/response formats
│   ├── ARCHITECTURE_DECISIONS.md
│   └── EDGE_CASES.md
├── src/
│   ├── backend/           # FastAPI application
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py           # FastAPI app factory + startup
│   │   │   ├── config.py         # Settings (pydantic-settings)
│   │   │   ├── database.py       # SQLAlchemy engine + session
│   │   │   ├── models/           # SQLAlchemy models
│   │   │   ├── schemas/          # Pydantic request/response schemas
│   │   │   ├── routers/          # API route handlers
│   │   │   ├── services/         # Business logic (stripe, email, sms, auth)
│   │   │   └── tasks/            # Background tasks (reminders, expiry)
│   │   ├── alembic/              # Database migrations
│   │   ├── tests/                # pytest tests
│   │   ├── requirements.txt
│   │   └── .env.example
│   ├── frontend/          # React dashboard + registration form
│   │   ├── src/
│   │   │   ├── components/       # React components
│   │   │   ├── pages/            # Page components
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── lib/              # API client, utils
│   │   │   └── styles/           # CSS/Tailwind
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.js
│   └── shared/            # Shared types/constants (if needed)
├── deploy/                # Docker, Railway config
└── docs/                  # User-facing documentation
```

## Key Design Decisions

1. **No Acuity integration.** Acuity is removed from the booking flow entirely. Don't build any Acuity webhook handlers or API calls.
2. **Stripe Checkout (hosted page), not Stripe Elements.** We redirect to Stripe's hosted payment page using Checkout Sessions.
3. **`client_reference_id`** on the Stripe Checkout Session links back to our registration record ID.
4. **JSONB for flexible intake data.** Different events have different questions. Standard fields (accommodation, dietary) are also promoted to dedicated columns for efficient aggregation.
5. **All webhook handlers must be idempotent.** Check `webhooks_raw.stripe_event_id` before processing.
6. **PCI compliance:** Never store card data. Only store Stripe IDs, amounts, and status.

## Event Types (Real Data from justloveforest.com)

- **Retreats** — Overnight, fixed price ($250+tax typical), accommodation in yurts/tents
- **Community Weekends** — Day or overnight, variable pricing
- **Ashram (Hanuman Tuesdays)** — Donation-based, day events
- **Forest Therapy** — Day experiences
- **Hermitage** — Solo stays
- **Green Burial Tours** — Free, registration required
- **Song & Sound Circle, Service & Gardening, Meditation** — Various formats

## Intake Form Fields (Based on Current Acuity Forms)

### Standard fields (every event):
- First name, Last name
- Email
- Phone number
- Dietary restrictions / food preferences (they serve plant-based meals)
- Waiver/visitor agreement acceptance (checkbox + timestamp)
- Questions for the team (textarea)
- How did you hear about us? (text)

### Event-specific fields (configurable per event via `registration_fields` JSONB):
- Accommodation preference (bell tent / nylon tent / self-camping / yurt shared / none)
- Emergency contact name & phone
- Any specific needs or accommodations
- Custom questions defined by the operator

## Dashboard Design Reference

The React dashboard mockup is at `reference/jlf-erp-final.jsx`. It includes:
- Login page (forest-themed)
- Sidebar navigation with forest green palette
- Event overview with cards
- Dashboard with charts (accommodation pie, dietary bar, revenue line)
- Attendee table with search, filter, and status badges
- Day-of logistics view
- Co-creator portal (read-only, event-scoped)
- Settings page
- Modals for event creation, attendee details, manual entry

Use the color palette, component structure, and UX patterns from this mockup.

## Development Notes

- Use `uvicorn` to run the FastAPI backend locally
- Use `vite` for the React frontend dev server
- Use `alembic` for database migrations
- Stripe test mode for development (keys via .env)
- All times should be stored in UTC, displayed in Eastern (America/New_York)
