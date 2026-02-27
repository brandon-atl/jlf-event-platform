# JLF Event Management ERP — Project Instructions

## What This Project Is

A custom Event Management ERP for **Just Love Forest** (justloveforest.com), a 716-acre nature sanctuary in Poetry, GA that runs retreats, community weekends, and nature-based experiences. The system replaces a manual Acuity + Stripe + Google Sheets workflow with a unified platform.

**Client:** Brian "Bala" Yancey & Naveed "Nivay" Nawabi
**GitHub:** https://github.com/brandon-atl/jlf-event-platform
**Backend (Railway):** https://jlf-event-platform-production.up.railway.app
**Frontend (Vercel):** https://justloveforest-events.vercel.app

## Architecture (PRD v4 — Post 02-25-26 Meeting)

**The old way:** Acuity for registration, Stripe for payment, manual spreadsheet reconciliation.
**The new way:** Custom registration form → Stripe Checkout → PostgreSQL. One system. Atomic.

### Registration Flow
1. Attendee clicks "Register" on Squarespace event page → redirected to our custom form
2. Form renders dynamically from linked `form_templates` (composable intake forms)
3. For composite events (Community Weekend): sub-event checkboxes shown with per-component pricing
4. Payment method selection: Stripe (default), Cash ("I'll pay in person"), or Scholarship code
5. On submit → save to PostgreSQL → route by payment method:
   - **Stripe:** status=`PENDING_PAYMENT` → redirect to Stripe Checkout → webhook completes → `COMPLETE`
   - **Cash:** status=`CASH_PENDING` → included in headcount/roster immediately → operator marks paid later
   - **Free:** status=`COMPLETE` (immediate)
   - **Scholarship:** status=`PENDING_PAYMENT` → discounted Stripe Checkout → webhook → `COMPLETE`
6. Confirmation email with personalized message (customizable per event), calendar links, and cancellation request link

### Registration States
```
[New]
├─ Stripe ──────▶ PENDING_PAYMENT ──▶ (webhook) ──▶ COMPLETE ──▶ CANCELLED / REFUNDED
├─ Cash ────────▶ CASH_PENDING ──────▶ (operator) ──▶ COMPLETE
├─ Free ────────▶ COMPLETE (immediate)
└─ Scholarship ─▶ PENDING_PAYMENT ──▶ (discounted webhook) ──▶ COMPLETE
```

**Important:** `PENDING_PAYMENT` is transient (seconds during Stripe redirect). There is NO auto-reminder/auto-expire chain for unpaid registrations. `CASH_PENDING` is persistent — no timer, no auto-expire.

### Multi-Guest Registration
One payer can register multiple guests. Each guest:
- Has their own registration row (linked by `group_id`)
- Fills their own intake forms
- Accepts their own waivers
- Gets their own confirmation email
The payer handles one combined Stripe Checkout for the group total.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11+ / FastAPI (async) |
| Database | SQLite (local dev) → PostgreSQL (Railway, production) |
| ORM | SQLAlchemy 2.0 (async) + Alembic migrations |
| Frontend (Dashboard) | React (based on existing jlf-erp-final.jsx mockup) |
| Frontend (Registration) | React (separate lightweight app or route) |
| Payment | Stripe Checkout Sessions + Webhooks |
| SMS | Twilio (outbound + inbound two-way) |
| Email | Resend (branded HTML templates with JLF logo) |
| Auth | JWT (operators) + Magic links (co-creators) |
| Task Scheduling | APScheduler |
| File Storage | TBD (Railway volume MVP → R2/S3 later) |

## Project Structure

