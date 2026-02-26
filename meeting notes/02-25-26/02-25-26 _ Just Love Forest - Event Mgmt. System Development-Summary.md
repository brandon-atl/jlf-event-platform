# Summary

# Custom Event Management System: Scope and Requirements Definition

[image]## Project Background and Scope Evolution
The conversation traces the project’s origin from a narrow, pragmatic fix to a full-scale platform. Initially, Brian sought a simple reminder mechanism for registrants who received a payment link but never completed payment. Neveah had already assembled a rudimentary Zap-based reminder flow and documented it. Brian explored whether Acuity’s payment button could be “jailbroken” to route payments through Stripe; his research suggested it wasn’t possible, and Brandon later confirmed Acuity’s button could not be hacked for Stripe integration.

To mitigate non-payment, Brian shifted their process so participants pay first through Stripe and then are redirected to registration—functional but “highly inconvenient,” “intuitively odd,” and mismatched with the desired experience flow. Brian did not envision a bespoke system initially and assumed they might hire a consultant for roughly $1,000 to tweak Zaps or force a Stripe button integration.

Brandon, motivated by product passion and craft, went far beyond the initial scope to design and build a comprehensive solution. He emphasized that he did not intend to charge for his time, had out-of-pocket tool costs of “two, three hundred dollars,” and would be content with cost coverage. He underscored his commitment to excellence (“one hundred and twenty percent effort”) and the portfolio value of the work. Brian, concerned about reciprocity and the impact on their friendship, desired a fair arrangement—especially given Brandon’s circumstances—so the relationship remains clear and healthy. Brandon apologized for Brian’s discomfort, clarified he didn’t feel misled, and reaffirmed their friendship is not at risk over the project. Brandon referenced a previous job rate of “sixty seven an hour or something,” providing context for professional value, while Brian described the system as “pretty mind boggling in terms of what it can do.”

## Solution Overview and Value Proposition
Brandon presented a sharp cost-benefit profile. The current stack—Squarespace, Acuity, Stripe, Zapier, and Squarespace email—runs approximately $87–$115 per month, driven by tiered features (e.g., 50,000-email tier to access other features despite sending only five emails). The new platform is estimated to cost approximately $6.15 per month. It includes 3,000 free emails monthly, retains Stripe for payments and tax handling, and adds SMS via Twilio: $1.15/month for the phone number with pay-as-you-go texts (about a penny or two per text).

Technically, the backend API is Railway, which consolidates operational and attendee data: dietary preferences, payment status, number of events attended, payment expiration status, accommodations (bell, nylon, self-camp), total revenue, average payment, and a “day-of view.” It also tracks meeting points and an attendee roster of people who have signed up and paid. The system features logins, automated reminders, email templates, and a small SOP, plus a real-time dashboard carrying all essential data.

The economic value extends beyond subscription savings. Brandon estimates immediate positive ROI upon deployment, time savings of 15–38 hours per month, and an annual total value of $11,000–$24,000 when factoring time and recovered registrations (fewer drop-offs at payment). Brian concurred on the significance of the cost differential and the system’s capabilities.

## Core Functional Requirements for Acuity Replacement
Replacing Acuity requires several critical features, most centered on flexible data capture and complex event logic:
- Intake and liability: The system must support event-specific custom intake forms and waivers, capturing critical health and allergy information for liability and safety. Forms need common inputs (dropdowns, checkboxes) and the ability to attach specific forms to specific events in the database.
- Payment permissiveness: While the standard flow removes “pending payments” by requiring payment before registration, there must be a “back door” toggle to permit registration without immediate payment (for cash at arrival).
- Recurring and multi-select events: Attendees should be able to see a full-year view of recurring events (e.g., Community Weekends), select desired dates, and—ideally—add multiple events into a single “shopping cart” for combined checkout and registration.
- Multiple attendees per transaction: If registering couples, families, or groups, each individual needs separate waivers. The system should prompt additional forms for each added guest and include legal language making clear individual acceptance of terms.
- Complex multi-part events: Community Weekend is the most intricate case:
  - Friday night: donation-based (optional payment).
  - Saturday service day: optional donation.
  - Saturday night: mandatory payment ($50).
  - Sunday forest therapy: mandatory payment ($125).
  The system must attach fixed costs to mandatory components while allowing donation-based amounts for optional parts. A single waiver should cover the entire weekend regardless of participation mix, and a consolidated view should display headcounts for each part (Friday, Saturday day, Saturday night, Sunday).

## Operational and Communication Workflows
Event-day operations prioritize clarity, speed, and personalization:
- Day-of view and check-in: The system already includes a “day of view” listing confirmed, paid attendees with dietary preferences, accommodation (e.g., tent type), meeting points, meal counts, and tent needs. Staff can tap a name to check in attendees, marking arrival with an automatic timestamp. A simple checkbox next to each name (“Have arrived?”) supports quick validation.
- ETA tracking: To track divergent arrival times without manual entry, automatic day-of text reminders can invite attendees to reply with their ETA; replies are ingested into the database and shown in the front end.
- Templates and personalization: Text and email templates pull dynamic variables (e.g., attendee names, event data), and can be customized, duplicated, and remixed per event. Brian wants flexible editing per event to maintain a human feel—“not a dentist office text.”
- Two-way texting and numbers: The system uses Twilio. Numbers can be ported or newly purchased and are owned by the team, enabling two-way SMS conversations with attendees.
- WhatsApp follow-up: Post-event communication typically involves sending a WhatsApp group link via individual texts, avoiding adding users directly to prevent flagging. A post-retreat SMS blast with the WhatsApp link aligns with current practice. Brian maintains an overarching “love forest” WhatsApp community and event-specific groups.
- Co-creator access: Co-creators receive login via magic link and 2FA, enabling controlled access without passwords. A Google Sheet export is helpful to share consolidated attendee information and capture occasional custom notes.
- Calendar view: A calendar visualization is not a priority for Brian; he values preventing overbookings rather than a calendar-first interface.
- Email content: Templates generally include logos, attendee names, and key details such as location or Zoom links. Reminder emails are sent 24 hours before appointments.

