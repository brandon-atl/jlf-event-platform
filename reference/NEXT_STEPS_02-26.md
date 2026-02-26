# Next Steps — Post 02-25-26 Meeting
_Generated 2026-02-26 by Echo_

## Context

After the 02-25-26 client meeting, Acuity/Squarespace system audit, and confirmed discount pricing, the project has gone from "build an ERP" to "we know exactly what to build." The reference docs are at v4, the current system is fully documented, and the open questions are narrowed to 10 (down from 12 — membership and scholarship pricing confirmed).

This document proposes what to build **right now**, what can wait, and what needs client input before starting.

---

## Immediate Build Priority: Phase 1A — Form Builder MVP + Cash Toggle

### Why this first
Everything downstream depends on the form system. Composite events need forms. Multi-guest needs forms. Scholarships/memberships modify the form flow. The form builder is the keystone.

Brian is currently duplicating Acuity forms by hand for every event. The system audit found **30 intake forms** that decompose into **6 reusable blocks**. Building the form builder first gives Brian immediate operational relief — he can stop using Acuity for new events.

### What to build (2-3 dev sessions)

| # | Task | Size | Files |
|---|---|---|---|
| 1 | **Alembic migration: form_templates + event_form_links** | S | `src/backend/alembic/versions/`, `src/backend/app/models/form_template.py`, `src/backend/app/models/event_form_link.py` |
| 2 | **Form template CRUD API** | M | `src/backend/app/routers/form_templates.py`, `src/backend/app/schemas/form_templates.py` |
| 3 | **Admin Form Builder UI** | L | `src/frontend/src/pages/FormBuilder.jsx` — drag-and-drop field ordering, field type selector (text, textarea, dropdown, checkbox, multi_select, radio), live preview |
| 4 | **Event ↔ Form linking UI** | S | `src/frontend/src/pages/EventEditor.jsx` — "Attach Forms" section with sort order |
| 5 | **Seed 6 default templates from Acuity audit** | S | `src/backend/seed_form_templates.py` — Accommodation, Dietary, Travel, Health/Safety, Logistics, Legal |
| 6 | **Cash payment toggle on registration** | S | `src/backend/app/routers/registrations.py` — accept `payment_method: "cash"`, set `status=cash_pending`; `src/frontend/src/pages/Register.jsx` — "I'll pay in person" checkbox |
| 7 | **Remove pending-payment timer logic** | S | `src/backend/app/tasks/` — delete auto-expire/reminder jobs; remove `reminder_delay_minutes` and `auto_expire_hours` from events |
| 8 | **Dynamic form renderer on public registration page** | M | `src/frontend/src/pages/Register.jsx` — fetch linked form_templates from `/register/{slug}/info`, render fields dynamically |

### Demo-able after Phase 1A
- Admin creates "Dietary & Allergy" form template → attaches to "March Community Weekend" → public user fills dynamic form → pays on Stripe → confirmed
- Cash toggle: user selects "I'll pay in person" → registration saved as `cash_pending` → appears on dashboard

### Blockers: None. Can start immediately.

---

## Phase 1B — Multi-Guest Registration + Scholarship/Membership

### Why second
Multi-guest is Brian's #1 operational pain point ("I have to email them back and ask Brandon to register separately for his waivers"). Scholarship + membership pricing is now confirmed with exact numbers.

### What to build (1-2 dev sessions)

| # | Task | Size | Files |
|---|---|---|---|
| 1 | **Alembic migration: group_id on registrations, memberships, scholarship_links** | S | `src/backend/alembic/versions/` |
| 2 | **Multi-guest registration API** | M | `src/backend/app/routers/registrations.py` — `POST /register/{slug}/group`, create N registrations linked by `group_id` |
| 3 | **Multi-guest UI** | M | `src/frontend/src/pages/Register.jsx` — "How many guests?" selector, per-guest form pages, per-guest waiver acceptance |
| 4 | **Membership discount enforcement** | S | `src/backend/app/services/stripe_service.py` — $25 off, max 3 per event, first-signup-first-serve check |
| 5 | **Scholarship link CRUD** | S | `src/backend/app/routers/scholarship_links.py` — admin creates codes, $30 flat price |
| 6 | **Scholarship code validation at registration** | S | `src/backend/app/routers/registrations.py` — validate code, apply price, route to discounted Stripe checkout |
| 7 | **Admin UI: Membership management** | S | `src/frontend/src/pages/Memberships.jsx` — flag attendees as members, view active members |
| 8 | **Admin UI: Scholarship link management** | S | `src/frontend/src/pages/ScholarshipLinks.jsx` — create/deactivate codes, see usage |

### Demo-able after Phase 1B
- Couple registers together: Jane fills form + waiver → John fills form + waiver → single Stripe checkout for both → two registration rows in dashboard
- Member registers: $25 automatically deducted at Stripe checkout (3rd member for this event)
- Scholarship: Brian creates code → attendee enters code → Stripe checkout at $30

---

## Phase 2 — Composite Events + Recurring Dates

### Why third (not first)
Community Weekend is the most complex event type. Getting the form builder and registration flow solid first means composite events can build on a proven foundation. Also, Brian needs to confirm final sub-event pricing (Q6: forest therapy in member pricing).

