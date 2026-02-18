# JLF ERP — Architecture Decision Records

## ADR-001: FastAPI over Django
FastAPI's async-first architecture is ideal for webhook processing where I/O-bound operations dominate. Lighter footprint than Django. Auto-generates OpenAPI docs for future maintainers.

## ADR-002: PostgreSQL over SQLite/Sheets
ACID transactions critical for webhook idempotency. JSONB columns for flexible intake forms. Concurrent access required by webhooks + dashboard. Rich aggregation queries for logistics summaries.

## ADR-003: Streamlit for MVP Dashboard
Fastest path to a functional dashboard (days vs weeks for Next.js). Native Python — no JS build toolchain. Adequate for operator use. Plan to upgrade to Next.js in Phase 2 if needed.

## ADR-004: APScheduler over Celery for MVP
Simpler single-process scheduling for deferred reminder checks. Celery requires Redis infrastructure — overkill for MVP volume. Can migrate to Celery if event volume demands it.

## ADR-005: Email-first matching, phone fallback
Email is the primary key across Stripe and Acuity. Phone number as secondary match. Name similarity + timestamp window as tertiary — always flagged NEEDS_REVIEW (never auto-matched on name alone).

## ADR-006: Webhook-driven with daily reconciliation safety net
Real-time webhooks for immediate data. Daily cron job queries both Stripe and Acuity APIs directly to catch missed webhooks. Belt + suspenders approach.

## ADR-007: JSONB for intake form data
Each event type has unique intake questions. JSONB allows flexible per-event storage. Standard fields (accommodation, dietary) promoted to dedicated columns for efficient dashboard aggregation.

## ADR-008: Raw webhook payload storage
Store raw Stripe/Acuity payloads in payments_raw/bookings_raw tables. Enables debugging, replay, and audit without re-fetching from external APIs.
