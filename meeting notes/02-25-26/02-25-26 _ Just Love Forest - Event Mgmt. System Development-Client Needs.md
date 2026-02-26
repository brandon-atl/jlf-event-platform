# 02-25-26 | Just Love Forest - Event Mgmt. System Development

Date & Time: 2026-02-26 01:17:35
Location: [Insert Location]
Customer: Brian Y., Brandon A., Navid N.
Overview
The team is consolidating event management, registration, payments, communications, and post-event financial workflows into a custom system to replace a fragmented stack (Squarespace, Acuity, Stripe, Zapier, Squarespace Email). The current “pay first, then register” approach reduces unpaid registrations but feels unintuitive and impedes data capture. Pain points span unpaid registrations and manual reconciliation, inflexible integrations, multi-attendee waivers, recurring event selection, complex multi-day logistics, two-way messaging needs, role-based access, and manual post-event finance reconciliation. Brandon has prototyped a low-cost platform (approx. $6.15/month + $1.15/month for SMS number and per-text fees) centralizing forms, waivers, attendance, payments, dashboards, reminders, exports, and analytics, targeting 15–50 hours saved monthly and improved safety, compliance, and user experience.
Background
- Historic flow registered first, then directed attendees to Stripe, causing unpaid registrations and manual email-to-Stripe matching; a Zapier reminder workaround helped but didn’t solve it.
- Current flow forces payment before forms, creating UX and liability concerns; Acuity cannot be modified to redirect its payment buttons directly to Stripe as desired.
- Brandon built a custom system on Railway with dashboards, automated reminders, email templates, SOPs, and tracking (revenue, attendance, payment averages). Build tools cost “two, three hundred dollars.”
- Estimated SaaS spend today: “eighty seven to one hundred fifteen” per month, partly due to oversized email tiers (e.g., 50,000 emails/month while sending ~5).
- The team runs one-off and recurring events (e.g., Hanuman Tuesday, community weekends) requiring event-specific forms, waivers, arrival-time options, health/allergy tracking (e.g., celiac vs gluten-free), and spreadsheet exports. Google Sheets are used for visibility and partner collaboration.
- Stripe must be retained for donations/custom amounts and tax handling; Brandon set up a Stripe sandbox for testing.
- Meeting logistics include screen-sharing challenges and rural internet; interest in calendar links (Google/iCal) while preferring a dashboard view.
Pain Points
- Unpaid registrations and manual reconciliation burden: Registration-first led to non-payment and manual matching, described as “completely insane.” Switching to pay-first removed unpaid registrations but feels “highly inconvenient” and “intuitively odd.”
- Inflexible integrations (Acuity/Stripe): Acuity cannot be “jailbroken” to alter payment button behavior. Using multiple services fragments data and adds recurring costs.
- Data capture and UX: Forms appear behind a paywall, risking incomplete health/liability info before attendance. Liability risks include dietary sensitivities (gluten, celiac).
- Intake form flexibility: Need reusable, customizable form templates (checkboxes, dropdowns) linked to events, saved/duplicated, and stored centrally; six common forms plus event-specific one-offs.
- Recurring events and multi-date registration: Users should see all upcoming dates and optionally register for multiple in one checkout to reduce friction and admin overhead.
- Multi-person registration with individual waivers: Couples/families register under one name with quantity “2,” but each person must sign waivers individually; current flow requires manual follow-up and corrections.
- Complex multi-part weekends: Mixed pricing (donation-based Friday and Saturday day; $50 Saturday night; $125 Sunday forest therapy) and consolidated headcounts per sub-event require accurate pricing and reporting.
- Data integrity issues: Billing names sometimes override attendee names, causing mismatches and waiver compliance risks.
- Complex multi-day logistics: Check-ins, late-arrival tracking, dietary/tent info, and co-creator coordination are managed via printed sheets and ad hoc notes, creating bottlenecks and errors.
- Limited two-way communication: Need personalized, template-driven SMS/email with reply handling (ETAs) and post-event WhatsApp invites; avoid impersonal “dentist office” messaging tone.
- Role-based access: Co-creators need restricted access (hide payments) while maintaining exports and note-taking capability.
- Cost and tooling sprawl: Multiple subscriptions exceed needs and increase monthly spend; desire to consolidate with the custom system.
- Post-event finance reconciliation: Manual, fragmented expense collection (receipts via texts), mixed payment channels (Stripe, PayPal scholarships, Venmo payouts, WhatsApp/Apple Pay reimbursements), and scholarship/member pricing complicate calculations and audits. Stripe cannot pay out to non-Stripe users directly, necessitating Venmo and manual tracking.
- Late receipts and recalculations: Adjustments after payouts require recalculations and create friction.
Expectations
- Integrated custom event management replacing Acuity: Scheduling, forms/waivers, arrival times, health/allergy tracking, registration-to-payment flow, real-time dashboards, email/SMS reminders, and exportable spreadsheets; replicate/enhance Acuity’s form capabilities.
- User-friendly payment-registration sequence: Collect required intake data first, then payment, linking pre-payment records to transactions; support a cash-at-door exception toggle with automated reminders and clear status tracking.
- Recurring event selection and optional multi-date checkout: Display all upcoming dates; allow multi-select and consolidated checkout where feasible.
- Multi-attendee flow with individual waivers: Buyer selects guest count; system generates separate form pages per attendee, capturing individual waiver consent and legal acknowledgments.
- Accurate pricing and consolidated reporting for weekends: Conditional logic for donation-based sub-events and fixed fees; automatic total calculation; dashboards with headcounts per sub-event.
- Data integrity safeguards: Strict separation of payer vs. attendee entities; validation when billing name differs; clean exports and reconciliation.
- Day-of operations: Check-in interface with timestamps, arrival flags, dietary/tent info, meal/meeting-point counts; capture ETAs via two-way SMS and manual overrides; printable exports.
- Two-way messaging and branded communications: Template-driven SMS/email with dynamic variables (name, event), inbox-style threading to view and reply; post-event SMS with WhatsApp invite links; tasteful conditional content (e.g., weather).
- Role-based co-creator access: Magic link + 2FA, visibility toggles (e.g., hide payment data), ability to export and add notes without complex rebuilds.
- Cost reduction and consolidation: Reduce monthly spend to approx. $6.15 plus minimal SMS costs; retain Stripe for donations and taxes; realize 15–38+ hours/month time savings and annual value “eleven to twenty four thousand dollars” or more.
- Post-event financial module: Centralized receipt uploads (images), itemization, Stripe fee handling, scholarships/member discounts, shared expenses, and configurable split calculations (50/50, 30/70, 3–4+ co-creators); versioned recalculations and audit trails for late receipts; exportable summaries for co-creators.
Other Information Summary
- System includes login, automated reminders, email templates, SOPs, dashboards, event analytics (revenue, average payment, attendance).
- SMS via Twilio requires purchasing a number ($1.15/month) and per-text fees (“a penny or two”).
- Pending payment status can likely be removed except for cash-at-door cases.
- Calendar links (Google/iCal) are optional; dashboard preferred.
- Collaboration uses shared Google Sheets; exports remain important for partner visibility.
- Potential in-person visit to review demos and progress.
- Operating expenses and forest funds need separate categorization and reconciliation.
- Example metrics: events with ~20 attendees; member pricing nuances; scholarship links via Stripe desired; prior event “gross revenue twelve eighty.”
To-Do List
- ~~Provide Brandon admin access to Acuity to review existing forms/waivers. Stakeholder: Brian. Deadline: [Insert Date].~~
- Finalize payment-registration flow (form-first, Stripe linkage), including cash exception toggle and automated reminders. Stakeholders: Brandon, Brian, Nivay. Deadline: [Insert Date].
- Set up Twilio/SMS number ($1.15/month), enable two-way messaging, and configure per-text billing. Stakeholder: Brandon. Deadline: [Insert Date].
- Build the custom intake form system with checkbox/dropdown components; enable save, duplicate, and event linkage; map existing Acuity forms (arrival times, health history, allergies, waivers). Stakeholders: Brandon, Brian. Deadline: [Insert Date].
- Implement recurring event date selection UI; evaluate multi-date cart checkout feasibility. Stakeholder: Brandon. Deadline: [Insert Date].
- Implement export-to-spreadsheet functionality with attendee notes and health/allergy indicators; deliver printable day-of checklist view. Stakeholder: Brandon. Deadline: [Insert Date].
- Confirm Stripe integration details (donations with custom amounts, tax handling); test end-to-end payment flows; ensure metadata links for reconciliation. Stakeholders: Brandon, Brian. Deadline: [Insert Date].
- Implement multi-guest registration with per-attendee waiver capture and legal language; enforce validation and audit trail. Stakeholders: Development, Legal. Deadline: [Insert Date].
- Configure weekend pricing logic (donation-based Friday/Saturday day; $50 Saturday night; $125 Sunday forest therapy); maintain consolidated headcounts per sub-event. Stakeholders: Development, Finance. Deadline: [Insert Date].
- Add Google Calendar/iCal links to event pages where useful. Stakeholder: Brandon. Deadline: [Insert Date].
- Implement two-way SMS and email template editor with dynamic variables; enable personalized bulk texting; route replies to organizer’s inbox. Stakeholder: Brandon; Review: Brian. Deadline: [Insert Date].
- Finalize co-creator access controls with magic link + 2FA; configure visibility toggles (e.g., hide payment fields). Stakeholder: Brandon; Policy input: Brian. Deadline: [Insert Date].
- Build attendee ETA capture via SMS reply parsing; display ETAs prominently in Day-of view; add manual override field. Stakeholder: Brandon; Validation: Brian. Deadline: [Insert Date].
- Add logo and attendee name merge fields to reminder emails; include location or Zoom link; minimize extraneous options. Owner: Brandon/Team. Timing: ASAP.
- Design and implement an expenses module: receipt uploads, dollar entry, notes; event-level payout calculator subtracting Stripe fees/expenses; configurable splits for 2–4+ co-creators; export/reporting; versioned adjustments for late receipts. Stakeholder: Brandon/Dev; Review: Brian/co-creators. Deadline: [Insert Date].
- Centralize receipt storage (Google Drive or in-app) with per-event folders and an Operating Expenses section; enforce metadata (event, payer, category, amount). Stakeholder: Brandon; Users: Brian, Nivay. Deadline: [Insert Date].
- Build private Stripe products/links for scholarships and member pricing tied to attendee/event records; maintain scholarship/member database. Stakeholder: Brandon; Input: Nivay/Brian. Deadline: [Insert Date].
- Research payout options (Stripe Connect or third-party) for co-creator payments; if Venmo remains, generate payout instructions and audit logs. Stakeholder: Brandon. Deadline: [Insert Date].
- Prepare SOP/user guide covering event setup, form creation, payment flows, cash exceptions, data exports, multi-guest waivers, messaging, and post-event finance workflows. Stakeholder: Brandon. Deadline: [Insert Date].
- Review subscription decommissioning plan (Squarespace Email tiers, Zapier, Acuity) post-deployment. Stakeholders: Brian, Brandon. Deadline: [Insert Date].
- Align on scope and reciprocity terms for Brandon’s time and tool expenses. Stakeholders: Brian, Brandon. Deadline: [Insert Date].