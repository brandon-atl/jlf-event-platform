# Just Love Forest — Current System Audit

**Date:** 2026-02-26
**Source:** Squarespace/Acuity admin backend, Google Sheets, Google Docs, exported client CSV
**Purpose:** Document the existing Event Registration + Payment + Intake System to inform ERP migration

---

## 1. Main Site (justloveforest.com)

**Platform:** Squarespace
**URL:** https://www.justloveforest.com

### Site Structure
- **Home** — Hero section: "A 716 acre nature sanctuary in the Appalachian foothills of Poetry, Georgia." Founded 2020, rooted in Shinrin-yoku (forest bathing), inspired by Neem Karoli Baba and Ram Dass.
- **All Upcoming Experiences** (`/events`) — Main event catalog page
- **Retreats** (`/retreats`)
- **Ashram** (`/ashram`) — Bhakti Yoga and devotional practices
- **Green Burial Grounds** (`/greenburial`) — Perpetually protected under conservation easement
- **Hermitage** (`/hermitage`) — Solo retreat experiences
- **Gallery** (`/gallery`)
- **About** (dropdown)
- **Reviews** (`/reviews`)
- **Apply for Membership** (`/membership`) — Members can stay overnight outside scheduled gatherings
- **Just Love Gift Certificates** (`/gifts`)
- **Contact** (`/contact`)
- **Donations** button (`/donation`)
- **Newsletter** signup link (`/emailme`)

### Events Listed on /events Page
Upcoming events with Stripe payment links (some linked directly, some through Acuity):

| Event | Date | Price/Model | Accommodation Tiers |
|---|---|---|---|
| Community Weekend | Mar 21–23 | Donation-based (Friday/Saturday Day) + fixed (Saturday Night $50, Sunday Forest Therapy $125) | N/A (mixed overnight/day) |
| Hanuman Tuesday | Weekly (Tuesdays) | Donation-based | Day-only |
| 2026 Loving Awareness Retreat & Forest Sadhana | May dates | Tiered by accommodation | Bell Tent, Tipi Twin, Self-Camping |
| Ram Dass Evenings — Ashram Satsang Gathering | Recurring | Donation-based | Some overnight |
| Association of Nature & Forest Therapy Guides 7 Day Training | Specific dates | Fixed price ($125/session for forest therapy) | TBD |
| Song and Sound Circle | Recurring | Donation-based | Optional overnight |
| Forest Nurture Days | Recurring | $125 fixed | Day-only |
| Hermitage Experience | By application | $50 consultation + variable stay | Private, by approval |
| Community Weekend Saturday Service & Gardening Day | Recurring | Free/donation | Day-only |
| Intimacy & Connection Retreat | One-off | Fixed price | Accommodation tiers |
| Becoming the Forest: Green Burial Grounds | Recurring | Variable | Day-only |

**Key observation:** The `/lovingawareness` page has 3 Stripe accommodation links that ALL go to the same URL — can't distinguish accommodation type from payment alone. This was flagged in MEMORY.md.

---

## 2. Current Event Registration Intake System (Google Doc)

**Title:** "Event Registration, Payment, and Intake System — Problem Statement & Proposed Architecture"
**Access:** View-only for Brandon (owned by Brian/Bala)
**Shared with:** bala@justloveforest.com + 4 more

### Key Points from the Document

**Current Stack:**
- Acuity Scheduling → event registration, booking, waivers, intake forms
- Stripe → payments (taxable services + donations)
- Squarespace → public website
- Zapier + Google Sheets → bridges between systems

**Core Problem:** "Misalignment between booking, payment, and intake data across systems."

**Failure Modes:**
1. Someone books in Acuity but never pays
2. Someone pays via Stripe but never completes booking
3. Intake data exists in Acuity but is not visible or centralized
4. Event-specific questions differ across events, making spreadsheets fragile

**Implication:** This document was the original requirements spec that kicked off the JLF ERP project. It confirms the problem statement we're solving.

---

## 3. Event Types (Acuity Admin)

