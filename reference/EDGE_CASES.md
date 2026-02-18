# JLF ERP — Edge Case Handling Matrix

| Edge Case | Detection | Handling | Actor |
|---|---|---|---|
| Different email for Stripe vs Acuity | Unmatched after reminder window | Flag NEEDS_REVIEW; exception queue in dashboard; manual merge UI | System + Operator |
| Group payment (one pays for many) | Amount >> event price, or metadata | Flag payment; operator assigns to individuals | System + Operator |
| Duplicate payment (same email+event) | Duplicate detection: email + event + 24h window | Flag; prevent double-counting; operator reviews for refund | System + Operator |
| Duplicate booking (same email+event) | UNIQUE constraint on attendee_id + event_id | Reject; log attempt; update if data changed | System |
| Walk-in (no prior payment/booking) | Manual entry | Operator creates record via dashboard; marks walk-in + payment method | Operator |
| Refund after event | Stripe charge.refunded webhook | Update payment_status=REFUNDED; flag in dashboard; retain record | System |
| Acuity cancellation | appointment.cancelled webhook | Update booking_status=CANCELLED; retain payment for refund review | System |
| Webhook delivery failure | Missing expected update | Stripe auto-retries (72h); dead-letter logging; daily reconciliation cron | System |
| Tent upgrade mid-registration | Co-host or attendee contacts Brian | Operator edits accommodation_type via dashboard | Operator |