```
jlf-erp/
├── CLAUDE.md              # This file
├── README.md              # Project overview
├── reference/             # Architecture docs
│   ├── DATA_MODEL.md      # Database schema (v4)
│   ├── API_CONTRACTS.md   # API endpoints and request/response formats (v4)
│   ├── ARCHITECTURE_DECISIONS.md  # ADRs (v4, ADR-001 through ADR-021)
│   ├── EDGE_CASES.md      # Edge case handling (v4)
│   ├── Current_System_Audit.md    # Acuity/Squarespace/Sheets audit (02-26)
│   ├── JLF_Client_List.csv        # Exported Acuity client list (601 contacts)
│   └── BRAINSTORM_REGISTRATION_FLOW.md
├── meeting notes/         # Client meeting transcripts and analysis
│   ├── 02-25-26/          # Raw meeting files (transcript, summary, needs, requirements)
│   └── 02-25-26_Meeting_Analysis_and_Implementation_Plan.md
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
│   │   │   ├── services/         # Business logic (stripe, email, sms, auth, storage)
│   │   │   └── tasks/            # Background tasks (event reminders, reconciliation)
│   │   ├── alembic/              # Database migrations
│   │   ├── tests/                # pytest tests
│   │   ├── seed_demo.py          # Demo data seeder (109 registrations)
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

1. **No Acuity integration.** Acuity is removed from the booking flow entirely (ADR-001).
2. **Stripe Checkout (hosted page), not Stripe Elements** (ADR-006). For composite events, use multi-line-item Checkout Sessions.
3. **`client_reference_id`** on the Stripe Checkout Session links back to our registration record ID.
4. **Composable form templates** (ADR-013). Admin creates reusable form blocks (dietary, accommodation, travel, health, legal, custom) and attaches them to events. Replaces monolithic `registration_fields` JSONB.
5. **Form-submitted name is canonical** (ADR-012). NEVER overwrite attendee name from Stripe billing info.
6. **All webhook handlers must be idempotent.** Check `webhooks_raw.stripe_event_id` / `webhooks_raw.twilio_sid` before processing.
7. **PCI compliance:** Never store card data. Only store Stripe IDs, amounts, and status.
8. **No pending-payment chase** (ADR-016). `PENDING_PAYMENT` is transient. No reminder/escalation timers.
9. **Cash payment is first-class** (ADR-015). `CASH_PENDING` = expected at event, included in headcount.
10. **Cancellation = request, not auto-action** (ADR-020). Self-service cancel creates admin notification only.
11. **Settlement versioning** (ADR-019). Financial settlements are append-only, not mutated.

## Event Types (Real Data from justloveforest.com)

- **Retreats** — Overnight, fixed price ($250+tax typical), accommodation in bell tents/tipi twins/self-camping
- **Community Weekends** — **Composite event** with sub-events: Friday Night (donation), Saturday Day (donation), Saturday Night ($50), Sunday Forest Therapy ($125). Monthly recurring.
- **Hanuman Tuesdays** — Donation-based, day events. Weekly recurring. Simple registration.
- **Forest Therapy** — $125 fixed price day experiences
- **Hermitage** — Solo stays, by application. $50 consultation + variable stay.
- **Green Burial Tours** — Free, registration required
- **Song & Sound Circle, Service & Gardening, Meditation** — Various formats, mostly donation-based
- **Ashram (Ram Dass Evenings)** — Overnight, donation-based

## Accommodation Types
`bell_tent` | `tipi_twin` | `self_camping` | `day_only` | `none`

## Discount & Scholarship Rules (Confirmed Post-Meeting 02-25-26)

### JLF Membership Discount
- **$25 flat off** any event price
- **Max 3 members per event** — first-signup-first-serve (enforce via registration count where `attendee.is_member=true`)
- Active members have `is_member=true` flag on attendees table + linked `memberships` record
- Single tier (no levels)

### Scholarship Pricing
- **Flat $30 event cost** (regardless of original price)
- **Brian's discretion only** — admin creates scholarship link, attendee uses code at registration
- Scholarship attendees flagged in registrations (`payment_method=scholarship`)
- Goes through Stripe at $30 (not PayPal — consolidates tax reporting)

## Intake Form Architecture (v4)

### Composable Template Blocks (from Acuity audit — 30 forms → 6 categories)
1. **Accommodation** — overnight options, mattress size, self-camping details
2. **Dietary** — restrictions, allergies, food commitments, meal preferences
3. **Travel** — arrival/departure, carpooling, vehicle type
4. **Health/Safety** — wellbeing check-in, health disclosure, safety understanding
5. **Logistics** — first timer?, potluck, day pass food
6. **Legal** — liability waiver, media consent, sobriety agreement

### Standard Fields (every event, hardcoded)
- First name, Last name, Email, Phone number
- Dietary restrictions (text)
- Waiver acceptance (checkbox + timestamp)

### Dynamic Fields (from linked form_templates)
- Rendered in sort_order from `event_form_links`
- intake_data namespaced by form_template_id: `{template_id: {field_id: value}}`
- Waiver forms require explicit checkbox acceptance

## Dashboard Design Reference

The React dashboard mockup is at `reference/jlf-erp-final.jsx`. Key pages:
- Login page (forest-themed)
- Sidebar navigation with forest green palette
- Event overview with cards
- Dashboard with charts (accommodation pie, dietary bar, revenue line)
- Attendee table with search, filter, and status badges
- **Form builder** — CRUD for intake form templates (NEW)
- **Day-of view** — Check-in roster with ETA tracking, printable layout
- **SMS Inbox** — Two-way threaded conversations (NEW)
- Co-creator portal (interactive: expense upload, notes, settlement view)
- **Expenses & Settlement** — Per-event expense tracking, receipt uploads, split calculator (NEW)
- **Scholarship & Membership** management (NEW)
- Settings page

## Implementation Phases (from 02-25-26 Meeting Analysis)

### Phase 1: Custom Forms + Registration Flow Overhaul
Form builder, event-form linking, cash payment toggle, multi-guest registration, remove pending-payment timers.

### Phase 2: Composite Events + Recurring Dates
Sub-events model, Community Weekend pricing, recurring date picker, consolidated headcount.

### Phase 3: Communications Enhancement
Two-way SMS (Twilio inbound), branded HTML emails, ETA tracking, printable roster, cancellation requests.

### Phase 4: Financial Module
Expenses, receipt uploads, settlement calculator, co-creator payout view, reconciliation, scholarships, memberships, operating expenses.

### Phase 5: Polish, Migration & Decommission
Calendar links, weather API (if confirmed), Acuity form migration, data migration, SOP docs, live test.

## Development Notes

- Use `uvicorn` to run the FastAPI backend locally
- Use `vite` for the React frontend dev server
- Use `alembic` for database migrations
- Stripe test mode for development (keys via .env)
- All times stored in UTC, displayed in Eastern (America/New_York)
- **Railway CLI** is linked to `jlf-event-platform` service. Public DB: `shinkansen.proxy.rlwy.net:31860`
- Demo mode: `seed_demo.py` seeds 109 registrations. Demo flag stored in localStorage (`jlf_demo`).
- **Always create PR first** — never auto-merge to main. Let review bots run.
- **Enum casing:** Python str enums use lowercase members.
- **UUID in Pydantic v2:** SQLAlchemy UUID columns need UUID type in schemas.
- **per_page cap:** Set to 500 (not 100) to avoid silent 422 on frontend bulk requests.

## Current State (as of PR #20, Feb 2026)

### What's Built
- ✅ FastAPI backend with full CRUD for events, registrations, attendees
- ✅ Stripe Checkout integration (single-product)
- ✅ React dashboard with login, event list, attendee management
- ✅ Day-of check-in (checked_in_at, checked_in_by columns)
- ✅ Audit log viewer
- ✅ SMS blast (outbound via Twilio)
- ✅ Email notifications (Resend, text-based)
- ✅ Co-creator portal (read-only)
- ✅ CSV export
- ✅ Print kitchen sheet
- ✅ Demo mode with 109 seeded registrations
- ✅ Railway deployment (backend) + Vercel (frontend)

### What's Next (Phase 1 priorities)
- 🔲 Form template CRUD + form builder UI
- 🔲 Event-form linking
- 🔲 Dynamic form renderer on registration page
- 🔲 Cash payment toggle
- 🔲 Multi-guest registration
- 🔲 Remove pending-payment timer logic

### Pending (blocked on client)
- 🔲 Resend DNS records (Brian)
- 🔲 Domain → Vercel migration (Brian)
- 🔲 Squarespace link swap (Brian)
- 🔲 Live event test (Brian schedules)
- 🔲 Twilio phone number purchase ($1.15/mo)
