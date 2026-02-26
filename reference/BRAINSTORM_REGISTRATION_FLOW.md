# JLF ERP — Registration Flow Brainstorm
_Generated 2026-02-25 by Echo, based on exploring justloveforest.com, all 4 registration flows, Acuity forms, Stripe checkouts, and Squarespace event pages._

---

## Current State: 4 Disconnected Registration Flows

### Flow 1: Form-First (Acuity → Stripe)
**Used for:** Forest Therapy days, Community Weekends (standard $125 events)
**URL:** remembernature.as.me (Acuity Scheduling)

**Steps:**
1. Select date/time on Acuity calendar
2. Fill intake form: name, phone, email, first-time story, dietary restrictions (Y/N + details), allergies (Y/N + details), medical conditions (Y/N + details), waiver checkbox, questions
3. Click "Continue to Payment" → Stripe checkout
4. Pay → confirmation email

**Data captured BEFORE payment:** ✅ Everything (dietary, allergies, medical, waiver, emergency contact)
**Risk:** Low — all data captured before money changes hands
**Issue:** Data lives in Acuity + Stripe separately, needs manual export/reconciliation

---

### Flow 2: Stripe-First (Fixed Price → Redirect to Form)
**Used for:** Emerging from Winter retreat ($250)
**URL:** buy.stripe.com/... 

**Steps:**
1. User clicks "Register" on Squarespace event page
2. Stripe checkout: email, full name, phone → pay $250
3. "You'll submit all your details on the next page after payment"
4. Redirect to intake form (Squarespace page? Acuity?)

**Data captured BEFORE payment:** Only email, name, phone
**Risk:** ⚠️ HIGH — if redirect fails or user closes browser after paying, you have a paid attendee with ZERO intake data (no dietary, no allergies, no waiver, no accommodation)
**Issue:** No guarantee form is completed; money-first creates orphaned payments

---

### Flow 3: Donation / Honor System (Stripe Custom Amount)
**Used for:** Satsang evenings, Community Weekend honor pricing
**URL:** book.stripe.com/...

**Steps:**
1. User clicks "Book" on event page
2. Stripe checkout: custom $ amount field (defaults to $0.00), email, phone only
3. "Book" → confirmation
4. No redirect to intake form observed

**Data captured:** Only email and phone — ❌ NO full name, NO dietary, NO accommodation, NO waiver
**Risk:** 🔴 CRITICAL — virtually no attendee data captured. Kitchen/logistics gets zero info.
**Issue:** Honor system means some pay $0, others pay $60. No way to track who paid what for which event.

---

### Flow 4: Accommodation-Tiered (Choose Accommodation → Stripe → Form)
**Used for:** Loving Awareness Retreat, multi-day retreats with tiered pricing
**URL:** justloveforest.com/lovingawareness → Stripe links

**Steps:**
1. User reads event page with accommodation descriptions
2. Clicks "Register for Self Camping ($150)" or "Register for Tipi Twin ($300)" or "Register for Canvas Bell Queen ($500)"
3. **⚠️ ALL 3 LINKS GO TO THE SAME STRIPE URL** — `book.stripe.com/6oU8...`
4. Stripe checkout: custom amount field, email, phone
5. "After payment, redirected to our website to confirm accommodation details, share food preferences, complete waivers"

**Data captured at payment:** Email, phone, custom amount — NO accommodation type distinction at checkout
**Risk:** 🔴 CRITICAL — can't tell what accommodation was selected from payment data alone
**Issue:** Stripe link is identical for all 3 options. Amount is custom/honor-based. Accommodation only captured IF the post-payment form redirect works.

---

## The Gap: What Gets Lost Between Systems

| Data Point | Acuity | Stripe | Squarespace | JLF ERP |
|---|---|---|---|---|
| Name | ✅ | ✅ (some) | ❌ | ✅ |
| Email | ✅ | ✅ | ❌ | ✅ |
| Phone | ✅ | ❌ (some) | ❌ | ✅ |
| Dietary | ✅ | ❌ | ❌ | ✅ |
| Allergies | ✅ | ❌ | ❌ | Partial |
| Medical | ✅ | ❌ | ❌ | ❌ |
| Waiver | ✅ | ❌ | ❌ | ✅ |
| Accommodation | ❌ | ❌ | ❌ | ✅ |
| Payment | ❌ (via Stripe) | ✅ | ❌ | ✅ (via Stripe) |
| Emergency Contact | ✅ | ❌ | ❌ | ✅ |

**The ERP's job is to consolidate ALL of this into one system.**

---

## Proposed Unified Flow (ERP replaces Acuity + direct Stripe links)

### For ALL event types:

```
justloveforest-events.vercel.app/register/[event-slug]
                      ↓
   ┌─────────────────────────────────────────┐
   │  1. SELECT ACCOMMODATION (if overnight) │
   │  ⛺ Bell Tent $500  🏕️ Tipi $300        │
   │  🌲 Self-Camping $150  📍 Day Pass $50  │
   └──────────────────┬──────────────────────┘
                      ↓
   ┌─────────────────────────────────────────┐
   │  2. INTAKE FORM (always required)       │
   │  Name, email, phone, dietary, allergies │
   │  Medical, emergency contact, waiver     │
   │  How heard, first time?, questions      │
   └──────────────────┬──────────────────────┘
                      ↓
   ┌─────────────────────────────────────────┐
   │  3. STRIPE CHECKOUT (embedded/redirect) │
   │  Amount auto-set from step 1            │
   │  OR custom amount (donation events)     │
   │  OR $0 (free events → skip this step)   │
   └──────────────────┬──────────────────────┘
                      ↓
   ┌─────────────────────────────────────────┐
   │  4. CONFIRMATION PAGE + EMAIL           │
   │  "You're registered! See you in the     │
   │   forest 🌲"                            │
   │  Calendar invite attached               │
   └─────────────────────────────────────────┘
```

