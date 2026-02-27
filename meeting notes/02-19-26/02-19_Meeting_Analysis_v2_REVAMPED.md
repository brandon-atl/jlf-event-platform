# 02-19 Meeting Analysis v2: Rethinking the Architecture

**Prepared by:** Brandon James Abbott
**Date:** February 23, 2026
**Meeting Analyzed:** February 19, 2026 (with context from January 30, 2026 initial meeting)
**Participants:** Brandon A., Brian Y., Naveed N.

---

## The Question We Should Be Asking

Every previous analysis — including my own PRD v2 — frames the problem as: *"How do we wire Acuity to Stripe so payment gates booking?"*

That's the wrong question.

The right question is: **Does JLF still need Acuity in the booking flow at all?**

If we're building a custom ERP with a PostgreSQL database, FastAPI backend, Stripe integration, Twilio SMS, email automation, and a full operator dashboard — we're already building 90% of what Acuity provides. The remaining 10% (intake forms and waivers) is trivial to build as a custom web form. And by building it ourselves, we **eliminate the root cause of every problem discussed in both meetings**: two disconnected systems that can't talk to each other.

---

## What Acuity Actually Does for JLF (vs. What It Could Do)

Acuity Scheduling is designed for 1:1 appointment businesses — therapists, salons, consultants. Its core value is **real-time calendar availability and time-slot booking**. But JLF doesn't use Acuity that way. JLF runs **fixed-date group events** (community weekends, retreats). There's no calendar availability to manage — the event is on a set date, and people register for it.

Here's what JLF actually uses from Acuity vs. what's going unused:

| Acuity Feature | JLF Uses It? | Can Our ERP Replace It? |
|---|---|---|
| Intake forms (name, dietary, accommodation) | Yes — core use | Yes — custom form, ~4 hours to build |
| Waiver/terms agreement | Yes | Yes — checkbox + stored consent timestamp |
| Event listing/scheduling page | Partially — embedded in Squarespace | Yes — custom registration page linked from Squarespace |
| Confirmation emails | Yes | Yes — already planned (Resend/SendGrid in PRD) |
| Reminder emails | Yes | Yes — already planned (Twilio + email in PRD) |
| Real-time calendar availability | **No** — events are fixed dates | N/A |
| 1:1 time-slot booking | **No** — group events only | N/A |
| Native Stripe payment at booking | **No** — can't handle taxes or variable pricing | N/A (our system uses Stripe directly) |
| Client self-service reschedule/cancel | Minimal | Can build if needed |
| Client profile history | Barely | PostgreSQL handles this better |

**The insight:** Acuity's core differentiator (calendar availability + time-slot management) is irrelevant to JLF's use case. JLF is paying for a scheduling tool and using it as a registration form.

---

## Revised Solution Options

### Option 1: Custom Registration Flow — Drop Acuity From the Booking Path (RECOMMENDED)

**What it is:** Build the registration form directly into the ERP. Attendees go to a custom registration page (linked from the Squarespace site), fill out intake data, and pay via Stripe — all in one atomic flow. The ERP's PostgreSQL database is the single source of truth. Acuity is no longer in the critical path.

**How it works:**

1. Attendee clicks "Register" on the Squarespace event page → redirected to custom registration form (hosted on Vercel, later on justloveforest.com)
2. Custom form collects all intake data: name, email, phone, dietary restrictions, accommodation preference, waiver acceptance, etc.
3. On form submit, the backend temporarily stores the intake data in PostgreSQL with status `PENDING_PAYMENT`
4. Backend creates a Stripe Checkout Session with `client_reference_id` linking to the intake record, plus `metadata` carrying key fields
5. Attendee is redirected to Stripe's hosted payment page (the same page Brian already likes) — supports pay-what-you-want, taxes, variable pricing
6. On successful payment, Stripe fires `checkout.session.completed` webhook → backend marks the record as `COMPLETE`
7. Confirmation email sent automatically
8. If attendee abandons before paying, record stays `PENDING_PAYMENT` — can trigger reminder or auto-expire after configurable window

**Why this is better than every previous option:**