**URL:** `squarespace.com/config/scheduling/appointments.php?action=appointmentTypes`
**Account:** Apple User (brandon.atl@icloud.com)

### Active Appointment Types (14 types, organized by category)

| Category | Appointment Type | Duration | Price | Booking Link | Notes |
|---|---|---|---|---|---|
| *(uncategorized)* | Listening Session | 30 min | Free | remembernature.as.me/tribe | |
| *(uncategorized)* | Meditation Intro Call | 30 min | Free | remembernature.as.me/meditationcall | |
| *(uncategorized)* | Stewards of the Forest Volunteering Call | 30 min | Free | remembernature.as.me/stewardsoftheforest | |
| *(uncategorized)* | Three Day Silent Meditation Retreat Call | 30 min | Free | remembernature.as.me/slience | Note: typo in URL "slience" |
| *(uncategorized)* | 2026 Loving Awareness Retreat & Forest Sadhana with Sitaram Dass | 30 min | Free | remembernature.as.me/forestsadhana | Pre-approved applicants only |
| *(uncategorized)* | 2026 Loving Awareness Retreat | 30 min | Free | remembernature.as.me/?appointmentType=87061760 | Post-payment intake form |
| *(uncategorized)* | Hanuman Tuesday | 8 hrs | Free | remembernature.as.me/?appointmentType=88370751 | Recurring weekly, group class |
| *(uncategorized)* | ANFT 7 Day Training | 30 min | Free | remembernature.as.me/ANFT | |
| Becoming the Forest | "Becoming the Forest": Visiting Green Burial Grounds | 5 hrs | Free | *(via category link)* | |
| Community Weekend | Community Weekends at Just Love 💚 | 24 hrs | Free | *(via category link)* | |
| Drum Circle | Song and Sound Circle | 30 min | Free | *(via category link)* | |
| Forest Therapy | Forest Nurture Days | 30 min | **$125** | *(via category link)* | Only priced Acuity type |
| Hermitage | Hermitage Experience Consultation | 1 hr | **$50** | *(via category link)* | |
| Hermitage | Hermitage Experience Registration | 30 min | Free | *(Private — invite only)* | |
| Meditation | Ram Dass Evenings — Ashram Satsang Gathering | 14 hrs | Free | *(via category link)* | |
| Membership | Membership Call | 30 min | Free | *(via category link)* | |
| Service Day | Community Weekend Saturday Service & Gardening Day | 6 hrs | Free | *(via category link)* | |
| Special Retreat | Intimacy & Connection Retreat | 1 min | Free | *(via category link)* | Duration set to 1 min (placeholder) |

### Inactive/Archived Types ("Classes Not Offered") — 30+ types

Includes historical events no longer active:
- First Class Type (default), Tribe Informational Session, Test (private)
- Waitlist for mini retreat option (private)
- Bhakti Mountain Mantra Magic Full Retreat (x2 duplicates)
- Winter Solstice Experience
- Forest Guardians Service Days
- Just Love Green Burial Call
- Just Love Co-op Call (Round 1 & 2)
- Solar Education Weekend
- Dharamshala Info Session
- Living From the Heart Retreat
- Intro to Loving Awareness (online)
- 1 Night Gathering, 1 Night Gathering Dieta Opening (private)
- 2 Night Gathering (private), 2 Night Gathering Dieta Closing (private)
- 3 Night Gathering (private)
- "Becoming the Forest" (older version)
- Climate in Community ($375 — old pricing)
- Climate In Community (no price — separate listing)
- Dieta (private)
- Just Love Forest Friendsgiving
- Self Love Day Retreat & Sound Bath
- Special Nature Therapy Day: Wild Flowers
- Special Nature Therapy Day: Nature Art Experience
- Fall Foraging
- Spring Equinox Forest Therapy & Cacao ($125)
- Green Burial Cemetery Visitation Day
- Green Burial 101: Virtual Tour
- Ram Dass Summer Camp (Wed-Fri $40, Saturday Daytime $125, Hosted Weekend $250, Self Camp Weekend $175/$150)
- Sacred Community Project (Double & Single Occupancy)
- Retreat Weekend (private)
- Return to Vastness: Mini Vision Quest
- Somatic Healing Retreat
- Self Love Day Retreat
- Love Your Food, Love Yourself
- Winter Lodge Gathering
- 2 Day Deep Forest Immersion: Fall Edition
- Claiming the Crone

