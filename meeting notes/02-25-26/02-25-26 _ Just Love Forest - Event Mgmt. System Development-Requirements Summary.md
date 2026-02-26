# 02-25-26 | Requirements Gathering - Event Mgmt. System - Just Love Forest

# Requirements Gathering Summary: Custom Event Management System
**Date of Summary:** February 25, 2026
### Stakeholders
- **Client/Jurisdiction:** The client organization, referred to as Just Love Forest LLC, hosts events and manages registrations, payments, and attendee communications.
- **Meeting Attendees:**
  - Brian Y. (Client Representative, Primary Stakeholder, End-user, Host)
  - Nivay N. (Client Representative, Co-creator, Product Manager)
  - Brandon A. (Developer, Product Manager, System Architect, Technical Lead)
### Requirements
#### Functional Requirements
- **Event Management & Creation:**
  - Admins must be able to create custom events.
  - Events must support configurable details like meeting points and multiple arrival times.
  - **Complex Events:** The system must handle composite events spanning multiple days (e.g., "Community Weekend") with selectable sub-events (e.g., Friday night only, all weekend). It must track headcounts for each sub-event.
  - **Recurring Events:** For recurring events, the system must display all upcoming dates for the year, allowing users to select a specific date to attend.
  - **Future Goal:** Ideally, users should be able to register for multiple instances of a recurring event in a single transaction (shopping cart functionality). This is not a "Day 1" requirement.
- **Registration & Payment:**
  - **Workflow:** The desired workflow is **Register/Fill Form -&gt; Pay**, reversing the current problematic **Pay -&gt; Register** flow.
  - **Payment Models:** Events must support different pricing, including:
    - **Fixed Price:** Mandatory, set costs for certain events (e.g., $125 for Forest Therapy).
    - **Pay What You Want / Donation-Based:** Free registration with an optional donation field.
    - **Variable Pricing:** Support a mix of fixed-price and donation-based sub-events within a single registration.
  - **Payment Deferral:** A "back door" mechanism (e.g., "Pay in person with cash" toggle) is needed for users who will not pay online immediately.
  - **Group Registration:** The system must support registration for multiple people (couples, families) in one transaction, prompting for the details and waiver of each individual guest.
  - **Special Pricing:** Admins must be able to create private, special pricing links for scholarships or discounts.
  - **Member Discounts:** The system must handle member discounts (percentage or flat fee).
- **Custom Forms & Data Collection:**
  - **Form Builder:** Admins must be able to create, customize, save, duplicate, and attach different forms and waivers to specific events without developer help.
  - **Form Fields:** Forms must support standard input types like dropdowns, text fields, and checkboxes for multiple selections.
  - **Waivers:** For multi-part events, users should only sign one consolidated waiver for the entire event.
- **Communications:**
  - **Automated Messages:** The system must send automated reminder emails and SMS messages (e.g., 24 hours before an event).
  - **Customizable Templates:** Admins must be able to edit email and SMS templates for specific events, using dynamic variables like attendee names.
  - **Bulk Personalized SMS:** The system must allow an admin to write a single base message and have it sent individually to all attendees, personalized with their names.
  - **Two-Way SMS:** Admins must be able to see and respond to replies from attendees, enabling two-way conversations.
  - **Post-Event SMS:** Ability to send an SMS blast to all attendees post-event (e.g., to share a WhatsApp group link).
  - **Email Branding:** All outgoing emails must include the client's logo.
- **Admin Dashboard, Check-in & Reporting:**
  - **Real-time Dashboard:** A dashboard is required to display key event data, including total revenue and average payment amount.
  - **"Day Of" View:** A dedicated view for event day management, showing a list of confirmed/paid attendees, their key details (dietary, accommodations), and an interactive check-in feature (e.g., a checkbox or button).
  - **Check-in Timestamp:** The system must record the time an attendee is checked in.
  - **ETA Tracking:** The system must capture attendee ETA, ideally by allowing them to reply to an automated SMS.
  - **Roster & Export:** Admins must be able to view and export an attendee roster for each event (e.g., to CSV/spreadsheet), indicating who has registered and paid. The export must be in a consolidated format for easy sharing.
- **Collaborator Access:**
  - Co-creators/co-facilitators must be able to log in (e.g., via magic link) to view event data.
  - Access should be configurable to show/hide sensitive information like financials.
  - Co-creators must be able to add notes for each attendee.