## Financial Reconciliation and Administrative Needs
Post-event, the system must streamline what is currently manual and fragmented:
- Payment flow and tracking: Stripe remains the payment processor to retain custom donation support and tax automation. The new platform reduces chasing non-payers by anchoring registration to completed payments, and it can detect timeouts or expired payment attempts. “Pending payments” can be removed under the new flow, with exceptions handled via the in-person cash toggle.
- Expense capture: Co-creators should be able to upload image receipts, itemize expenses (e.g., groceries, flowers, cacao, replenishables), and store them in a dedicated expenses table. Rolling operating costs should be modeled (e.g., $9 per retreat per person, or $4.50 for one-day events covering utilities, propane, water, soaps).
- Profit splits: A calculator must compute splits automatically based on total income (net of Stripe fees and all expenses), with configurable percentages per event (e.g., 50/50, 30/70, multiple co-creators). The system must support recalculation when late receipts are submitted.
- Scholarships and memberships: Scholarships (e.g., Liz’s $30 for a $250 event via a separate PayPal link) need structured tracking and integrated discounts to avoid manual reconciliation. The platform should implement scholarship mechanisms (private discounted links) and track recipients and leverage Stripe instead of Paypal for taxes and simplicity. Membership discounts should apply as flat or percentage-based rates tied to member status (e.g., $50 for the entire Community Weekend for members).
- Internal operating expenses: A separate product/page should allow uploading and tracking non-retreat-related expenses.
## Action Items
- Brandon A.
  - [x] Store the current email logo in the system’s assets - [TBD]
  - [ ] Integrate a weather API to inform attendees about event-day conditions (e.g., suggest bringing an umbrella if rain is forecast) - [TBD]
  - [ ] Provide customizable SMS templates with dynamic variables; enable copying a base template, personalizing with attendee names, and adding notes - [TBD]
  - [ ] Enable two-way SMS so users can view and respond to attendee messages directly (Twilio) - [TBD]
  - [ ] Obtain access to existing WhatsApp group(s) for post-event link distribution alignment - [TBD]
  - [ ] Potentially remove the “pending payments” status to align with the pay-first registration flow - [TBD]
  - [ ] Implement a “pay in person with cash” toggle on the registration form - [TBD]
  - [ ] Set up automated text/email reminders for attendees who select in-person cash payment - [TBD]
  - [ ] Create an event-specific custom form template creation system (dropdowns, checkboxes, etc.) and attach forms to events in the database - [TBD]
  - [ ] Build “shopping cart”-style functionality allowing attendees to select multiple events (each event as a product) for combined checkout - [TBD]
  - [ ] Implement multi-guest logic prompting separate form submissions for each additional attendee, with clear legal acceptance language - [TBD]
  - [ ] Configure pricing logic: fixed costs for mandatory components (e.g., $50 Saturday night, $125 Sunday forest therapy) and donation-based amounts for optional components - [TBD]
  - [ ] Develop a single, weekend-wide waiver for Community Weekend - [TBD]
  - [ ] Implement a Google Sheet export of registration data, including custom note columns, for co-creators and on-site use - [TBD]
  - [x] Build out the day-of view: attendee check-in with arrival timestamps, dietary preferences, tent/stay info, meeting points, and status (checked-in/pending) - [TBD]
  - [ ] Integrate automated day-of text reminders that accept attendee ETA replies and ingest/display ETAs in the database/front end - [TBD]
  - [ ] Add a post-event SMS blast capability to distribute WhatsApp group links - [TBD]
  - [ ] Implement features for co-creators to upload image receipts and itemize expenses; create a dedicated expenses table - [TBD]
  - [ ] Build a profit split calculator (total income minus Stripe fees and expenses) with configurable percentage splits per event; support recalculation when late receipts arrive - [TBD]
  - [ ] Implement scholarship mechanisms (e.g., private discounted links) and track scholarship recipients - [TBD]
  - [ ] Integrate membership discounts (flat or percentage-based) tied to attendee member status - [TBD]
  - [ ] Create a separate product/page to upload and track internal operating expenses (non-retreat) - [TBD]
  - [x] Research Stripe’s capabilities for sending payments to co-creators - [TBD]
  - [x] Gain full admin/contributor access to Acuity (add Brandon to the account/board with full access) - [TBD]
  - [x] Set up a temporary Stripe account for testing in sandbox - [TBD]

- Brian Y.
  - [x] Send Brandon the Acuity invite link - [TBD]
  - [x] Grant Brandon access to Acuity forms - [TBD]
  - [x] Send Brandon the Community Weekend spreadsheet - [TBD]
  - [x] Grant access to the Google Sheet for Community Weekends - [TBD]
  - [x] Send Brandon the financial summary that was sent to Sean - [TBD]