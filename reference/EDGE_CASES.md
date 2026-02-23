# JLF ERP — Edge Cases & Exception Handling (PRD v3)

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Attendee abandons after form, before payment | PENDING_PAYMENT records past reminder threshold | Auto email reminder → auto-expire after configurable window (default 24h) | System |
| Group payment (one person pays for multiple) | Stripe amount >> event price; or metadata indicates multiple | Flag payment; operator assigns to individual records manually | System + Operator |
| Duplicate registration (same email, same event) | Unique constraint on (attendee_id, event_id) | Reject duplicate; return 409 with helpful message | System |
| Walk-in attendee (no prior registration) | Manual entry by operator | Operator creates record via dashboard; marks as walk-in + payment method | Operator |
| Refund issued after event | Stripe `charge.refunded` webhook | Update status to REFUNDED; flag in dashboard; do not delete record | System |
| Stripe webhook delivery failure | Missing expected update after payment | Stripe retries automatically (up to 72h); idempotent handlers; daily reconciliation cron as safety net | System |
| Attendee requests accommodation change | Co-host or attendee contacts Brian | Operator edits accommodation_type via dashboard; logged in audit trail | Operator |
| Stripe Checkout session expires | Stripe `checkout.session.expired` webhook | Mark record as EXPIRED; send notification offering to try again | System |
| Cash payment at event | Operator records in dashboard | Operator marks as paid (cash) with note; logged in audit trail | Operator |
| Comped/free attendee | Operator records in dashboard | Operator creates registration with source=manual, adds note; no Stripe involved | Operator |
| Event capacity reached | Registration count >= event.capacity | Return 403 with waitlist message; optionally auto-waitlist | System |
| Double webhook delivery | Same stripe_event_id received twice | Check webhooks_raw for existing stripe_event_id; skip if already processed | System |
| Email delivery failure | Resend/SendGrid delivery webhook or API error | Log failure in notifications_log; retry once; alert operator if persistent | System |
| Partial refund | Stripe `charge.refunded` with partial amount | Update payment_amount_cents; keep status as COMPLETE with note | System |
