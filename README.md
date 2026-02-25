# Just Love Forest — Event Management Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)](https://railway.app/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)

A custom event management system built for [Just Love Forest](https://justloveforest.com), a 716-acre nature sanctuary in Poetry, Georgia. Replaces a fragmented Acuity + Stripe + Google Sheets workflow with a unified, modern platform.

---

## 📸 Screenshots

> *Screenshots coming soon — see live deployment at [justloveforest-events.vercel.app](https://justloveforest-events.vercel.app)*

---

## The Problem

Just Love Forest runs retreats, community weekends, and nature-based experiences. Their registration and payment systems were disconnected — Stripe for payments, Acuity Scheduling for intake forms, and Google Sheets for reconciliation. The result: 4-8 hours of manual admin per event, a 15-20% registration drop-off rate, and zero self-service access for co-hosts.

## The Solution

A single-system architecture where attendees register and pay in one atomic flow. No reconciliation needed — one database, one source of truth.

```
[Event Page] → [Registration Form] → [Stripe Checkout] → [PostgreSQL] → [Dashboard]
```

---

## ✨ Features

### Core Functionality
- **Atomic Registration + Payment** — Intake form → Stripe Checkout in one flow. No booking exists without payment.
- **Operator Dashboard** — Real-time event overview with headcount, accommodation breakdown, dietary summary, and revenue tracking.
- **Co-Creator Portal** — Read-only, event-scoped access for co-hosts via magic link authentication.
- **Admin User Management** — Create and manage operator accounts (admin/operator roles).

### Automation
- **Automated Reminders** — Configurable email reminders for incomplete registrations, with auto-expiry.
- **Day-of Logistics** — SMS notifications, tent counts, dietary breakdown, meeting point assignments.
- **Event Duplication** — Clone events for recurring series (copies all settings, templates, fields).

### Operations
- **Manual Overrides** — Walk-ins, cash payments, comps, and accommodation changes with full audit trail.
- **CSV Export** — Per-event data export for offline/field use.
- **Notification Templates** — Customizable email/SMS templates with placeholder support.
- **SMS Blast** — Send SMS notifications to all attendees of an event.

### Security
- **Rate Limiting** — Protection against brute-force attacks on auth and registration endpoints.
- **Input Sanitization** — Validates and sanitizes all user-provided JSON data.
- **JWT + Magic Links** — Secure authentication for operators and co-creators.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│   FastAPI       │────▶│   PostgreSQL    │
│   (Vercel)      │     │   (Railway)     │     │   (Railway)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐           ┌───────▼───────┐
              │  Stripe   │           │    Resend     │
              │ Webhooks  │           │    (Email)    │
              └───────────┘           └───────────────┘
                                              │
                                      ┌───────▼───────┐
                                      │    Twilio     │
                                      │    (SMS)      │
                                      └───────────────┘
```

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

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.12 / FastAPI (async) |
| **Database** | PostgreSQL 16 (SQLAlchemy 2.0 + Alembic) |
| **Frontend** | Next.js 15 / React 19 / TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Payments** | Stripe Checkout + Webhooks |
| **SMS** | Twilio |
| **Email** | Resend |
| **Auth** | JWT + Magic Links |
| **Rate Limiting** | SlowAPI |
| **Deployment** | Railway (backend) + Vercel (frontend) |

---

## 📁 Project Structure

```
src/
├── backend/                  # FastAPI API server
│   ├── app/
│   │   ├── main.py           # FastAPI app factory + startup
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic (stripe, email, sms, auth)
│   │   └── tasks/            # Background jobs (reminders, expiry, day-of SMS)
│   ├── alembic/              # Database migrations
│   └── tests/                # API tests (pytest)
└── frontend/                 # Next.js dashboard + registration
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/       # Login, magic link verify
    │   │   ├── (dashboard)/  # Operator dashboard (events, day-of, settings)
    │   │   ├── (portal)/     # Co-creator portal (read-only view)
    │   │   └── register/     # Public registration form
    │   ├── components/       # Reusable UI components
    │   ├── hooks/            # Custom React hooks (dark mode, auth)
    │   └── lib/              # API client, theme, utilities
    └── public/
```

---

## 🚀 Getting Started

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

---

## 📦 Deployment

### Backend (Railway)
- Connects to Railway-provisioned PostgreSQL
- `DATABASE_URL` is auto-injected; the app auto-converts `postgresql://` to `postgresql+asyncpg://`
- Set all environment variables from `.env.example` in the Railway dashboard
- Uses `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)
- Deploy from `src/frontend` directory
- Set `NEXT_PUBLIC_API_URL` to your Railway backend URL (e.g., `https://your-app.railway.app/api/v1`)
- Framework preset: Next.js (auto-detected)

### Stripe Webhooks
- Point the Stripe webhook endpoint to `https://your-backend-url/api/v1/webhooks/stripe`
- Events to listen for: `checkout.session.completed`, `checkout.session.expired`

### First-Time Setup
After deploying, create the first admin user via the bootstrap endpoint:
```bash
curl -X POST https://your-backend-url/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "name": "Admin", "password": "your-secure-password"}'
```
*Note: This endpoint only works when no users exist in the database.*

---

## 📄 Environment Variables

See `src/backend/.env.example` and `src/frontend/.env.example` for required configuration.

---

## 📚 Documentation

- [API Contracts](reference/API_CONTRACTS.md) — Endpoint specifications
- [Data Model](reference/DATA_MODEL.md) — Database schema
- [Architecture Decisions](reference/ARCHITECTURE_DECISIONS.md) — Design rationale

---

## 👥 Authors

- **Brandon Abbott** — Developer & IT Consultant
- Built for **Brian Yancey (Bala)** & **Naveed Sahaye (Nivay)** of Just Love Forest

---

## 📝 License

Private — All rights reserved.
