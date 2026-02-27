# JLF ERP — Edge Cases & Exception Handling (PRD v4)

> **Changelog (v4):** Rewrote pending payment handling (no more auto-expire chain). Added cash payment,
> multi-guest, composite event, form builder, two-way SMS, financial module, scholarship, and
> membership edge cases.

## Registration & Payment

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Attendee abandons Stripe Checkout (never pays) | `pending_payment` status + Stripe `checkout.session.expired` webhook | Mark as EXPIRED. No reminder/escalation chain — just expire. Attendee can re-register. | System |
| Cash payment never collected | `cash_pending` status persists past event date | Dashboard shows "Cash Pending" count. Operator follows up manually. No auto-expire. | Operator |
| Group payment (one person pays for multiple) | `group_id` links registrations | All registrations in group share same `stripe_checkout_session_id`. Stripe Checkout has combined total. Each attendee gets own registration row + intake data + waiver. | System |
| Multi-guest: payer is not attending | Payer email not in guests array | Allow — payer creates group, each guest fills own form. Payer gets payment receipt; guests get registration confirmations. | System |
| Multi-guest: one guest already registered | Unique constraint on (attendee_id, event_id) | Reject that guest with specific error; allow rest of group to proceed. | System |
| Duplicate registration (same email, same event) | Unique constraint on (attendee_id, event_id) | Reject duplicate; return 409 with helpful message | System |
| Walk-in attendee (no prior registration) | Manual entry by operator | Operator creates record via dashboard; marks source=walk_in + payment_method=cash | Operator |
| Refund issued after event | Stripe `charge.refunded` webhook | Update status to REFUNDED; flag in dashboard; recalculate settlement if exists; do not delete record | System |
| Partial refund | Stripe `charge.refunded` with partial amount | Update `payment_amount_cents`; keep status as COMPLETE with note; recalculate settlement | System |
| Attendee name ≠ Stripe billing name | Payer pays for someone else, or billing info differs | **Always use form-submitted name** (ADR-012). Never overwrite attendee name from Stripe billing info. | System |
| Scholarship code already used up | `scholarship_links.uses >= max_uses` | Return error: "This scholarship link has been fully redeemed." Fall back to standard pricing. | System |
| Scholarship + membership double discount | Both applicable to same registration | Apply only one — scholarship ($30 flat) always wins over membership ($25 off) since scholarship results in lower price. If membership discount would be larger (event < $55), apply membership instead. | System |
| Member discount on composite sub-event | Member registers for Community Weekend with mixed pricing | Apply $25 off the total of all selected sub-events. If total after sub-events < $25, event is free for member. | System |
| Membership cap reached (3 per event) | 4th member tries to register | Show "Membership discount slots are full for this event" — allow registration at full price. | System |
| Scholarship code used on wrong event | Code is event-specific | Return error: "This scholarship code is not valid for this event." | System |

## Composite Events

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Attendee selects no sub-events | Registration submitted with empty sub_event selection | Require at least one sub-event selection. Return 400 if empty. | System |
| Sub-event reaches capacity independently | `registration_sub_events` count for sub_event >= sub_event capacity | Mark that sub-event as full in registration form. Allow registration for other sub-events. | System |
| Parent event cancelled but sub-events have registrations | Admin cancels composite event | Cancel all registrations for all sub-events. Trigger refunds for paid registrations. | System + Operator |
| Attendee wants to add sub-event after initial registration | Attendee contacts admin | Operator edits registration, adds sub-event, triggers supplemental Stripe payment if needed. | Operator |
| Donation amount of $0 for donation-based sub-event | Attendee enters $0 | Allow — donation-based means any amount including $0. Don't create Stripe line item for $0 sub-events. | System |

## Form Builder

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Form template edited after registrations exist | Admin edits a template linked to an active event | Changes only affect future registrations. Existing `intake_data` JSONB is immutable. Old field IDs preserved in JSONB even if removed from template. | System |
| Form template deleted while linked to event | Admin tries to delete | Block deletion if linked to any active event. Return 409. Suggest unlinking first. | System |
| Required field left blank | Client-side + server-side validation | Return 400 with per-field error messages. | System |
| Form field ID collision across templates | Two templates attached to same event with same field IDs | Namespace intake_data by form_template_id: `{template_id: {field_id: value}}`. No collision possible. | System |
| Event has no forms attached | New event without form configuration | Allow registration with just standard fields (name, email, phone, dietary, accommodation). Forms are optional enhancement. | System |