### What to build (2-3 dev sessions)

| # | Task | Size | Files |
|---|---|---|---|
| 1 | **Alembic migration: sub_events, registration_sub_events, events.is_recurring** | M | `src/backend/alembic/versions/` |
| 2 | **Sub-event CRUD API** | M | `src/backend/app/routers/sub_events.py` |
| 3 | **Composite event admin UI** | L | `src/frontend/src/pages/EventEditor.jsx` — add sub-events with individual pricing |
| 4 | **Composite registration flow** | L | `src/frontend/src/pages/Register.jsx` — sub-event checkboxes, dynamic price totals, multi-line-item Stripe Checkout |
| 5 | **Per-sub-event headcount on dashboard** | M | `src/frontend/src/pages/Dashboard.jsx` — "Friday: 12, Saturday Day: 8, Saturday Night: 15, Sunday: 10" |
| 6 | **Recurring event date generation** | M | `src/backend/app/services/event_service.py` — parse RRULE, generate upcoming dates |
| 7 | **Recurring date picker UI** | M | `src/frontend/src/pages/Register.jsx` — show all upcoming dates, pick one |
| 8 | **Membership discount on composites** | S | Apply $25 off total of selected sub-events |

### Demo-able after Phase 2
- Create Community Weekend with 4 sub-events → attendee picks Friday + Saturday Night ($50) → Stripe checkout → dashboard shows per-sub-event headcount
- Hanuman Tuesday shows all upcoming Tuesdays → attendee picks March 10th → registers

---

## Needs Client Input Before Building

| Item | Question | Who Decides | Impact |
|---|---|---|---|
| Forest therapy in member weekend | Is Sunday Forest Therapy ($125) included in the $50 member Community Weekend price, or extra? | Brian + Navay | Phase 2 composite pricing logic |
| Offline check-in | Does the forest meeting point have cell signal? Should we build offline-capable PWA? | Brian | Phase 3 check-in architecture |
| Stripe Connect vs. Venmo | Is Venmo acceptable long-term for co-creator payouts, or should we build Stripe Connect onboarding? | Brian | Phase 4 settlement payout flow |
| File storage backend | Railway volume (simplest) vs. Cloudflare R2 (cheapest) vs. S3 (most mature) for receipt images? | Brandon | Phase 4 expense uploads |
| Weather API | Required or nice-to-have? | Brian | Phase 5 scope |
| Post-event WhatsApp group link | One per event or reuse master group? | Brian | Phase 3 SMS template |
| Operating expenses access | Just Navay, or all co-creators? | Brian + Navay | Phase 4 permissions |
| Cancellation impact on splits | Does a refund trigger settlement recalculation? | Brian | Phase 4 settlement versioning |

---

## What NOT to Build Yet

| Item | Why Wait |
|---|---|
| Two-way SMS | Requires Twilio number purchase ($1.15/mo) + Brian's approval. Phase 3. |
| Branded HTML emails | Blocked on Resend DNS (Brian). Phase 3. |
| Financial module (expenses, settlements) | Phase 4. Build after events are flowing through the system. |
| Multi-event shopping cart | Brian explicitly deferred: "if that's complicated, that's not a big deal." Post-launch. |
| Weather API | Ambiguous priority. Phase 5 at earliest. |
| Google Calendar / iCal links | Low priority per Brian. Phase 5. Note: Acuity already has this, so we'll need it eventually. |
| Acuity data migration | Wait until new system is proven with a live event. Phase 5. |

---

## Suggested Session Plan

**Session 1 (next coding session):**
- Alembic migration for form_templates + event_form_links
- Form template CRUD API + tests
- Cash payment toggle (backend only)
- Remove pending-payment timer logic
- Seed 6 default form templates from Acuity audit

**Session 2:**
- Admin Form Builder UI (drag-and-drop field editor, type selector, preview)
- Event ↔ Form linking UI
- Dynamic form renderer on public registration page

**Session 3:**
- Multi-guest registration API + UI
- Alembic migration for group_id, memberships, scholarship_links
- Membership discount enforcement
- Scholarship link CRUD + validation

**Session 4:**
- Composite events (sub_events model, admin UI, registration flow)
- Per-sub-event headcount dashboard
- Multi-line-item Stripe Checkout

**Session 5:**
- Recurring event model + date picker
- Membership on composites
- End-to-end testing: create Community Weekend → register with multi-guest + member discount + sub-event selection → verify dashboard

---

## Success Criteria: When Is Phase 1 "Done"?

Brian can:
1. ✅ Create a form template with dietary/accommodation/waiver fields
2. ✅ Attach forms to an event
3. ✅ Share a registration link that renders dynamic forms
4. ✅ Accept cash registrations without Stripe
5. ✅ Register a couple (2 guests, 1 payment, 2 waivers)
6. ✅ Create a scholarship code and see it used
7. ✅ See member discounts applied automatically
8. ✅ View all registrations (including cash_pending) on dashboard

When those 8 things work, we demo to Brian and Navay. Then move to Phase 2.
