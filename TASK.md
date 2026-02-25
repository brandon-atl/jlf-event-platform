# Phase 5 Task — Enhancements + QA Fixes

You are working on branch `feat/phase5-enhancements` (already checked out from main).
When done, commit all changes in logical commits and push. Do NOT merge to main — create a PR.

## Important context
- Frontend: Next.js app in `src/frontend/` — uses `useDarkMode()` hook and `colors`/`darkColors` from `src/frontend/src/lib/theme.ts`
- Backend: FastAPI in `src/backend/` — PostgreSQL via SQLAlchemy async + Alembic migrations
- Dark mode is implemented via `isDark` boolean from `useDarkMode()` hook, NOT via Tailwind `dark:` classes. You must use inline styles or conditional classNames with the `isDark` flag and `darkColors` from theme.ts
- The layout (`src/frontend/src/app/(dashboard)/layout.tsx`) already has dark mode working — it resolves colors into variables like `textMain`, `textSub`, `cardBg`, `borderColor` etc. Inner pages need to do the same pattern.
- Demo mode: `isDemoMode()` from `src/frontend/src/lib/demo-data.ts` — returns true when localStorage `jlf_demo` = "true"
- Build with: `cd src/frontend && npm run build` (must pass with 0 errors)
- DO NOT touch `src/frontend/node_modules/`

## PART A: QA Bug Fixes

### A1. Dashboard stat cards wrong status breakdown
File: `src/frontend/src/lib/demo-data.ts` — `DEMO_DASHBOARD` function
The status_breakdown currently computes derived values that don't match the DEMO_REGISTRATIONS data. Fix: make DEMO_DASHBOARD's status_breakdown actually count from DEMO_REGISTRATIONS output for the same eventId, so the numbers match.

### A2. Past events still accept registrations
File: `src/frontend/src/app/register/[slug]/page.tsx` and `registration-form.tsx`
If the event's `event_date` (or `event_end_date` if multi-day) is in the past, show a branded "Registration Closed" message instead of the form. Use the JLF forest theme — TreePine icon, forest green colors, message like "This event has ended. Check out our upcoming events at justloveforest.com"

### A3. Free event attendees show dollar amounts
File: `src/frontend/src/lib/demo-data.ts` — `DEMO_REGISTRATIONS` function
When `ev.pricing_model === "free"`, set `payment_amount_cents: 0` instead of random amounts.

### A4. Co-creators page needs demo data
File: `src/frontend/src/app/(dashboard)/co-creators/page.tsx`
The demo data `DEMO_COCREATORS` already exists in demo-data.ts. The co-creators page needs to check `isDemoMode()` and use `DEMO_COCREATORS` instead of calling the API when in demo mode.

### A5. Duplicate config values
File: `src/backend/app/config.py`
Remove duplicates. Keep: `jwt_expiration_minutes: 1440` (remove any jwt_expiry_hours if it exists). Keep: `magic_link_expiration_hours: 72` (remove any magic_link_expiry_hours if it exists). Actually check the file — the duplicates mentioned in QA may have already been cleaned. If so, skip.

### A6. Hide accommodation for virtual/Zoom events
Files: `src/frontend/src/app/(dashboard)/dashboard/[eventId]/page.tsx` and day-of page
If the event's `event_type` contains "Zoom" or "Virtual" (case-insensitive) OR `pricing_model === "free"` with meeting_point containing "Zoom", hide the accommodation breakdown section. Use the event data that's already loaded.

### A7. Password field accessibility
File: `src/frontend/src/app/(auth)/login/page.tsx`
- Add `aria-label="Toggle password visibility"` to the eye/toggle button
- Add `autocomplete="current-password"` to the password input

## PART B: Global Dark Mode Pass

Every page inside `(dashboard)/` that uses hardcoded light colors needs dark mode support.

Pattern to follow (from layout.tsx):
```tsx
import { useDarkMode } from "@/hooks/use-dark-mode";
import { colors, darkColors } from "@/lib/theme";

// Inside component:
const { isDark } = useDarkMode();
const c = isDark ? darkColors : colors;
const cardBg = isDark ? darkColors.surface : "#ffffff";
const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
const textMain = isDark ? darkColors.textPrimary : colors.forest;
const textSub = isDark ? darkColors.textSecondary : "#6b7280";
const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
```

Then replace all hardcoded `bg-white`, `text-gray-*`, `border-gray-*` with inline styles using these variables.

Pages to fix:
1. `src/frontend/src/app/(dashboard)/dashboard/page.tsx` — event selector cards
2. `src/frontend/src/app/(dashboard)/dashboard/[eventId]/page.tsx` — stat cards, charts, tables
3. `src/frontend/src/app/(dashboard)/events/[id]/page.tsx` — attendee table, filters, badges
4. `src/frontend/src/app/(dashboard)/co-creators/page.tsx` — co-creator cards, dialogs
5. `src/frontend/src/app/(dashboard)/day-of/[eventId]/page.tsx` — logistics cards
6. `src/frontend/src/app/(dashboard)/day-of/page.tsx` — event selector
7. `src/frontend/src/app/(dashboard)/settings/[eventId]/page.tsx` — form inputs, cards
8. `src/frontend/src/app/(dashboard)/settings/page.tsx` — event selector

