# JLF ERP — Architecture Decision Records (PRD v3)

## ADR-001: Drop Acuity from the Booking Flow
Acuity Scheduling is designed for 1:1 appointment businesses. JLF runs fixed-date group events — there's no calendar availability to manage. Acuity's native payment can't handle tax calculation or pay-what-you-want pricing (confirmed by Brian, 01-30 meeting). JLF was paying for a scheduling tool and using it as a registration form. Our ERP already includes everything Acuity provided (intake forms, confirmations, reminders) and more. Removing Acuity eliminates the root cause of every operational problem: two disconnected systems.

## ADR-002: Single-System Registration Flow
Custom form → Stripe Checkout → PostgreSQL. One system, one database, atomic by design. No matching engine, no reconciliation, no NEEDS_REVIEW state. Registration and payment are a single atomic operation. If payment doesn't complete, no booking exists.

## ADR-003: FastAPI over Django
FastAPI's async-first architecture is ideal for webhook processing where I/O-bound operations dominate. Lighter footprint than Django. Auto-generates OpenAPI docs for future maintainers. Python is Brandon's primary stack.

## ADR-004: PostgreSQL over SQLite for Production
ACID transactions critical for webhook idempotency. JSONB columns for flexible intake forms. Concurrent access required by webhooks + dashboard. Rich aggregation queries for logistics summaries. SQLite for local dev, PostgreSQL (Railway) for production.

## ADR-005: React Dashboard (from .jsx Mockup)
A full React dashboard mockup already exists (jlf-erp-final.jsx) and was presented to and approved by the client. Forest-themed UI with login, event list, dashboard charts, attendee management, day-of logistics view, co-creator portal, and settings. Using this as the design reference and building it out with a real backend.

## ADR-006: Stripe Checkout (Hosted) over Stripe Elements
Stripe's hosted Checkout page handles PCI compliance, tax calculation, pay-what-you-want, and payment method display. Brian already likes the current Stripe payment page. Using Stripe Checkout Sessions API with `client_reference_id` linking to our registration record.

## ADR-007: APScheduler over Celery for MVP
Simpler single-process scheduling for deferred reminder checks. Celery requires Redis infrastructure — overkill for MVP volume. Can migrate to Celery if event volume demands it.

## ADR-008: JSONB for Intake Form Data
Each event type has unique intake questions. JSONB allows flexible per-event storage without schema migrations. Standard fields (accommodation, dietary) promoted to dedicated columns for efficient dashboard aggregation.

## ADR-009: Raw Webhook Payload Storage
Store raw Stripe payloads in webhooks_raw table. Enables debugging, replay, and audit without re-fetching from external APIs. Essential for diagnosing integration issues.

## ADR-010: Magic Links for Co-Creator Auth
Co-creators (co-hosts) are non-technical users who need occasional read-only access. Magic link auth (email a login link) is zero-friction — no passwords to remember, no accounts to create. Tokens are single-use with configurable expiry.

## ADR-011: Monorepo Structure
Backend (FastAPI), frontend registration form, and dashboard all live in one repository under `src/`. Simplifies CI/CD, shared configuration, and deployment coordination. Each component has its own dependency management.