- **Financial Management:**
  - **Expense Tracking:** The system must allow co-facilitators to upload receipts (images) and itemize expenses for an event.
  - **Financial Calculator:** A feature is needed to automatically calculate event finances: `Total Income - Stripe Fees - All Itemized Expenses = Net Profit`.
  - **Profit Split:** The system must calculate co-facilitator payouts based on a configurable percentage split of the net profit (e.g., 50/50, 70/30).
  - **Internal Expenses:** Admins must be able to create a separate category for internal operating expenses not tied to a specific public retreat (e.g., "Forest Funds").
  - **Reconciliation:** Admins must be able to add forgotten receipts and recalculate financial summaries after an event has concluded.
- **User-Facing Features:**
  - **Calendar Links:** Provide users with "Add to Calendar" links (Google, iCal) for events they register for.
  - **Appointment Management:** Emails should contain links to "change or cancel" an appointment, which serves as a notification to the client team.
#### Non-functional Requirements
- **Usability:**
  - The attendee registration flow must be intuitive and energetically appropriate, avoiding the current "intuitively odd" process.
  - The admin interface should feel familiar to users of Acuity.
  - The system should automate repetitive tasks but allow for a high degree of personalization to maintain a non-corporate feel.
- **Cost-Effectiveness:**
  - Recurring subscription fees must be significantly lower than the current $87-$115/month cost. The target is ~$6.15/month plus usage-based fees.
- **Maintainability:**
  - Client admins must be able to create and manage custom forms without developer intervention.
- **Consolidated Reporting:**
  - The system must provide a consolidated view of registrants for complex events, showing headcounts for each sub-event, similar to the client's current helpful Google Sheet setup.
#### Data Requirements
- **Data Sources:** Data will be collected via the new custom-built forms. The client's current Acuity forms, Google Sheets, and manual spreadsheets will serve as a reference.
- **Data to Capture:**
  - **Attendee Data:** Name, Email, Phone Number, Registration/Payment Status, Number of guests, Allergy/Dietary preferences, Health history, Accommodation preferences, Arrival time selection, Check-in status/timestamp, and Waiver agreement.
  - **Event Data:** Name, Date, Location, Pricing structure, Associated forms/waivers.
  - **Financial Data:** Gross revenue, Stripe fees, Expense details (description, cost, receipt image), Profit split percentages, and Payout calculations.
- **Data Export:** Admins must be able to download attendee and registration data into a spreadsheet format.
- **Data Integrity & Accuracy:** All submitted form data must be securely saved and associated with the user's registration. The system must capture the attendee's name, not just the name from billing information.
#### User Interface (UI) Requirements
- **Registration Page:** Must clearly present intake form questions and a list of available dates for recurring events.
- **"Day of View":** A screen listing confirmed attendees with key details and an interactive check-in element. It should also display a summary of needs (e.g., total tents, meal counts) and check-in status.
- **Co-creator View:** An interface for co-creators to view event breakdowns, including revenue, expenses, and their final profit share.
- **Admin Interface:** Tools for creating events, managing forms, and generating special pricing links.
#### Security Requirements
- **Co-creator Permissions:** Access for co-creators must be controlled, with the ability to toggle the visibility of financial information.
- **Authentication:** Login for co-creators will be via a magic link sent to their email.
- **Data Protection:** Sensitive user data (PII, health information) must be securely stored and protected with appropriate access controls.
- **Private Links:** Scholarship or special pricing links must be private and managed internally to prevent abuse.
#### Regulatory and Compliance Requirements
- **WhatsApp Integration:** The method for inviting attendees to a WhatsApp group must avoid being flagged as spam. The proposed solution is sending an invite link via SMS.
- **Taxes:** The system must handle taxes on payments processed through Stripe.
### Assumptions and Constraints
| Type | Description |
| --- | --- |
| **Assumption** | The developer (Brandon A.) is building this as a "passion project," with compensation focused on covering hard costs ($200-$300), not an hourly development rate. Brian Y. and Brandon A. agreed to $1,000 for the project cost. |
| **Assumption** | *The new workflow (register first, then pay) will *(potentially)* eliminate the "pending payment" status, simplifying the process. |
| **Assumption** | 3,000 free emails per month will be sufficient for the client's needs. |
| **Assumption** | The developer can reuse existing code from a previous project to build the custom form builder. |
| **Assumption** | For guest registrations, adding legal language stating the purchaser certifies agreement for all individuals will be legally sufficient. |
| **Assumption** | Co-facilitators will have user accounts with the necessary permissions to upload their receipts/expenses. |
| **Constraint** | **Stripe must be retained** as the payment processor for its features like custom donations and tax handling. |
| **Constraint** | The client has a limited budget, reinforcing the need for the proposed low-cost solution. |
| **Constraint** | Direct modification of the current Acuity system to fix the workflow was researched and determined to be **not possible**, validating the need for a custom build. |
| **Constraint** | The "Community Weekend" event is the most complex scenario and serves as the primary benchmark for the new system's capabilities. |
| **Constraint** | The client is heavily invested in WhatsApp for community management, and the new system must support this workflow. |
### Definitions
| Term | Definition/Clarification |
| --- | --- |
| **Acuity** | The client's current scheduling and registration system which will be replaced. |
| **Community Weekend** | The client's most complex, multi-day event type composed of various sub-events with different pricing structures. |
| **Co-creator/Co-facilitator** | An event collaborator who partners with the host, shares in expenses, and receives a percentage of the net profit. |
| **Day of View** | A user interface designed for managing an event on the day it occurs, primarily for checking in attendees. |
| **Magic Link** | An authentication method where a user receives a unique, single-use link via email to log in without a password. |
| **Railway** | The back-end service platform that will be used to host the application's database and API. |
| **Reciprocity** | A term used by the client to refer to the payment/exchange for the development work. |
| **Twilio** | The proposed third-party platform for handling SMS messaging. |
### Gaps
#### Gaps in Client's Current System (Identified by Client)
- **Poor User Experience:** The workflow of paying first before registering is "intuitively odd" and "energetically strange."
- **No Group Registration:** The current system does not properly handle registrations for multiple people, forcing a cumbersome manual workaround to capture individual waivers.
- **Manual Processes:**
  - **Payment Reconciliation:** Manually matching registrations to Stripe payments is "completely insane" and time-consuming.
  - **Financial Calculation:** The post-retreat financial calculation process is a "ballbreaker," manual, and highly inefficient.
  - **Bulk Personalized Texting:** Sending personalized texts to each attendee is a manual copy-paste process.