**Key observation:** Most events are set to "30 min" or "1 hr" as placeholder durations — Acuity treats them as scheduling appointments, not multi-day events. The actual event duration is described in event descriptions, not the Acuity duration field. Only Forest Nurture Days ($125) and Hermitage Consultation ($50) have Acuity-native pricing; all others collect payment through Stripe separately.

### Booking Preview (Public Scheduler)

**URL:** `remembernature.as.me/schedule/8bc0c6f4`

Lists all currently active appointment types in a single public-facing scheduler. Users see:
- Event name + description
- "Book" button per event
- No pricing shown in scheduler (payment happens elsewhere)

### Hanuman Tuesday Booking Preview

**URL:** `remembernature.as.me/schedule/8bc0c6f4/?appointmentTypeIds[]=88370751`

- Shows upcoming Tuesday dates (Mar 3, Mar 10, Mar 24, etc.)
- Each shows "10:00 AM" start time
- Quantity picker (default: 1)
- Timezone selector (Eastern Time GMT-05:00)
- "More times" button available
- This is the only recurring "group class" type — all others are 1:1 appointment style

**Key observation:** Acuity's group class model works well for Hanuman Tuesday's recurring weekly pattern. Our system needs to replicate this: show all upcoming dates → pick one → register.

---

## 4. Intake Forms (Acuity Admin)

**URL:** `squarespace.com/config/scheduling/forms.php`
**Total forms:** 30 custom intake forms

### Form Inventory

#### Currently Active (attached to active appointment types)

| Form Name | ID | Status | Likely Attached To |
|---|---|---|---|
| Community Weekend Sign Up | 2878738 | Showing | Community Weekends |
| Are you staying overnight? | 3171079 | Showing | Multiple overnight events |
| 2026 Loving Awareness Retreat Registration Options | 3137158 | Showing | Loving Awareness Retreat |
| Intimacy retreat: Your accommodation selection | 3160882 | Showing | Intimacy & Connection Retreat |
| Hermitage Application | 3151610 | Showing | Hermitage Experience |
| ANFT Accommodations | 3173555 | Showing | ANFT 7 Day Training |
| Sharing the stories of our time together | 2954804 | Showing | Multiple events (media consent) |

#### Reusable/Standard Forms (used across many events)

| Form Name | ID | Purpose |
|---|---|---|
| Wellbeing check-in | 2067147 | Health/wellness intake |
| Dietary commitments agreement | 2266775 | Food prep requirements |
| Dietary Considerations and Allergy Information | 2291559 | Allergies + dietary needs |
| Community Well-being and Safety Understanding | 2266765 | Safety waiver/acknowledgment |
| Health and Safety Disclosure | 2578927 | Medical disclosure |
| First time joining us? | 2578463 | New attendee onboarding |
| Questions, Concerns & Thoughts | 2291567 | Open-ended feedback |
| Self Camping Arrangements | 2356486 | Self-camping logistics |
| Arrival and Departure Dates and Times | 2349137 | Travel logistics |
| Carpooling, Parking and Vehicle Type | 2358019 | Transportation |
| Your overnight stay options | 2347472 | Accommodation selection (generic) |
| Preferred mattress size for the sheets you'll bring | 2347461 | Bedding logistics |
| Food and beverage on-site | 2358254 | Meal preferences |
| Potluck planning | 2513642 | Potluck coordination |
| Payment | 2578488 | Payment info/confirmation |
| Options for your retreat | 2579819 | Generic retreat options |

#### Event-Specific Legacy Forms (mostly for past events)

