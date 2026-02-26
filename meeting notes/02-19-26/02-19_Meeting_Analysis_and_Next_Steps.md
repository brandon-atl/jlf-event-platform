# 02-19 Meeting Analysis: Requirements, Proposed Solutions, and Next Steps

**Prepared by:** Brandon James Abbott
**Date:** February 23, 2026
**Meeting Date:** February 19, 2026
**Participants:** Brandon A., Brian Y., Naveed N.

---

## Meeting Summary

The 02-19 weekly meeting focused on three areas: reviewing the ERP dashboard mockup, discussing the payment-registration workflow problem, and aligning on hosting/deployment strategy. Brian and Naveed expressed strong appreciation for the mockup and PRD work, calling it a potential "night and day difference." The bulk of the meeting centered on the **core pain point**: users registering for events without completing payment, and how to architecturally prevent that from happening.

---

## Requirements Gathered

### R1: Payment Must Gate Booking Completion (Critical — Consensus)

Brian and Naveed were clear and aligned: **a booking should not exist in the system unless payment has been received.** Brian used the Hilton hotel analogy — if you abandon the page before paying, you don't have a reservation. Naveed reinforced that data shouldn't even enter the system unless both conditions (registration + payment) are met.

The current interim workaround (payment-first via Stripe, then redirect to Acuity registration) works but feels "unnatural" to Brian. The ideal UX is intake-first, payment-second — but with the hard guarantee that no booking is finalized without payment.

### R2: Ideal User Flow (Stated Preference)

1. User fills out Acuity intake form (name, dietary preferences, waivers, etc.)
2. Instead of "Book Class," the button says "Submit Payment"
3. User is redirected to the Stripe payment page (current Stripe page is well-liked)
4. Payment confirmation completes the booking
5. If the user abandons at any point before payment, **no booking exists**

### R3: Dashboard and Data Tracking (Confirmed)

The dashboard mockup was well-received. The team confirmed they want real-time visibility into event registrations, payment status, accommodation, and dietary data — all pulled from Acuity and Stripe APIs into the PostgreSQL backend.

### R4: Automated Reminders for Incomplete Registrations (Discussed)

Brandon proposed Twilio-based automated text reminders for attendees who register but haven't paid (e.g., 3 days before the event). Brian acknowledged this is useful but secondary to solving the core payment-gating problem. There's a **strategic disagreement** here: Brandon sees value in capturing incomplete registrations for outreach; Brian wants to eliminate the scenario entirely so he doesn't have to worry about it.

### R5: Hosting Strategy (Agreed)

The team agreed on a phased approach: host on Vercel initially for rapid development and iteration, then migrate to the justloveforest.com domain with a login page once the product is stable.

---

## Research Findings: Solving the Payment-Gating Problem

I researched the Acuity Scheduling API, Stripe integration options, and the Squarespace/Acuity embedded platform constraints. Here are four viable approaches, ranked by recommendation.

### ~~Option A: Use Acuity's Built-In Payment Requirement with Stripe~~ — NOT VIABLE

**What it is:** Acuity natively supports requiring full payment or a deposit at booking time when connected to Stripe.

**Why it doesn't work for JLF:** Brian was explicit in the 01-30 initial meeting about two hard blockers:

1. **Tax handling:** Stripe automatically calculates and remits taxes. Acuity's native payment does not. Brian described this as a "huge perk" at their current size — taxes are handled in the background without him ever thinking about it. This is non-negotiable.
2. **Variable pricing / pay-what-you-want:** JLF has "so many events where you type in what you want to pay." Acuity's embedded-in-Squarespace version only supports a single fixed price per appointment type. Brian said if he had to create separate Acuity links for every pricing variant, "I would just do that all day long." Stripe handles this seamlessly with its payment page.

Brian has Acuity's payment amount set to $0 specifically because of these limitations. This is a **confirmed dead end** — not a hypothesis to test.

**Verdict:** Not viable. Do not spend time testing this.

### Option B: Custom Booking Frontend via Acuity API (PRIMARY RECOMMENDATION)

