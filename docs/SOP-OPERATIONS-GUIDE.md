# Just Love Forest — Event Platform Operations Guide

> **For:** Brian Y. (Bala), Naveed N. (Nivay), and other operators
> **Last updated:** February 24, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Logging In](#logging-in)
3. [Managing Events](#managing-events)
4. [Registrations & Attendees](#registrations--attendees)
5. [Day-of Operations](#day-of-operations)
6. [Co-Creator Portal](#co-creator-portal)
7. [Notifications & Reminders](#notifications--reminders)
8. [Dashboard & Analytics](#dashboard--analytics)
9. [Settings & Configuration](#settings--configuration)
10. [Sharing Registration Links](#sharing-registration-links)
11. [Stripe & Payments](#stripe--payments)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)
14. [DNS Setup (One-Time)](#dns-setup-one-time)

---

## Quick Start

| What | URL |
|------|-----|
| **Admin Dashboard** | [justloveforest-events.vercel.app/events](https://justloveforest-events.vercel.app/events) |
| **Registration Page** (example) | `justloveforest-events.vercel.app/register/{event-slug}` |
| **Co-Creator Portal** | `justloveforest-events.vercel.app/portal` |

---

## Logging In

1. Go to [justloveforest-events.vercel.app](https://justloveforest-events.vercel.app)
2. You'll see a login page — enter your email and password
3. After login, you land on the **Events** page

> **Note:** If you get logged out, just log in again. Sessions last 24 hours.

---

## Managing Events

### Creating a New Event

1. Go to **Events** in the left sidebar
2. Click **"+ New Event"** (top right)
3. Fill in the form:
   - **Name** — Event title (e.g., "Emerging from Winter Retreat")
   - **Slug** — URL-friendly name (auto-generated, e.g., `emerging-from-winter`). This becomes the registration link: `/register/emerging-from-winter`
   - **Description** — Brief event description shown to registrants
   - **Event Date / End Date** — Start and end times
   - **Event Type** — Retreats, Community Weekends, Ashram, Forest Therapy, etc.
   - **Pricing Model** — `fixed` (set price) or `donation` (minimum donation)
   - **Price** — Fixed price in dollars (e.g., $250.00)
   - **Capacity** — Max number of attendees
   - **Status** — `draft` (hidden) or `active` (open for registration)
4. Click **Save**

### Editing an Event

1. Click on any event in the list
2. Click **Edit** on the event detail page
3. Make changes and save

### Opening Registration

Set the event status to **active** — this makes the registration page live at `/register/{slug}`.

### Closing Registration

Set the event status to **draft** or **cancelled** — the registration page will no longer accept new signups.

---

## Registrations & Attendees

### Viewing Attendees

1. Click on an event
2. You'll see the full attendee list with:
   - Name, email, phone
   - Status (Complete, Pending Payment, Cancelled, etc.)
   - Accommodation choice
   - Dietary restrictions
   - Payment amount
   - Registration date

### Searching & Sorting

- Use the **search bar** to find attendees by name or email
- Click column headers to sort

### Manual Registration (Walk-ins, Cash, Comps)

1. On the event detail page, click **"+ Add Registration"**
2. Fill in the attendee's details
3. For cash payments: set status to `complete` and add a note like "Cash payment received"
4. For complimentary: set status to `complete` and note "Complimentary"

### Editing a Registration

1. Click on any attendee's row
2. You can update:
   - Status (pending → complete, or cancel)
   - Accommodation
   - Admin notes
3. All changes are logged in the **audit trail**

### Exporting to CSV

1. On the event detail page
2. Click **"Export CSV"** — downloads a spreadsheet with all registrations

---

## Day-of Operations

1. Click **"Day-of View"** in the left sidebar
2. Select your event
3. You'll see:
   - **Headcount** — confirmed vs. pending
   - **Accommodation breakdown** — who's in tents, yurts, etc.
   - **Dietary summary** — food prep numbers
   - **Meeting points** — where to direct arrivals

> **Tip:** This view is designed for mobile — use it on your phone day-of.

---

## Co-Creator Portal

Co-creators (event co-hosts like Naveed, Sitaram, etc.) get **read-only** access to their assigned events.

### Inviting a Co-Creator

1. Go to **Co-Creators** in the left sidebar
2. Click **"+ Add Co-Creator"**
3. Enter their name and email
4. After creating, click **"Assign Event"** to give them access to specific events
5. Click **"Send Invite"** — they receive a magic link email
6. When they click the link, they land on the portal with their events

### What Co-Creators Can See

- Attendee list (names, email, dietary, accommodation)
- Headcount numbers
- Payment info (only if you enable "Can See Amounts" when assigning)

### What Co-Creators Cannot Do

- Create or edit events
- Modify registrations
- Access admin settings
- See other co-creators' events

---

## Notifications & Reminders

### Automatic Reminders

The system automatically sends:
1. **Confirmation email** — immediately when payment completes
2. **Payment reminder** — sent after configurable delay if payment is still pending
3. **Escalation reminder** — a more urgent follow-up if still no payment after the first reminder
4. **Auto-expire** — pending registrations are automatically cancelled after the expiry window

### Configuring Reminder Timing

On the event settings page:
- **Reminder delay** — minutes after registration to send first reminder (default: 60 min)
- **Auto-expire hours** — hours to wait before expiring a pending registration (default: 24 hrs)

### SMS Notifications (Coming Soon)

Once a Twilio phone number is purchased, you'll be able to:
- Send day-of SMS blasts to all confirmed attendees
- Include meeting point and arrival instructions

---

## Dashboard & Analytics

### Overview Dashboard

Click **Dashboard** in the sidebar → select an event:
- **Headcount by status** — complete, pending, cancelled, expired, refunded
- **Revenue** — total collected for the event
- **Accommodation breakdown** — visual split of tent/yurt/etc.
- **Dietary summary** — vegan, vegetarian, GF counts
- **Spots remaining** — capacity minus confirmed

---

## Settings & Configuration

Click **Settings** in the sidebar → select an event to configure:
- Reminder timing
- Auto-expire window
- Notification templates (coming soon)
- Day-of SMS time (coming soon)

---

## Sharing Registration Links

Each event gets a unique registration URL:

```
https://justloveforest-events.vercel.app/register/{event-slug}
```

Examples:
- `justloveforest-events.vercel.app/register/emerge-spring-2026`
- `justloveforest-events.vercel.app/register/march-community-weekend`

You can:
- Share this link on social media, in emails, or on the JLF website
- Embed it as a button/link on Squarespace pages
- The link only works when the event status is **active**

> **Future:** Once DNS is configured, these will live at `justloveforest.com/register/{slug}` instead.

---

## Stripe & Payments

### How Payments Work

1. Attendee fills out registration form
2. Clicks "Register" → redirected to Stripe Checkout
3. Pays with credit card
4. On success → redirected back, marked as "Complete"
5. Confirmation email sent automatically

### Refunds

1. Process the refund through the [Stripe Dashboard](https://dashboard.stripe.com)
2. The webhook will automatically update the registration status to "Refunded"

### Viewing Payment Info

- Payment amounts are visible in the admin attendee list
- Total revenue shown on the event dashboard

---

## Common Tasks

### "Someone paid but their registration shows Pending"

This usually means the Stripe webhook didn't fire. Check:
1. Is the registration showing `pending_payment`? Wait a few minutes — webhooks can be delayed.
2. If still stuck: manually update the status to `complete` in the admin panel.
3. Check Stripe Dashboard → Webhooks → see if the event was delivered.

### "Someone wants to cancel"

1. Find their registration
2. Change status to `cancelled`
3. If they need a refund, process it through Stripe Dashboard

### "I need to add someone who's paying in person"

Use **Manual Registration** (see above). Set status to `complete` and note the payment method.

### "An event is sold out but I need to add one more"

1. Edit the event → increase capacity by 1
2. Register them manually
3. Optionally decrease capacity back

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't log in | Clear browser cookies, try again. If password forgotten, contact the developer. |
| Registration page shows error | Check event is set to `active` status |
| Email not received | Check spam folder. Emails currently come from `onboarding@resend.dev` (temporary — will change to `@justloveforest.com` after DNS setup) |
| Stripe checkout fails | Check Stripe Dashboard for error details |
| Co-creator can't access portal | Re-send their magic link invite |

---

## DNS Setup (One-Time)

> **Brian:** These steps need to be done once in your Squarespace/domain DNS settings.

### 1. Email Domain Verification (Resend)

Add these DNS records to `justloveforest.com` so emails come from `@justloveforest.com` instead of `@resend.dev`:

*(Records will be provided by the developer — they're generated when you verify the domain in Resend.)*

### 2. Custom Domain (Optional)

To make registration links like `justloveforest.com/register/...`:

This requires pointing a subdomain (e.g., `events.justloveforest.com`) to Vercel, then configuring Vercel with the custom domain.

*(Developer will provide the exact CNAME record.)*

### 3. Squarespace Link Swap

Once the platform is live with a custom domain, update links on the JLF website:
- Replace Acuity/Stripe links with new registration URLs
- Add a "Register" button pointing to the event registration page

---

## Support

For technical issues or changes, contact the development team. For day-to-day operations, everything you need is in the admin dashboard.

**Remember:** All manual changes (status updates, edits, notes) are automatically logged in the audit trail for accountability.
