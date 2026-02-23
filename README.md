# 🌲 Just Love Forest — Event Management Platform

A custom event management system built for [Just Love Forest](https://justloveforest.com), a 716-acre nature sanctuary in Poetry, Georgia. Replaces a fragmented Acuity + Stripe + Google Sheets workflow with a unified, modern platform.

## The Problem

Just Love Forest runs retreats, community weekends, and nature-based experiences. Their registration and payment systems were disconnected — Stripe for payments, Acuity Scheduling for intake forms, and Google Sheets for reconciliation. The result: 4-8 hours of manual admin per event, a 15-20% registration drop-off rate, and zero self-service access for co-hosts.

## The Solution

A single-system architecture where attendees register and pay in one atomic flow. No reconciliation needed — one database, one source of truth.

```
[Event Page] → [Registration Form] → [Stripe Checkout] → [PostgreSQL] → [Dashboard]
```

### Key Features

- **Atomic Registration + Payment** — Intake form → Stripe Checkout in one flow. No booking exists without payment.
- **Operator Dashboard** — Real-time event overview with headcount, accommodation breakdown, dietary summary, and revenue tracking.
- **Co-Creator Portal** — Read-only, event-scoped access for co-hosts via magic link authentication.
- **Automated Reminders** — Configurable email reminders for incomplete registrations, with auto-expiry.
- **Day-of Logistics** — SMS notifications, tent counts, dietary breakdown, meeting point assignments.
- **Manual Overrides** — Walk-ins, cash payments, comps, and accommodation changes with full audit trail.
- **CSV Export** — Per-event data export for offline/field use.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python / FastAPI (async) |
| **Database** | PostgreSQL (SQLAlchemy 2.0 + Alembic) |
| **Frontend** | React (Vite) |
| **Payments** | Stripe Checkout + Webhooks |
| **SMS** | Twilio |
| **Email** | Resend |
| **Auth** | JWT + Magic Links |
| **Deployment** | Railway + Vercel |

## Architecture

This project follows a **single-source-of-truth** design. The custom registration form and Stripe Checkout are the only two touchpoints in the attendee-facing flow. All data writes directly to PostgreSQL. There is no second system to reconcile.

### Registration Flow

1. Attendee clicks "Register" on event page
2. Custom form collects all intake data (name, email, dietary, accommodation, waiver)
3. On submit → record saved as `PENDING_PAYMENT` → redirect to Stripe Checkout
4. Stripe webhook → record updated to `COMPLETE` → confirmation email sent
5. If abandoned → automated reminder → auto-expire after configurable window

### Registration States

```
PENDING_PAYMENT → COMPLETE → CANCELLED / REFUNDED
PENDING_PAYMENT → EXPIRED (auto, after timeout)
```

## Project Structure

```
src/
├── backend/           # FastAPI API server
│   ├── app/
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── routers/   # API routes
│   │   ├── services/  # Business logic
│   │   └── tasks/     # Background jobs
│   ├── alembic/       # Database migrations
│   └── tests/         # API tests
└── frontend/          # React dashboard + registration
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── lib/
    └── public/
```

## Getting Started

### Backend
```bash
cd src/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your keys
alembic upgrade head  # Run migrations
uvicorn app.main:app --reload
```

### Frontend
```bash
cd src/frontend
npm install
cp .env.example .env  # Configure API URL
npm run dev
```

## Environment Variables

See `src/backend/.env.example` and `src/frontend/.env.example` for required configuration.

## Documentation

- [PRD v3](docs/PRD_v3.md) — Full product requirements
- [API Contracts](reference/API_CONTRACTS.md) — Endpoint specifications
- [Data Model](reference/DATA_MODEL.md) — Database schema
- [Architecture Decisions](reference/ARCHITECTURE_DECISIONS.md) — Design rationale

## Authors

- **Brandon Abbott** — Developer & IT Consultant
- Built for **Brian Yancey (Bala)** & **Naveed Sahaye (Nivay)** of Just Love Forest

## License

Private — All rights reserved.