Also check:
- `src/frontend/src/components/dashboard/stat-card.tsx`
- Any dialog/modal components used in these pages

Make sure text is readable, backgrounds have proper contrast, borders are visible, and status badges look good in both modes.

## PART C: New Features

### C1. Attendees Page (cross-event directory)
Create `src/frontend/src/app/(dashboard)/attendees/page.tsx`

Add "Attendees" to the sidebar nav in layout.tsx (use Users icon, href="/attendees", between "Events" and "Dashboard").

In demo mode, aggregate all DEMO_REGISTRATIONS across all DEMO_EVENTS to build an attendee directory:
- Show each unique attendee (by name) with:
  - Name, email, phone
  - Number of events attended
  - List of event names they registered for (with status badge per event)
  - Total amount paid across all events
  - Last registration date
- Search by name/email
- Sort by name, events count, total paid
- Dark mode aware (use the pattern above)

For real API mode, add an `attendees` namespace to `src/frontend/src/lib/api.ts` with a `list()` method that calls `GET /api/v1/attendees` — but for now the backend endpoint doesn't exist, so just have it there and let the demo mode handle the display.

### C2. Virtual Meeting URL field
Backend: Add `virtual_meeting_url: Mapped[str | None]` to the Event model in `src/backend/app/models/event.py`. Add it to the event schemas too.

Create an Alembic migration: `cd src/backend && alembic revision --autogenerate -m "add virtual_meeting_url to events"` — but since we can't run this without the DB, just create the migration file manually with the correct up/down:
```python
op.add_column('events', sa.Column('virtual_meeting_url', sa.Text(), nullable=True))
# downgrade:
op.drop_column('events', 'virtual_meeting_url')
```

Frontend:
- Add `virtual_meeting_url` field to the settings/edit form (`settings/[eventId]/page.tsx`) — show it conditionally when event_type suggests virtual, or always show with a label like "Virtual Meeting Link (optional)"
- Show the link on the day-of view if present
- Show it on registration success page if the event has one
- Add to the EventCreate/EventResponse types in api.ts

### C3. Smarter Status UX
File: `src/frontend/src/app/(dashboard)/events/[id]/page.tsx`

- Add a visual indicator distinguishing auto-confirmed (source = "registration_form" + status = "complete") from manual registrations that need action
- For manual/walk-in registrations with status "pending_payment", show a prominent "Needs Action" badge
- Add bulk action buttons at the top of the table: "Mark Selected Complete", "Send Reminder to Selected"
- Add checkboxes to each row for selection
- Dark mode aware

### C4. Dashboard Improvements
File: `src/frontend/src/app/(dashboard)/dashboard/[eventId]/page.tsx`

Add:
- Revenue breakdown card showing total revenue, average payment, and revenue by accommodation type
- Registration timeline — a simple bar chart or list showing registrations per week/day (use the created_at from registration data)
- Better stat cards with trend indicators or sparklines (even if just static demo data)
- Dark mode on all new elements

### C5. Notification Templates UI
File: Create `src/frontend/src/app/(dashboard)/notifications/page.tsx` or add to settings

Add a section (could be a tab in settings, or a new nav item) that lets Brian:
- View/edit email templates for: confirmation, reminder, expiry notice
- Templates stored in event's `notification_templates` JSONB
- Simple textarea with variable placeholders: {{attendee_name}}, {{event_name}}, {{event_date}}, {{meeting_point}}
- Preview panel showing rendered template with sample data
- Save updates via event PATCH endpoint
- Dark mode aware

### C6. Registration Form Preview
File: Add to settings page or create as a sub-route

Add a "Preview Registration Form" button to the event settings page that:
- Opens a modal or side panel
- Shows exactly what the public registration form looks like for that event
- Uses the event's configuration (pricing model, registration fields, accommodation options)
- Read-only, no submit functionality
- Dark mode aware

## Build & Commit Instructions

1. After all changes, run `cd src/frontend && npm run build` — fix any errors
2. Commit in logical groups:
   - "fix: QA bug fixes — stat cards, past events, demo data, config, a11y"  
   - "feat: global dark mode on all dashboard pages"
   - "feat: attendees directory page"
   - "feat: virtual meeting URL field"
   - "feat: smarter status UX with bulk actions"
   - "feat: dashboard improvements — revenue, timeline"
   - "feat: notification templates UI"
   - "feat: registration form preview"
3. Push the branch: `git push -u origin feat/phase5-enhancements`
4. Create PR: `gh pr create --base main --title "feat: Phase 5 — Enhancements + QA fixes" --body "..."`

When completely finished, run this command to notify me:
openclaw system event --text "Done: Phase 5 complete — all 7 features + QA fixes built. PR created." --mode now