- **Inflexible Integration:** The inability to modify Acuity to integrate payment in a more streamlined way is a key technical limitation.
- **Fragmented Data & Reporting:**
  - The client uses Zapier to push data to a Google Sheet to get a consolidated report for complex events, indicating a native reporting deficiency.
  - Expense receipts are stored on a phone and not tracked centrally.
  - Special payments (scholarships) are handled "outside" the main system (e.g., via PayPal), requiring manual tracking.
- **High Recurring Costs:** The current suite of tools (Squarespace, Acuity, Zapier) costs $87-$115 per month.
#### Potential Gaps & Risks in New System
- **[FLAG] Two-Way SMS Functionality:** While confirmed as possible, the exact user experience for how the client will manage two-way SMS conversations (e.g., via Twilio app, integrated dashboard) is not yet defined. This is a critical feature and a potential risk if the implementation is not user-friendly. **Action Item:** This needs to be defined and confirmed.
- **[FLAG] Post-Event Financial Payouts:** It is unclear if the new system (via Stripe) can directly handle payouts to co-creators. Brandon A. noted this as an **action item to research**. The current manual Venmo payment process might persist.
- **[FLAG] Offline Capability for Check-in:** The "Day of View" check-in feature's dependency on internet connectivity was not discussed. **Suggestion/Risk:** A lack of offline functionality could render the feature useless if there is poor connectivity at the event location. This risk should be evaluated.
- **Form Creation Complexity:** The goal is client autonomy in form creation. **Risk:** If the form-builder is not user-friendly, the client may still depend on the developer, negating the intended benefit.
- **Scope Creep:** The project has evolved from a small fix to a full custom system. There is a risk of continued scope creep. **Suggestion:** Clear project boundaries should be defined.
- **Ambiguity on Weather API:** The transcript mentions an "API to look at the weather app" for conditional messages. **Suggestion/Action Item:** It is unclear if this is a required feature or a "nice-to-have" and should be clarified.
- **Multi-Event Cart Functionality:** The ability for a user to register for multiple event instances in one checkout was identified as an "ideal" but potentially complex feature. This is not a "Day 1" priority but represents a potential gap compared to the client's ideal vision.
- **Decisions & Action Items:**
  - **Decision:** The "pending payments" feature will be removed from the new system's scope.
  - **Decision:** The project will proceed as a custom build to replace the existing systems.
  - **Action Item:** Brian Y. to provide Brandon A. with **admin-level access** to the Acuity account to review existing forms and data structures.
  - **Action Item:** Brandon A. to research and define the functionality for financial reconciliation and co-creator payouts.
  - **Action Item:** Brandon A. to investigate and implement the custom form creation functionality and the "pay in person" option.