**What it is:** Build a custom booking page that replaces Acuity's embedded scheduler. The custom page collects intake form data, then processes Stripe payment, then creates the Acuity appointment via the API — all in one atomic flow. No booking is created until payment succeeds.

**How it works:**

1. Custom web form collects all intake data (mirroring Acuity's intake forms)
2. On submit, the form processes Stripe payment via Stripe Checkout or Elements
3. On successful payment, the backend creates the Acuity appointment via `POST /appointments` API
4. If payment fails or is abandoned, no Acuity record is created
5. Webhooks from both systems still feed the ERP dashboard

**Pros:** Complete control over UX and flow. Payment is truly atomic with booking. Matches Brian's ideal flow exactly (intake → payment → done). No "break in the chain."

**Cons:** Requires Acuity Premium/Powerhouse plan for API access. More development effort (~10-15 additional hours). Must replicate Acuity's intake form fields in the custom UI. Acuity's embedded-in-Squarespace tier may have API limitations (this was already flagged as a Sprint 0 risk in the PRD).

**Important note:** Acuity's API does NOT support cross-origin requests — all API calls must go through a server-side backend, which aligns with the FastAPI architecture already planned.

### Option C: Webhook-Based Auto-Cancel (Fallback)

**What it is:** Keep the current Acuity booking flow, but listen for the `appointment.scheduled` webhook. When a booking is created, start a timer. If no matching Stripe payment is received within X minutes, automatically cancel the Acuity appointment via the API and notify the user that their booking was not completed because payment was not received.

**Pros:** Doesn't require changing the booking UI at all. Uses existing Acuity + Stripe webhook infrastructure already in the PRD. Relatively low effort (~5-8 hours).

**Cons:** There's a window (however brief) where an unpaid booking exists. Slightly worse UX — the user thinks they booked, then gets a cancellation. Doesn't match Brian's stated preference for "no booking without payment."

**Verdict:** Good fallback if API access is limited, but not ideal.

### Option D: Reverse the Flow (Current Interim — Already Live)

**What it is:** This is what Brian has already implemented: Stripe payment first, then redirect to Acuity for registration. Payment is guaranteed before registration.

**Pros:** Already working. Payment is guaranteed.

**Cons:** Brian described this as "unnatural" and not a good user experience. Users are asked to pay before they even provide their name or preferences.

---

## Recommended Path Forward

**Option A (Acuity native payment) is confirmed not viable** — Brian was explicit in the 01-30 meeting that Acuity cannot handle tax calculation or JLF's variable/pay-what-you-want pricing. Stripe is non-negotiable for payment processing. This narrows the decision tree.

**Step 1 (Critical — Sprint 0):** Validate Acuity API access on JLF's current Squarespace/Acuity embedded plan. This was already a Sprint 0 task in the PRD. JLF is on the embedded Acuity-within-Squarespace tier (confirmed in 01-30 meeting), and API access may require an upgrade to Premium or Powerhouse. This is the single biggest go/no-go gate.

**Step 2 (if API access is available):** Proceed with **Option B — custom booking frontend**. This is the recommended path. It gives Brian the exact UX he wants (intake → Stripe payment → booking created atomically) while keeping Stripe for taxes and variable pricing.

**Step 3 (if API access is limited):** Fall back to Option C (webhook-based auto-cancel) as a practical compromise, or continue with Option D (current payment-first flow) while building the ERP dashboard for everything else.

**Regardless of which booking flow option is chosen:** The ERP dashboard, webhook-driven reconciliation, automated reminders, co-host portal, and logistics views all remain valuable and should proceed as planned in the PRD.

---

## Updated Action Items

| # | Action Item | Owner | Priority | Notes |
|---|------------|-------|----------|-------|
| 1 | ~~Test Acuity native payment~~ — NOT VIABLE | — | — | Brian confirmed in 01-30 meeting: no tax calc, no variable pricing |
| 2 | Validate Acuity API access on JLF's Squarespace plan | Brandon | **Critical** | Go/no-go gate for Option B. JLF is on embedded Acuity-in-Squarespace tier |
| 3 | Send PRD v2 document to Brian and Naveed | Brandon | High | Was discussed but never shared during the call |
| 4 | Design the custom booking flow (Option B) if needed | Brandon | Medium | Only if Option A doesn't work and API access is confirmed |
| 5 | Outline Twilio integration for automated payment reminders | Brandon | Medium | Secondary to solving the payment-gating problem |
| 6 | Resolve strategic question: capture incomplete registrations or not? | All | Medium | Brandon sees value in the data; Brian wants to eliminate the scenario |
| 7 | Share updated game plan with Brian and Naveed | Brandon | High | After completing items 1-2 |

---

## Open Questions for Brian & Naveed

1. **Acuity plan tier:** Which specific Acuity/Squarespace plan is JLF currently on? We confirmed in the 01-30 meeting that it's the embedded Acuity-within-Squarespace version. API access requires Premium or Powerhouse. If an upgrade is needed, the cost is almost certainly justified for this project — but we need to confirm the current tier.

2. **Pay-what-you-want specifics:** For donation-based events, is there always a minimum amount? Do some events have fixed prices while others are donation-based? (The PRD covers both models, but confirming how many of each type exist will help scope the custom booking form work.)

3. **Incomplete registration data:** Even if we enforce payment-before-booking, do you still want to know when someone *starts* a registration form and abandons it? This is possible with analytics but requires a different approach than capturing Acuity webhook data.

4. **Co-host payment visibility:** Should co-hosts see actual payment amounts, or just a paid/not-paid status? (This was an open question in the PRD and wasn't addressed in either meeting.)

5. **Timeline pressure:** March events are approaching. What's the minimum viable capability you need before the first March event? Is it just the dashboard for visibility, or does the payment-gating also need to be solved by then?

*Note: Tax handling question removed — Brian confirmed in the 01-30 meeting that Stripe handles tax calculation automatically and this is a hard requirement. Acuity's native payment is not an option.*

---

## PRD Impact Assessment

Based on this meeting, the PRD v2 is largely on track. The main updates needed:

- **Section 7.1 (Core Integration):** Add a new requirement for atomic payment-booking enforcement, not just reconciliation after the fact. The PRD currently assumes a two-step flow (pay separately, book separately, reconcile). Brian and Naveed want a single-step flow where booking cannot exist without payment.

- **Section 9.2 (System Flow):** May need to add a custom booking frontend component if Option B is chosen. The current flow assumes Acuity and Stripe operate independently with webhook-based reconciliation.

- **New requirement:** If Option B is pursued, the system needs to replicate Acuity's intake form fields in a custom UI and create Acuity appointments via API after Stripe payment succeeds.

- **Section 2.2 (Current Workflow):** Update to reflect that the current live flow is now payment-first (Stripe → Acuity), not registration-first as originally documented.

---

## Research Sources

- [Acuity Scheduling API Developer Docs](https://developers.acuityscheduling.com/)
- [Choosing How Clients Pay — Acuity Help Center](https://help.acuityscheduling.com/hc/en-us/articles/28051014042125-Choosing-how-clients-pay-for-appointments)
- [Pay-What-You-Want Pricing — Acuity Help Center](https://help.acuityscheduling.com/hc/en-us/articles/16676925130893-Offering-clients-pay-what-you-want-pricing)
- [Acuity Scheduling Redirect After Booking](https://conversiontracking.io/blog/acuity-scheduling-squarespace-how-to-redirect-after-booking)
- [Acuity JS SDK — GitHub](https://github.com/AcuityScheduling/acuity-js)
- [Custom CSS & APIs with Acuity — Help Center](https://help.acuityscheduling.com/hc/en-us/articles/16676949253389-Using-custom-CSS-and-APIs-with-Acuity-Scheduling)
- [Stripe Integration — Acuity](https://acuityscheduling.com/partners/stripe)
- [Acuity Webhooks Documentation](https://developers.acuityscheduling.com/docs/webhooks)