| Form Name | ID | For Event |
|---|---|---|
| 2026 Sacred Community Project | 3105061 | Not showing (hidden) |
| ADD LUNCH FOR $25 | 2513851 | Not showing (hidden) |
| Becoming the Forest Sliding Scale Payment Options | 2676576 | Green Burial events |
| 2025 Ram Dass Summer Camp: Options for your stay | 2954800 | Past event |
| Chant for Love: Options for your stay | 2790855 | Past event |
| Chant for Love Liability Waiver | 2907502 | Past event |
| Chant for Love Media Consent | 2907505 | Past event |
| Getting to know you for Spring's Wild Reawakening | 2825228 | Past event |
| Claim the Crone - Options for Your Retreat | 3039268 | Past event |
| Sacred Community Project: Double Occupancy Roommates | 2577836 | Past event |
| Sound and Song: Are you staying overnight? | 2513639 | Song Circle |
| DAY PASS Food and beverage on-site | 2446058 | Day events |
| Shamanism 101 Sobriety and Participation agreement | 2424451 | Past event |
| Steward's Carnival Arrival Times | 2356516 | Past event |
| Stewards of the Earth Call Questions | 2302417 | Stewards volunteering |
| Stewards of the Earth Overnight Meditation Experience | 2310652 | Past event |
| Stewards of the Forest | 2303240 | Volunteering |
| Your overnight stay options for Living from the Heart | 3088845 | Past event |

### Form Pattern Analysis

**Common form sequences per event type:**

1. **Overnight Retreat (e.g., Loving Awareness):**
   - First time joining us? → Accommodation selection → Dietary Considerations → Arrival/Departure → Carpooling → Wellbeing check-in → Health & Safety Disclosure → Community Well-being & Safety → Media consent

2. **Community Weekend:**
   - Community Weekend Sign Up → Are you staying overnight? → (if yes: overnight options) → Dietary/Food → Potluck planning

3. **Day Event (e.g., Forest Nurture, Becoming the Forest):**
   - Dietary Considerations → Carpooling → (sometimes: DAY PASS Food)

4. **Recurring/Simple (e.g., Hanuman Tuesday, Song Circle):**
   - Minimal or no intake forms — just name/email/phone (Acuity defaults)

**Key insight for form builder:** The system needs ~6 reusable "template blocks" that get composed differently per event:
1. **Accommodation** (overnight options, mattress size, self-camping details)
2. **Dietary** (dietary restrictions, allergies, food commitments, meal preferences)
3. **Travel** (arrival/departure, carpooling, vehicle type)
4. **Health/Safety** (wellbeing check-in, health disclosure, safety understanding)
5. **Logistics** (first timer?, potluck, day pass food)
6. **Legal** (liability waiver, media consent, sobriety agreement)

---

## 5. Registration Sheet (Google Sheets)

**Title:** "Community Weekend Registrations"
**URL:** Google Sheets (shared with bala@justloveforest.com + 4 others)
**Last edited:** 2 days ago by James Bala Yancey

### Sheet Tabs (6 event-specific tracking sheets)

| Tab Name | Event Type | Notes |
|---|---|---|
| Community Weekends | Monthly community weekends | Primary tracking — most active |
| Ram Dass Evenings | Ashram satsang gatherings | |
| Saturday Service | Service & Gardening Day | |
| Song Circle | Sound and Song Circle | |
| Forest Nurture | Forest Nurture Day ($125) | |
| Becoming Forest | Green Burial Experience | |

**Key observation:** This is the "database" — Brian manually tracks registrations here. It bridges the gap between Acuity intake data and Stripe payments. This is the exact workflow our ERP replaces.

**Pain point (from meeting transcript):** Brian has to manually copy data between Acuity, Stripe, and this spreadsheet. Names from Stripe billing don't always match attendee names. Couple registrations create extra manual work.

---

## 6. Attendee Management List (Acuity Client Export)

**Export Location:** `/Users/brandonabbott/Projects/jlf-event-platform/reference/JLF_Client_List.csv`

