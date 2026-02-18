# JLF ERP — Integration API Contracts

## Stripe Webhooks

### Events to Subscribe To
- `checkout.session.completed` — primary payment event
- `payment_intent.succeeded` — fallback/confirmation
- `charge.refunded` — refund handling

### Webhook Payload (Key Fields)
```json
{
  "id": "evt_xxx",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_xxx",
      "customer_email": "attendee@example.com",
      "amount_total": 5000,
      "payment_intent": "pi_xxx",
      "payment_link": "plink_xxx",
      "metadata": {}
    }
  }
}
```

### Matching Logic
1. Extract `customer_email` and `payment_link` from payload
2. Look up event via `stripe_payment_link_id` match
3. Upsert AttendeeEvent: find/create attendee by email → set payment_status=PAID

### Security
- Verify ALL webhooks with `stripe.Webhook.construct_event(payload, sig_header, webhook_secret)`
- Reject any unverified webhooks with 400 status

---

## Acuity Scheduling Webhooks

### Events to Subscribe To
- `appointment.scheduled` — new booking
- `appointment.rescheduled` — updated booking
- `appointment.cancelled` — cancellation

### Webhook Payload (Key Fields)
Acuity sends a minimal payload with just the appointment ID. Full data requires API callback.

```json
{
  "action": "scheduled",
  "id": 123456789,
  "appointmentTypeID": 12345,
  "calendarID": 6789
}
```

### Intake Form Extraction
After webhook receipt, call: `GET https://acuityscheduling.com/api/v1/appointments/{id}`
Response includes: email, firstName, lastName, phone, forms[] (intake responses), type (appointment type ID)

### Matching Logic
1. Extract `appointmentTypeID` → match to event via `acuity_appointment_type_id`
2. Extract `email` from API response → find/create attendee
3. Extract intake form responses → store in `intake_data` JSONB + promote standard fields
4. Upsert AttendeeEvent: set booking_status=BOOKED

### Security
- Verify via HMAC signature if available at Acuity's tier
- Validate appointment ID exists via API callback (prevents spoofing)

---

## Outbound: Twilio SMS
- Endpoint: Twilio REST API
- Auth: Account SID + Auth Token
- Send to attendee phone number from attendee record
- Templates stored in events.notification_templates JSONB

## Outbound: Resend Email
- Endpoint: Resend REST API
- Auth: API key
- Send to attendee email
- Templates stored in events.notification_templates JSONB
