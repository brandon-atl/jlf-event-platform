# JLF ERP — Architecture Decision Records (PRD v4)

> **Changelog (v4):** Added ADR-012 through ADR-021 based on 02-25-26 meeting requirements.

## ADR-001: Drop Acuity from the Booking Flow
Acuity Scheduling is designed for 1:1 appointment businesses. JLF runs fixed-date group events — there's no calendar availability to manage. Acuity's native payment can't handle tax calculation or pay-what-you-want pricing (confirmed by Brian, 01-30 meeting). JLF was paying for a scheduling tool and using it as a registration form. Our ERP already includes everything Acuity provided (intake forms, confirmations, reminders) and more. Removing Acuity eliminates the root cause of every operational problem: two disconnected systems.

## ADR-002: Single-System Registration Flow
Custom form → Stripe Checkout → PostgreSQL. One system, one database, atomic by design. No matching engine, no reconciliation, no NEEDS_REVIEW state. Registration and payment are a single atomic operation. If payment doesn't complete, no booking exists. **v4 amendment:** Cash payment toggle adds a parallel path where payment is deferred but registration is still captured atomically in our system.

## ADR-003: FastAPI over Django
FastAPI's async-first architecture is ideal for webhook processing where I/O-bound operations dominate. Lighter footprint than Django. Auto-generates OpenAPI docs for future maintainers. Python is Brandon's primary stack.

## ADR-004: PostgreSQL over SQLite for Production
ACID transactions critical for webhook idempotency. JSONB columns for flexible intake forms. Concurrent access required by webhooks + dashboard. Rich aggregation queries for logistics summaries. SQLite for local dev, PostgreSQL (Railway) for production.

## ADR-005: React Dashboard (from .jsx Mockup)
A full React dashboard mockup already exists (jlf-erp-final.jsx) and was presented to and approved by the client. Forest-themed UI with login, event list, dashboard charts, attendee management, day-of logistics view, co-creator portal, and settings. Using this as the design reference and building it out with a real backend.

## ADR-006: Stripe Checkout (Hosted) over Stripe Elements
Stripe's hosted Checkout page handles PCI compliance, tax calculation, pay-what-you-want, and payment method display. Brian already likes the current Stripe payment page. Using Stripe Checkout Sessions API with `client_reference_id` linking to our registration record. **v4 amendment:** For composite events, Checkout Sessions use multiple line items (one per selected sub-event). For scholarship registrations, Stripe Coupons or adjusted pricing is applied at session creation.

## ADR-007: APScheduler over Celery for MVP
Simpler single-process scheduling for deferred reminder checks. Celery requires Redis infrastructure — overkill for MVP volume. Can migrate to Celery if event volume demands it. **v4 amendment:** Pending-payment auto-expire timers removed (D1). APScheduler now handles: event reminders (1 week, 1 day before), day-of SMS scheduling, and daily reconciliation checks.

## ADR-008: JSONB for Intake Form Data
Each event type has unique intake questions. JSONB allows flexible per-event storage without schema migrations. Standard fields (accommodation, dietary) promoted to dedicated columns for efficient dashboard aggregation. **v4 amendment:** intake_data is now namespaced by form_template_id: `{template_id: {field_id: value}}`. This prevents field ID collisions when multiple forms are attached to one event.

## ADR-009: Raw Webhook Payload Storage
Store raw Stripe payloads in webhooks_raw table. Enables debugging, replay, and audit without re-fetching from external APIs. Essential for diagnosing integration issues. **v4 amendment:** `webhooks_raw` now also stores Twilio inbound SMS payloads with `source=twilio`.

## ADR-010: Magic Links for Co-Creator Auth
Co-creators (co-hosts) are non-technical users who need occasional access. Magic link auth (email a login link) is zero-friction — no passwords to remember, no accounts to create. Tokens are single-use with configurable expiry. **v4 amendment:** Co-creator portal scope expanded from read-only to include expense uploads, attendee notes, and settlement viewing.

## ADR-011: Monorepo Structure
Backend (FastAPI), frontend registration form, and dashboard all live in one repository under `src/`. Simplifies CI/CD, shared configuration, and deployment coordination. Each component has its own dependency management.

## ADR-012: Form-Submitted Name Is Canonical *(NEW v4)*
**Decision:** Always use the name submitted through the registration form. Never overwrite `attendees.first_name` / `attendees.last_name` from Stripe billing information.

**Context:** Brandon identified that when Person A pays for Person B, Stripe's billing name is Person A but the attendee is Person B. Previous Acuity workflow extracted names from billing info, causing data integrity issues.

**Consequence:** Stripe `checkout.session.completed` webhook handler MUST NOT update attendee name fields. The only source of truth for attendee identity is the registration form submission.

## ADR-013: Composable Form Templates over Monolithic Forms *(NEW v4)*
**Decision:** Build a form template system with reusable blocks (Dietary, Accommodation, Travel, Health, Legal, Custom) that can be composed per event, rather than one large form per event.

**Context:** Acuity system audit (02-26) revealed 30 intake forms that decompose into ~6 reusable template categories. Brian creates event-specific forms by mixing and matching these blocks. He needs to duplicate/edit without dev involvement.