### Pricing Model Handling:
- **Fixed price** → Accommodation selection sets the price, auto-passed to Stripe
- **Donation/honor** → Custom amount field after intake form, minimum $0
- **Tiered by accommodation** → Accommodation cards with suggested amounts, user can adjust
- **Free** → Skip Stripe entirely, register immediately after intake form

### Key Principle: **FORM FIRST, ALWAYS**
Never send someone to Stripe before capturing their intake data. The form data is more valuable than the payment — you need it for kitchen prep, safety, and logistics regardless of whether they pay.

---

## Dashboard Interface Improvements

### Quick Wins (PR #18 territory)

1. **Catering Summary should only count CONFIRMED attendees**
   - Currently counts dietary for all 15 (including expired/pending)
   - Kitchen only needs to prep meals for people who actually paid
   - Add "(confirmed only)" label to make it explicit

2. **Dietary drilldown should show NAMES**
   - Clicking "Vegetarian (4)" should show: Mara Chen, Juniper Hayes, Indigo Park, Lark Johansson
   - Brian needs this for meal planning / allergy notes

3. **"Needs Attention" banner for incomplete registrations**
   - If any complete registration is missing dietary or accommodation data → red banner
   - "2 confirmed attendees have missing intake data — follow up required"

4. **Registration source indicator**
   - Show whether each registration came from: ERP form, Stripe webhook, manual entry, walk-in
   - Helps Brian identify which platform each person used

5. **Export to CSV / Print for Day-of**
   - "Print Kitchen Sheet" → dietary breakdown with names
   - "Print Check-in Sheet" → name, accommodation, check-in status
   - "Export All" → full CSV download

### Medium Effort

6. **Public Registration Page**
   - Each event gets a public URL: `justloveforest-events.vercel.app/register/march-community`
   - Embeddable intake form + Stripe checkout
   - Replaces Acuity entirely for new events
   - Brandon can link this from Squarespace instead of Acuity/Stripe links

7. **Stripe Webhook Integration**
   - Auto-create registration when payment received
   - Auto-update status when refund processed
   - Reconcile orphaned payments (paid but no form data)

8. **Walk-in / Manual Registration**
   - "Add Attendee" button on dashboard for day-of walk-ins
   - Quick form: name, email/phone, accommodation, dietary
   - Can mark as "paid cash" or "pending payment"

9. **Accommodation Capacity Tracking**
   - Each event defines capacity per accommodation type (e.g., 4 bell tents, 6 tipis)
   - Dashboard shows "3/4 Bell Tents filled" with progress bar
   - Sold-out types are disabled on the registration form

10. **Email Notifications**
    - Confirmation email on registration (Resend, once DNS ready)
    - 48-hour reminder email before event
    - Post-event thank you + donation adjustment link (for honor system events)

### Bigger Ideas (Phase 2+)

11. **Replace Acuity Entirely**
    - The ERP's registration form IS the Acuity replacement
    - Calendar view of available dates
    - Automatic capacity management
    - Waitlist when sold out

12. **Attendee Portal**
    - Returning attendees can log in with email link (no password)
    - View their upcoming registrations, past events
    - Update dietary/medical info once (saved to profile, auto-fills future registrations)

13. **Co-Creator Dashboard**
    - Sitaram Dass, Christina, etc. can see attendee list for their specific events
    - Limited view: names, dietary needs, special notes
    - Can't see payment/financial data

14. **Analytics Over Time**
    - Revenue trends across events
    - Repeat attendee rate
    - Most popular accommodation types
    - Average registration lead time (how far in advance people register)

---

## Mapping Accommodation Types to Reality

| Real JLF Option | Current ERP Value | Notes |
|---|---|---|
| Canvas Bell Queen | `bell_tent` | Queen tempurpedic in canvas bell tent |
| Tipi Twin | `nylon_tent` | Twin mattress in tipi tent — should rename to `tipi_twin` |
| Self Camping | `self_camping` | BYO tent and sleeping gear |
| Day Pass / No Overnight | `none` | Legitimate for Community Weekends, Forest Therapy days |
| (future) Hermitage | `hermitage` | The site mentions hermitage stays |

**Recommendation:** Rename `nylon_tent` → `tipi_twin` to match actual site language. Consider making accommodation types configurable per event (admin can add/remove options).

---

## Priority Ranking

| # | Item | Effort | Impact | Priority |
|---|---|---|---|---|
| 1 | Catering counts confirmed-only | Low | High | 🔴 Now |
| 2 | Dietary drilldown shows names | Low | High | 🔴 Now |
| 3 | Export/print for day-of | Medium | High | 🟡 Soon |
| 5 | Public registration page | High | Very High | 🟡 Next sprint |
| 6 | Stripe webhook integration | Medium | Very High | 🟡 Next sprint |
| 7 | Rename nylon_tent → tipi_twin | Low | Medium | 🟢 Whenever |
| 8 | Walk-in registration | Low | Medium | 🟢 Whenever |
| 9 | Capacity tracking | Medium | High | 🟡 Soon |
| 10 | Email notifications (Resend) | Medium | High | 🟡 Soon (blocked on DNS) |
| 11 | Replace Acuity entirely | High | Transformative | 🔵 Phase 2 |
| 12 | Attendee portal | High | High | 🔵 Phase 2 |

---

_This document should be reviewed with Brian and Naveed to validate priorities against their actual operational pain points._