- **Eliminates the "break in the chain" entirely.** There is no chain. One system, one flow, one database. Payment and registration are atomic by design.
- **No Acuity API access needed.** The single biggest Sprint 0 risk in the PRD — whether Acuity's embedded-in-Squarespace tier supports API access — becomes irrelevant.
- **No Acuity subscription cost** for the booking flow (Brian may still want it for other things).
- **No reconciliation needed.** The PRD's entire FR-01 through FR-07 (the core integration layer for matching Stripe payments to Acuity bookings) becomes unnecessary. The data is unified from the start.
- **Brian gets his ideal UX.** Intake first → payment second → done. Exactly what he described wanting in the 02-19 meeting.
- **Simpler codebase.** No Acuity webhook handlers, no matching engine, no NEEDS_REVIEW state for email mismatches between systems. Less code = fewer bugs = faster delivery.
- **Still tracks incomplete registrations.** The `PENDING_PAYMENT` records give Brandon the outreach data he wanted, and the auto-expire gives Brian the clean state he wanted. Both sides win.

**What changes from the PRD:**

- Sections 7.1 FR-01 through FR-03 (Acuity webhooks, matching engine) are **replaced** by a simpler direct-insert model
- FR-04 (event registry with Acuity + Stripe link pairs) simplifies to just the Stripe configuration
- FR-05 (unified attendee state) simplifies dramatically — states are just `PENDING_PAYMENT`, `COMPLETE`, `CANCELLED`, `REFUNDED`
- The entire "two failure modes" problem (Pay → No Booking, Book → No Pay) **ceases to exist**

**Effort estimate:** This is actually *less* work than the original PRD's Option C, because we're eliminating the Acuity integration layer entirely. Rough estimate: **45-60 hours total** (down from 63-82) because the matching/reconciliation engine and Acuity webhook handlers aren't needed.

**Risk:** Brian currently manages events through Acuity's admin interface. We need to provide an equivalent event-creation UX in the dashboard, or optionally sync event data FROM Acuity if Brian wants to keep using it for event setup.

---

### Option 2: Custom Form → Stripe → Acuity API Sync (Hybrid)

**What it is:** Same custom registration form as Option 1, but after payment succeeds, the backend also creates an Acuity appointment via API. This keeps Acuity as a "system of record" for Brian's existing workflow while the ERP is the real source of truth.

**When to choose this:** Only if Brian has strong attachment to the Acuity admin interface for managing events/calendars AND the Acuity API is accessible on their plan.

**Pros:** Brian can still use Acuity's interface for event management. Preserves existing Squarespace integration for event listings.

**Cons:** Still requires Acuity API access (the Sprint 0 risk). Adds complexity — now we're syncing TO Acuity instead of FROM it, but it's still two systems. More code to maintain.

**Effort estimate:** ~55-70 hours (slightly less than original PRD because the flow is cleaner, but adds the Acuity sync layer).

---

### Option 3: Webhook-Based Auto-Cancel (Fallback)

**What it is:** Keep Acuity in the booking flow as-is. Listen for `appointment.scheduled` webhook. Start a payment timer. If no Stripe payment within X minutes, auto-cancel the Acuity booking and notify the user.

**When to choose this:** Only if Brian insists on keeping Acuity as the primary registration interface AND Option 1 is rejected.

**Cons:** There's still a window where unpaid bookings exist. UX is worse (user thinks they booked, then gets cancelled). Doesn't match Brian's stated preference. Still has the two-system reconciliation complexity.

**Effort estimate:** ~65-85 hours (same as original PRD, plus auto-cancel logic).

---

### Option 4: Keep Current Payment-First Flow (Already Live)

**What it is:** Stripe payment first, then Acuity registration. Already deployed and working.

**When to choose this:** Only as a stopgap if March timeline pressure requires it while Option 1 is being built.

**Cons:** Brian called this "unnatural." Users pay before providing any information.

---

## Recommended Architecture: Option 1

```
[Squarespace Event Page]
        |
        | "Register Now" link
        v
[Custom Registration Form]  ← hosted on Vercel → justloveforest.com
  - Name, email, phone
  - Dietary restrictions
  - Accommodation preference
  - Waiver acceptance
  - Event-specific questions
        |
        | Form submit → save to PostgreSQL (status: PENDING_PAYMENT)
        v
[FastAPI Backend]
        |
        | Create Stripe Checkout Session
        | (client_reference_id = intake record ID)
        | (pay-what-you-want + tax calculation via Stripe)
        v
[Stripe Checkout Page]  ← Brian's current Stripe page, unchanged
        |
        | checkout.session.completed webhook
        v
[FastAPI Backend]
        |
        | Update record → COMPLETE
        | Send confirmation email
        | Update dashboard in real-time
        v
[PostgreSQL Database]  ← single source of truth
        |
        ├── [Operator Dashboard] (Brian/Naveed)
        ├── [Co-Creator Portal] (read-only, magic link)
        ├── [Automated Reminders] (Twilio SMS + email)
        └── [Logistics Summary] (tent counts, dietary, headcount)
```