**Consequence:** Admin UI needs a form builder (CRUD templates) + event-form linking (attach templates to events with sort order). Registration form renders all linked templates in sequence. intake_data in JSONB is namespaced by template ID.

## ADR-014: Sub-Events Model for Composite Pricing *(NEW v4)*
**Decision:** Model Community Weekend as a parent event with child `sub_events`, each with its own pricing model, rather than a single event with complex pricing logic.

**Context:** Community Weekend has 4 components with different pricing: Friday Night (donation), Saturday Day (donation), Saturday Night ($50 fixed), Sunday Forest Therapy ($125 fixed). Attendees pick which parts they attend. Brian needs per-sub-event headcount.

**Consequence:** `sub_events` table with FK to parent event. Registration flow shows sub-events as checkboxes. Stripe Checkout Session has multiple line items. Dashboard shows headcount per sub-event.

## ADR-015: Cash Payment as First-Class Status *(NEW v4)*
**Decision:** `cash_pending` is a distinct registration status, not a variant of `pending_payment`. Cash registrations are immediately valid — the person is expected at the event.

**Context:** Brian: "I need some sort of back door where they can register without paying." This is common for returning members, scholarships, and people who prefer cash. The old `PENDING_PAYMENT` auto-expire logic does NOT apply to cash registrations.

**Consequence:** `cash_pending` registrations are included in headcount, day-of SMS, check-in rosters, and catering counts. Operator marks as paid via dashboard when cash is collected. No auto-expire timer.

## ADR-016: Eliminate Payment-Chase Reminders *(NEW v4)*
**Decision:** Remove the auto-reminder → escalation → auto-expire pipeline for pending payments. `PENDING_PAYMENT` is now a transient state lasting only seconds (during Stripe Checkout redirect).

**Context:** Brian: "I think we can totally remove all the pending payments." Under the new form-first flow, attendees complete their intake form BEFORE being sent to Stripe. If they abandon Stripe, Stripe's `checkout.session.expired` webhook handles cleanup. No need for our own reminder/escalation chain.

**Consequence:** Remove `reminder_delay_minutes`, `auto_expire_hours` from events table. Remove `reminder_sent_at`, `escalation_sent_at` from registrations table. APScheduler no longer needs payment-chase jobs. Event-based reminders (1 week before, 1 day before) are separate and remain.

## ADR-017: Two-Way SMS via Twilio Webhooks *(NEW v4)*
**Decision:** Implement two-way SMS using Twilio's inbound webhook (not the Conversations API) with a custom `sms_conversations` table for threading.

**Context:** Brian: "if they reply back, I want to be able to reply back to them." Twilio Conversations API adds complexity (separate SDK, session management). Since our threading needs are simple (match by phone number), a webhook + DB approach is simpler and cheaper.

**Consequence:** Configure Twilio number for inbound webhook → `POST /webhooks/twilio/inbound`. Store all messages in `sms_conversations`. Admin inbox UI groups by phone number. ETA parsing is a bonus feature on inbound messages.

## ADR-018: File Storage for Receipts — Decision Deferred *(NEW v4)*
**Decision:** Defer storage backend choice until Phase 4 implementation. Candidates: Railway volume (simplest), Cloudflare R2 (cheapest), AWS S3 (most mature).

**Context:** Receipt image uploads needed for expense tracking (Phase 4). Volume is low (~5-20 images per event). Cost is not the primary driver — simplicity is.

**Consequence:** Build the upload API with a pluggable storage service interface. Default to Railway volume for MVP. Swap to R2/S3 if volume or access patterns demand it.

## ADR-019: Settlement Versioning over Mutation *(NEW v4)*
**Decision:** Financial settlements are versioned (append-only), not mutated in place. Each recalculation creates a new version.

**Context:** Navay described a scenario where a co-creator submits a late receipt, changing the split calculations. The old numbers need to be preserved for transparency and trust between co-creators.

**Consequence:** `event_settlements` has a `version` column. Each recalculation inserts a new row with incremented version. Settlement history endpoint shows all versions. Diff between versions can be computed for display.

## ADR-020: Cancellation Requests over Auto-Cancel *(NEW v4)*
**Decision:** Self-service cancellation creates a notification/request for the admin. It does NOT automatically cancel the registration.

**Context:** Brian (on Acuity's cancel button): "it doesn't actually do it… it tells me." Brian wants to know when someone wants to cancel so he can follow up personally — sometimes people just need reassurance.

**Consequence:** Cancellation link in emails triggers `POST /register/{slug}/cancel-request` which creates an admin notification. Admin reviews and manually cancels if appropriate. No automated status change.

## ADR-021: Confirmation Copy Is Event-Specific *(NEW v4)*
**Decision:** Confirmation messages are customizable per event via `notification_templates.confirmation_message` JSONB key, supporting the warm, personal tone Brian and Navay use.

**Context:** Acuity test booking (02-26 audit) showed a beautiful personalized confirmation: "You're all set... Until then, know that your place is held. Just Love, always, Bala & Nivay." Each event has its own voice. Generic confirmations would feel wrong for this community.

**Consequence:** `notification_templates` JSONB on events table includes a `confirmation_message` key with markdown/template support. Merge fields: `{first_name}`, `{event_name}`, `{event_date}`, `{location}`. Default template provided, but Brian can customize per event in the admin UI.