### Data Structure

| Column | Type | Notes |
|---|---|---|
| First Name | Text | |
| Last Name | Text | |
| Phone | Text | Format varies: (xxx) xxx-xxxx, '+1xxxxxxxxxx |
| Email | Text | Primary identifier |
| Notes | Text | Free-text admin notes (mostly empty) |
| Days Since Last Appointment | Number | Engagement metric |

### Statistics
- **Total clients:** 601
- **Data quality issues:**
  - Phone format inconsistent (some with country code prefix '+1, some (xxx) format)
  - Some entries have names in wrong fields (e.g., "Mira Joleigh" in First Name, "& Alex Himes" in Last Name — couple registration)
  - Nivay (co-founder) listed as "Nivay 211" first name, "743" last name
  - Notes column mostly empty

### Notable Entries
- Brandon Abbott — brandon.atl@icloud.com, 320 days since last appointment
- Nivay — nivay@justloveforest.com, 12 days since last appointment (active admin)

---

## 7. Acuity Client List (Admin View)

**URL:** `squarespace.com/config/scheduling/admin/clients`

The admin interface shows the same data as the CSV export, plus:
- Import/Export functionality
- Search/filter by name or email
- Click-through to individual client records (appointment history, intake responses)

---

## Summary: Current System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Squarespace │────▶│    Acuity     │────▶│   Zapier    │
│  (Website)  │     │ (Scheduling) │     │  (Bridge)   │
│             │     │              │     │             │
│ Event pages │     │ • Booking    │     │ • Triggers  │
│ → Stripe    │     │ • Intake     │     │ → Sheets    │
│   links     │     │ • Waivers    │     │             │
└──────┬──────┘     └──────────────┘     └──────┬──────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐                          ┌─────────────┐
│   Stripe    │                          │   Google    │
│ (Payments)  │  ← NO RELIABLE LINK →   │   Sheets   │
│             │                          │ (Manual DB) │
│ • Checkout  │                          │             │
│ • Donations │                          │ 6 tabs      │
│ • Taxes     │                          │ 601 clients │
└─────────────┘                          └─────────────┘
```

### Critical Gaps (what our ERP fixes)

| Gap | Current State | ERP Solution |
|---|---|---|
| Payment ↔ Booking sync | Manual. Someone can pay without booking or book without paying. | Single registration flow: form → Stripe → confirmed |
| Intake data centralization | Scattered across Acuity forms, Stripe metadata, Google Sheets | PostgreSQL with structured intake_data JSONB |
| Multi-guest registration | Person A registers, Brian manually emails Person B for separate waiver | Group registration with per-person form pages |
| Financial reconciliation | Phone photos of receipts → manual spreadsheet → Venmo splits | Expense upload → automated split calculation |
| Headcount accuracy | Manual spreadsheet cross-reference | Real-time dashboard with confirmed-only counts |
| Communications | Manual text/email, no threading | Twilio two-way SMS + Resend branded emails |
| Recurring event scheduling | Acuity group class model (works for Hanuman Tuesday only) | Recurring event date picker for all event types |
| Composite events | Community Weekend is one "24 hr" booking — can't track sub-event attendance | Sub-event model with per-component pricing + headcount |

### Migration Data Available

| Source | Records | Migration Path |
|---|---|---|
| Acuity Client List (CSV) | 601 contacts | Import as `attendees` table seed |
| Google Sheets (6 tabs) | Variable per tab | Import as historical `registrations` |
| Acuity Intake Forms (30 forms) | Form definitions | Recreate as `form_templates` |
| Stripe Transaction History | Full payment records | Link via email/Stripe customer ID |

---

## 8. Post-Booking Confirmation Experience (Test Booking — 2026 Loving Awareness Retreat)

**Tested:** 2026-02-26, via browser relay (Brandon booked a test registration)
**URL:** `remembernature.as.me/schedule/8bc0c6f4/confirmation/...?appointmentTypeIds[]=87061760`

### What the User Sees After Booking

1. **"Appointment Confirmed"** header with green checkmark
2. **Personalized greeting:** "asdf, your class is confirmed!" (uses first name from form)
3. **Event details card:**
   - Event: "2026 Loving Awareness Retreat with Just Love Forest"
   - Date/Time: Friday, March 20th, 2026 at 3:00 PM
   - Location: 📍 "Directions to Just Love Forest will be sent."
4. **Calendar integration buttons:**
   - "Add to iCal / Outlook"
   - "Add to Google"
5. **Self-service action buttons:**
   - "Edit Info" — lets attendee update their form responses
   - "Cancel" — requests cancellation (notifies admin, doesn't auto-cancel per Brian's preference)
6. **Custom confirmation message:**
   > "You're all set. Everything is complete, and we have what we need to welcome you with care and intention."
   > "Thank you for taking the time to share your preferences and complete the details. We'll be in touch soon with any final reminders as your time in the forest approaches."
   > "We're really looking forward to being with you - slowing down together, breathing the forest air, and sharing meaningful moments on the land."
   > "Until then, know that your place is held."
   > "Just Love, always,"
   > "Bala & Nivay"
7. **Footer:** "Powered By Acuity Scheduling"

### Implications for Our System

| Acuity Feature | Our ERP Equivalent | Priority |
|---|---|---|
| Calendar integration (iCal/Google) | Generate `.ics` download + Google Calendar deeplink on confirmation page | P3 (N14) |
| Edit Info button | Self-service form edit link in confirmation email | P2 |
| Cancel button → admin notification | Cancellation request flow (D6) — link in emails, creates notification, doesn't auto-cancel | P2 |
| Custom confirmation message per event | `notification_templates` JSONB on events table — customizable confirmation copy | P1 |
| Personalized greeting (first name) | Template merge fields in confirmation emails + success page | P0 (already planned) |
| Location "directions will be sent" | `location_text` field on events + include in reminder emails | P1 |

**Key takeaway:** Acuity's confirmation page is warm and personal — our system needs to match this tone. The confirmation copy is event-specific and customizable (Brian writes these). Our `notification_templates` JSONB needs a `confirmation_message` key that supports this level of personalization.

---

## Appendix: Acuity Form IDs for Migration

Priority forms to recreate in the form builder (Phase 1):

| Priority | Acuity Form | ID | Template Block |
|---|---|---|---|
| P0 | Community Weekend Sign Up | 2878738 | Event-specific |
| P0 | 2026 Loving Awareness Retreat Registration Options | 3137158 | Event-specific |
| P0 | Are you staying overnight? | 3171079 | Accommodation |
| P0 | Dietary Considerations and Allergy Information | 2291559 | Dietary |
| P0 | Community Well-being and Safety Understanding | 2266765 | Legal/Safety |
| P1 | Wellbeing check-in | 2067147 | Health |
| P1 | Health and Safety Disclosure | 2578927 | Health |
| P1 | First time joining us? | 2578463 | Logistics |
| P1 | Arrival and Departure Dates and Times | 2349137 | Travel |
| P1 | Carpooling, Parking and Vehicle Type | 2358019 | Travel |
| P1 | Your overnight stay options | 2347472 | Accommodation |
| P1 | Self Camping Arrangements | 2356486 | Accommodation |
| P2 | Food and beverage on-site | 2358254 | Dietary |
| P2 | Potluck planning | 2513642 | Logistics |
| P2 | Sharing the stories of our time together | 2954804 | Legal/Media |
| P2 | Hermitage Application | 3151610 | Event-specific |
| P2 | Intimacy retreat: Your accommodation selection | 3160882 | Event-specific |
| P2 | Dietary commitments agreement | 2266775 | Dietary |
| P3 | Payment | 2578488 | Legacy (replaced by Stripe flow) |
| P3 | Questions, Concerns & Thoughts | 2291567 | Feedback |
| P3 | Preferred mattress size | 2347461 | Accommodation |