---

## Revised Roadmap

### Status Overview

This is a **new roadmap** reflecting the architectural pivot from "bridge two systems" to "single-system registration flow." The timeline accounts for Brandon's current constraints (4 interviews, travel Friday, March events approaching).

### Phase 1: Foundation + Registration Flow (Week of Feb 23 — Mar 2)

| Item | Description | Status | Owner | Dependencies |
|---|---|---|---|---|
| **Confirm architecture with Brian & Naveed** | Present Option 1 vs. Option 2. Get buy-in on dropping Acuity from the booking path | **Not Started** | Brandon | None — this is the go/no-go gate for everything |
| **Send PRD v2 + this analysis** | Share both documents for review before next call | **Not Started** | Brandon | None |
| **Set up dev environment** | FastAPI project, PostgreSQL on Railway/Supabase, Stripe test mode, CI/CD | **Not Started** | Brandon | Architecture decision |
| **Build registration form** | Custom intake form matching Acuity's current fields + waiver | **Not Started** | Brandon | Dev environment |
| **Stripe Checkout integration** | Create Checkout Sessions from form submissions, handle webhooks | **Not Started** | Brandon | Dev environment, Stripe API key |
| **Database schema** | Events, Attendees, Attendee_Events (simplified from PRD — no matching engine needed) | **Not Started** | Brandon | Architecture decision |

**Milestone:** Attendee can register and pay in a single flow, with data in PostgreSQL. *This alone solves the #1 problem.*

### Phase 2: Dashboard + Operator Tools (Week of Mar 2 — Mar 9)

| Item | Description | Status | Owner | Dependencies |
|---|---|---|---|---|
| **Operator dashboard** | Event overview, attendee list, payment status, accommodation/dietary breakdown | **Not Started** | Brandon | Phase 1 complete |
| **Event management UI** | Brian can create/edit events, set pricing model, configure registration fields | **Not Started** | Brandon | Phase 1 complete |
| **Attendee search + filtering** | Search by name/email, filter by status/event/accommodation | **Not Started** | Brandon | Dashboard |
| **CSV export** | Per-event export for offline/field use | **Not Started** | Brandon | Dashboard |

**Milestone:** Brian can see all event data in one place. No more spreadsheet reconciliation.

### Phase 3: Automation + Portal (Week of Mar 9 — Mar 16)

| Item | Description | Status | Owner | Dependencies |
|---|---|---|---|---|
| **Automated email reminders** | Configurable reminders for PENDING_PAYMENT records | **Not Started** | Brandon | Phase 1 |
| **Co-creator portal** | Read-only, event-scoped view with magic link auth | **Not Started** | Brandon | Phase 2 |
| **Day-of SMS** | Twilio integration for logistics notifications to COMPLETE attendees | **Not Started** | Brandon | Phase 1, Twilio setup |
| **Manual overrides** | Mark as paid (cash/comp), add walk-ins, edit attendee data | **Not Started** | Brandon | Phase 2 |

**Milestone:** Full MVP. Co-hosts are self-service. Reminders are automated.

### Phase 4: Hardening + Migration (Week of Mar 16 — Mar 23)

| Item | Description | Status | Owner | Dependencies |
|---|---|---|---|---|
| **Parallel testing** | Run alongside current workflow for 1-2 live events | **Not Started** | Brandon + Brian | Phase 3 |
| **Squarespace integration** | Update event pages to link to custom registration form | **Not Started** | Brian | Phase 1 tested |
| **SOP documentation** | Operating procedures for Brian, Naveed, co-hosts | **Not Started** | Brandon | Phase 3 |
| **Domain migration** | Move from Vercel staging to justloveforest.com | **Not Started** | Brandon + Brian | Parallel testing passed |

**Milestone:** Production-ready. Zapier decommissioned.

---

### Risks and Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| **Brian/Naveed reject dropping Acuity from the booking flow** | High — forces fallback to Option 2 or 3, which are more complex | Present the argument clearly. Option 2 (hybrid with Acuity sync) is a viable fallback |
| **Brandon's availability (interviews + travel)** | Medium — could slow Phase 1 | Front-load architecture decision this week. Phase 1 coding can happen in focused bursts |
| **March event timeline pressure** | Medium — first March event may arrive before Phase 2 | Option 4 (current payment-first flow) is already live as a stopgap. Dashboard can come after |
| **Squarespace event page updates** | Low — Brian needs to update links | Simple — just change the "Register" button URL |
| **Stripe API key / account access** | Low — but blocking if not provided | Brandon needs Stripe test-mode API keys from Brian |