## Recurring Events

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Recurring event instance cancelled | Admin cancels one date | Only cancel registrations for that specific date. Other instances unaffected. | Operator |
| Recurring event rule changed | Admin modifies recurrence_rule | Regenerate future dates. Existing registrations for past/current dates unchanged. | System |
| Attendee registers for date that's now cancelled | Race condition between cancellation and registration | Registration endpoint checks date validity. Return 400 if date is cancelled. | System |
| Max dates in date picker | Recurring event with no end date | Cap at 12 months out. Don't generate infinite dates. | System |

## Communications

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Inbound SMS from unknown number | Phone not found in `attendees.phone` | Store in `sms_conversations` with `registration_id=null`. Show in admin inbox as "Unknown Sender". | System |
| ETA parse failure | Inbound SMS doesn't contain recognizable time | Store message normally; don't update `estimated_arrival`. Admin can manually set ETA. | System |
| Attendee replies STOP | Twilio opt-out keyword | Twilio handles automatically. Log in `sms_conversations`. Mark attendee's phone as opted-out (add `sms_opted_out` boolean if needed). | System |
| Email delivery failure | Resend delivery webhook with failure status | Log failure in `notifications_log`. Retry once after 5 minutes. Alert operator if persistent. | System |
| SMS blast to attendee with cash_pending status | Should day-of SMS include people who haven't paid? | Yes — include `cash_pending` and `complete` registrations in day-of SMS. They're expected to attend. | Config |

## Financial Module

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Settlement calculated before all expenses submitted | Co-creator uploads receipt after settlement | Allow recalculation — creates new settlement version. Show diff between versions. | System |
| Expense submitted for event with no registrations | Event exists but $0 revenue | Allow — expense still valid. Settlement shows negative net. | System |
| Split percentages don't add to 100% | Admin configures splits | Validate on save — must sum to exactly 100%. Return 400 if not. | System |
| Receipt image too large | Upload exceeds 10MB limit | Return 413 with size limit message. | System |
| Stripe fees not yet available | Settlement calculated before Stripe reports fees | Use estimated fees (2.9% + $0.30 per transaction) until actual fees available via Stripe API. Flag as estimated. | System |
| Co-creator leaves mid-event | Co-creator removed from event | Freeze their split at time of removal. Remaining co-creators redistribute. | Operator |
| Operating expense submitted without receipt | `receipt_image_url` is null | Allow — receipt is optional. Flag in UI as "no receipt". | System |
| Refund issued after settlement calculated | Stripe refund webhook arrives post-settlement | Auto-flag settlement as stale. Prompt admin to recalculate. Don't auto-recalculate. | System |

## Check-In & Day-Of

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Check-in with no connectivity | Forest location has poor signal | **Open Question (Q4):** Consider PWA with service worker cache. Offline check-ins sync when reconnected. | TBD |
| Attendee checked in but not on roster | Walk-in or registration error | Operator creates walk-in registration via dashboard. Check-in recorded. | Operator |
| Late arrival with ETA | `estimated_arrival` set via SMS | Display ETA in Day-of View. Flag as "arriving late" if ETA > event start + 30 min. | System |

## Webhooks & Infrastructure

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Stripe webhook delivery failure | Missing expected update after payment | Stripe retries automatically (up to 72h); idempotent handlers; daily reconciliation cron as safety net | System |
| Stripe Checkout session expires | Stripe `checkout.session.expired` webhook | Mark record as EXPIRED. Attendee can re-register. | System |
| Double webhook delivery (Stripe) | Same `stripe_event_id` received twice | Check `webhooks_raw` for existing event_id; skip if already processed | System |
| Double webhook delivery (Twilio) | Same `MessageSid` received twice | Check `webhooks_raw.twilio_sid`; skip if already processed | System |
| Twilio webhook verification failure | Invalid signature | Reject with 403. Log attempt. Do not process message. | System |
| Event capacity reached | Registration count >= event.capacity | Return 403 with waitlist message; optionally auto-waitlist | System |
| Accommodation type requested but unavailable | All bell tents full | Show real-time availability on form. If race condition, return 409 with suggestion to pick another option. | System |