### Changes From Previous Roadmap (PRD v2)

| What Changed | Before | After | Why |
|---|---|---|---|
| **Core architecture** | Bridge Acuity + Stripe via webhooks + matching engine | Single-system: custom form → Stripe → PostgreSQL | Eliminates root cause instead of treating symptoms |
| **Acuity integration** | Must-Have (FR-01, FR-02) | Optional sync (nice-to-have) | Acuity is not needed in the booking flow |
| **Matching/reconciliation engine** | Must-Have (FR-03, FR-05, FR-06) | Eliminated | No two systems to reconcile |
| **Estimated effort** | 63-82 hours | 45-60 hours | Less code — no matching engine, no Acuity webhooks |
| **Sprint 0 risk** | Acuity API access (go/no-go) | None — Acuity API not needed for critical path | De-risked the entire project |
| **PENDING_PAYMENT handling** | Strategic disagreement (capture vs. eliminate) | Both — captured for outreach, auto-expires for clean state | Resolves the Brian vs. Brandon disagreement |

---

## Open Questions for Brian & Naveed

1. **Are you open to dropping Acuity from the registration flow?** This is the key decision. The custom form + Stripe approach solves every problem discussed in both meetings, with less complexity and lower effort. Acuity can still be used for other things (event calendar on the Squarespace site, etc.) — it just wouldn't be in the payment/registration path.

2. **What intake fields do you currently collect?** I need the exact list of Acuity intake form questions to replicate them in the custom form. Screenshots or a list would be perfect.

3. **How do you currently create events?** If we drop Acuity from the booking flow, you'll create events in the ERP dashboard instead. Is that acceptable, or do you need to keep creating them in Acuity?

4. **Squarespace event pages:** How are events currently listed on justloveforest.com? Can you simply change where the "Register" button points, or is it more deeply embedded?

5. **Co-host payment visibility:** Should co-hosts see actual payment amounts, or just paid/not-paid status?

6. **First March event date:** What's the hard deadline? This determines whether we need Option 4 (current flow) as a stopgap.

---

## Summary: Why This Is Better

The original approach tried to **bridge** two systems that don't talk to each other. Every option in my previous analysis was a variation of "how do we make Acuity and Stripe cooperate?" But the entire reason we're building a custom ERP is that these systems *can't* cooperate in the way JLF needs.

The revised approach **eliminates the bridge problem** by removing one side of it. Stripe stays (non-negotiable — taxes, variable pricing). Acuity leaves the booking flow (it was never designed for group event registration with external payment anyway). The custom ERP absorbs the one thing Acuity was actually providing: intake forms.

The result is a simpler system, less code, fewer failure modes, lower effort, no API access risk, and — most importantly — exactly the UX Brian described wanting: intake → payment → done, atomically, with no break in the chain.

---

## Research Sources

- [Stripe Checkout Custom Fields — Max 2 fields](https://docs.stripe.com/payments/checkout/custom-fields)
- [Stripe Metadata — Up to 50 key-value pairs per object](https://docs.stripe.com/metadata)
- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe Registration Form with Payment Guide](https://stripe.com/resources/more/registration-form-with-payment-101-what-they-are-and-how-to-use-them)
- [Acuity Scheduling Features](https://acuityscheduling.com/features)
- [Acuity Intake Forms & Agreements](https://help.acuityscheduling.com/hc/en-us/articles/16676931038093-Client-intake-forms-and-agreements-in-Acuity-Scheduling)
- [Acuity API Developer Docs](https://developers.acuityscheduling.com/)
- [Acuity Custom CSS & API Access — Requires Premium/Powerhouse](https://help.acuityscheduling.com/hc/en-us/articles/16676949253389-Using-custom-CSS-and-APIs-with-Acuity-Scheduling)
- [FastAPI + Stripe + Next.js Integration Pattern](https://devdojo.com/question/how-integrate-stripe-payments-in-farm-fastapi-reactnext-js-stack)
- [Vercel + Next.js + Stripe Checkout Guide](https://vercel.com/kb/guide/getting-started-with-nextjs-typescript-stripe)
