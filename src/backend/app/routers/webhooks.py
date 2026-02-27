"""Webhook routers — Stripe + Twilio inbound SMS, idempotent event processing."""

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.attendee import Attendee
from app.models.audit import AuditLog
from app.models.registration import Registration, RegistrationStatus
from app.models.sms_conversation import SmsConversation, SmsDirection
from app.models.webhook import WebhookRaw
from app.services.email_service import send_confirmation_email
from app.services.stripe_service import verify_webhook
from app.utils import normalize_phone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe", status_code=200)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive and process Stripe webhook events.

    All handlers are idempotent — safe to replay.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verify signature
    try:
        event = verify_webhook(payload, sig_header)
    except Exception:
        logger.warning("Webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]
    event_type = event["type"]

    # Idempotency check — skip if already processed
    existing = await db.execute(
        select(WebhookRaw).where(WebhookRaw.stripe_event_id == event_id)
    )
    if existing.scalar_one_or_none():
        logger.info("Duplicate webhook %s — skipping", event_id)
        return {"status": "already_processed"}

    # Store raw payload
    webhook_record = WebhookRaw(
        stripe_event_id=event_id,
        event_type=event_type,
        payload_json=event.to_dict() if hasattr(event, "to_dict") else dict(event),
    )
    db.add(webhook_record)
    await db.flush()

    # Route to handler
    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event, webhook_record, db)
    elif event_type == "checkout.session.expired":
        await _handle_checkout_expired(event, webhook_record, db)
    elif event_type == "charge.refunded":
        await _handle_charge_refunded(event, webhook_record, db)
    else:
        logger.info("Unhandled webhook event type: %s", event_type)

    # Mark as processed
    webhook_record.processed_at = datetime.now(timezone.utc)
    await db.flush()

    return {"status": "processed"}


async def _handle_checkout_completed(event: dict, webhook: WebhookRaw, db: AsyncSession):
    """Handle checkout.session.completed — mark registration as COMPLETE."""
    session = event["data"]["object"]
    registration_id_raw = session.get("client_reference_id")

    if not registration_id_raw:
        logger.warning("checkout.session.completed missing client_reference_id")
        return

    try:
        registration_id = uuid.UUID(str(registration_id_raw))
    except (ValueError, AttributeError):
        logger.warning("checkout.session.completed invalid client_reference_id: %s", registration_id_raw)
        return

    result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = result.scalar_one_or_none()
    if not registration:
        logger.warning("Registration %s not found for completed checkout", registration_id)
        return

    # Idempotent — skip if already complete
    if registration.status == RegistrationStatus.complete:
        return

    old_status = registration.status.value
    registration.status = RegistrationStatus.complete
    registration.stripe_checkout_session_id = session.get("id")
    registration.stripe_payment_intent_id = session.get("payment_intent")
    registration.payment_amount_cents = session.get("amount_total")

    # Audit log
    db.add(
        AuditLog(
            entity_type="registration",
            entity_id=registration.id,
            action="status_change",
            actor="system/stripe",
            old_value={"status": old_status},
            new_value={"status": "complete"},
        )
    )

    # Send confirmation email
    await send_confirmation_email(registration, registration.event)

    logger.info("Registration %s marked COMPLETE via webhook", registration_id)


async def _handle_checkout_expired(event: dict, webhook: WebhookRaw, db: AsyncSession):
    """Handle checkout.session.expired — mark registration as EXPIRED."""
    session = event["data"]["object"]
    registration_id_raw = session.get("client_reference_id")

    if not registration_id_raw:
        logger.warning("checkout.session.expired missing client_reference_id")
        return

    try:
        registration_id = uuid.UUID(str(registration_id_raw))
    except (ValueError, AttributeError):
        logger.warning("checkout.session.expired invalid client_reference_id: %s", registration_id_raw)
        return

    result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = result.scalar_one_or_none()
    if not registration:
        logger.warning("Registration %s not found for expired checkout", registration_id)
        return

    # Only expire if still pending
    if registration.status != RegistrationStatus.pending_payment:
        return

    old_status = registration.status.value
    registration.status = RegistrationStatus.expired

    db.add(
        AuditLog(
            entity_type="registration",
            entity_id=registration.id,
            action="status_change",
            actor="system/stripe",
            old_value={"status": old_status},
            new_value={"status": "expired"},
        )
    )

    logger.info("Registration %s marked EXPIRED via webhook", registration_id)


async def _handle_charge_refunded(event: dict, webhook: WebhookRaw, db: AsyncSession):
    """Handle charge.refunded — mark registration as REFUNDED (or update amount for partial)."""
    charge = event["data"]["object"]
    payment_intent_id = charge.get("payment_intent")

    if not payment_intent_id:
        logger.warning("charge.refunded missing payment_intent")
        return

    result = await db.execute(
        select(Registration).where(
            Registration.stripe_payment_intent_id == payment_intent_id
        )
    )
    registration = result.scalar_one_or_none()
    if not registration:
        logger.warning("Registration not found for payment_intent %s", payment_intent_id)
        return

    old_status = registration.status.value
    amount_refunded = charge.get("amount_refunded", 0)
    amount_total = charge.get("amount", 0)

    if amount_refunded >= amount_total:
        # Full refund
        registration.status = RegistrationStatus.refunded
        db.add(
            AuditLog(
                entity_type="registration",
                entity_id=registration.id,
                action="status_change",
                actor="system/stripe",
                old_value={"status": old_status},
                new_value={"status": "refunded"},
            )
        )
    else:
        # Partial refund — keep COMPLETE, update amount, add note
        registration.payment_amount_cents = amount_total - amount_refunded
        registration.notes = (
            (registration.notes or "")
            + f"\nPartial refund: {amount_refunded} cents refunded."
        ).strip()
        db.add(
            AuditLog(
                entity_type="registration",
                entity_id=registration.id,
                action="partial_refund",
                actor="system/stripe",
                old_value={"payment_amount_cents": amount_total},
                new_value={"payment_amount_cents": amount_total - amount_refunded},
            )
        )

    logger.info(
        "Registration for PI %s processed refund (refunded=%s, total=%s)",
        payment_intent_id,
        amount_refunded,
        amount_total,
    )


# --- ETA Parsing ---

# Patterns: "ETA 3pm", "ETA 3:30pm", "ETA 15:00", "arriving at 3pm",
# "arriving around 3:30", "be there by 4", "be there by 4pm",
# "ill be there around 5", "on my way, about 30 min"
_TIME_PATTERN = re.compile(
    r"(?:eta|arriving\s+(?:at|around)|be\s+there\s+(?:by|around)|ill?\s+be\s+there\s+(?:at|around|by))\s+"
    r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?",
    re.IGNORECASE,
)

_MINUTES_PATTERN = re.compile(
    r"(?:on\s+my\s+way|omw)[\s,]*(?:about|around|approx(?:imately)?)?\s*(\d+)\s*min(?:ute)?s?",
    re.IGNORECASE,
)


def parse_eta(body: str, now: datetime | None = None) -> datetime | None:
    """Parse ETA from SMS body. Returns a datetime or None if no ETA detected."""
    if now is None:
        now = datetime.now(timezone.utc)

    # Check for "X minutes" pattern first
    minutes_match = _MINUTES_PATTERN.search(body)
    if minutes_match:
        minutes = int(minutes_match.group(1))
        if 0 < minutes <= 480:  # sanity: max 8 hours
            return now + timedelta(minutes=minutes)

    # Check for absolute time pattern
    time_match = _TIME_PATTERN.search(body)
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2)) if time_match.group(2) else 0
        ampm = time_match.group(3)

        if ampm:
            ampm = ampm.lower()
            if ampm == "pm" and hour != 12:
                hour += 12
            elif ampm == "am" and hour == 12:
                hour = 0
        else:
            # No am/pm — assume PM for hours 1-7, keep 8-11 as AM,
            # and 12 as noon (PM) since events are daytime
            if 1 <= hour <= 7:
                hour += 12
            # hour 8-11 stays as-is (AM); hour 12 stays as 12 (noon/PM)

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            eta = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            # If the time is in the past, assume tomorrow
            if eta < now:
                eta += timedelta(days=1)
            return eta

    return None


# --- Twilio Inbound Webhook ---


@router.post("/twilio/inbound", status_code=200)
async def twilio_inbound_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive inbound SMS from Twilio.

    Stores raw payload, creates conversation record, parses ETA if present.
    Returns TwiML empty <Response/>.
    """
    # Twilio sends form-encoded data
    form_data = await request.form()
    form_dict = dict(form_data)

    # Validate Twilio signature if auth token is configured
    if settings.twilio_auth_token:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(settings.twilio_auth_token)
        signature = request.headers.get("X-Twilio-Signature", "")
        url = str(request.url)
        if not validator.validate(url, form_dict, signature):
            logger.warning("Twilio signature validation failed")
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")
    else:
        logger.warning("TWILIO_AUTH_TOKEN not configured — skipping signature validation")

    # Validate expected fields
    from_phone = form_dict.get("From")
    body = form_dict.get("Body", "")
    twilio_sid = form_dict.get("MessageSid")

    if not from_phone:
        logger.warning("Twilio inbound webhook missing 'From' field")
        raise HTTPException(status_code=400, detail="Missing 'From' field")

    # Idempotency: check if we've already processed this SID
    if twilio_sid:
        existing = await db.execute(
            select(WebhookRaw).where(WebhookRaw.twilio_sid == twilio_sid)
        )
        if existing.scalar_one_or_none():
            logger.info("Duplicate Twilio webhook SID %s — skipping", twilio_sid)
            return _twiml_response()

    # Store raw webhook
    webhook_record = WebhookRaw(
        source="twilio",
        twilio_sid=twilio_sid,
        event_type="sms.inbound",
        payload_json=form_dict,
    )
    db.add(webhook_record)
    await db.flush()

    # Normalize phone for consistent matching
    normalized_phone = normalize_phone(from_phone) or from_phone

    # Find attendee by phone number (try normalized first, fall back to raw)
    attendee_result = await db.execute(
        select(Attendee).where(
            Attendee.phone.in_([normalized_phone, from_phone])
        ).limit(1)
    )
    attendee = attendee_result.scalar_one_or_none()

    # Find most recent active registration for this phone
    registration_id = None
    if attendee:
        reg_result = await db.execute(
            select(Registration)
            .where(
                Registration.attendee_id == attendee.id,
                Registration.status.in_([
                    RegistrationStatus.complete,
                    RegistrationStatus.cash_pending,
                ]),
            )
            .order_by(Registration.created_at.desc())
            .limit(1)
        )
        reg = reg_result.scalar_one_or_none()
        if reg:
            registration_id = reg.id

    # Store in sms_conversations
    conversation = SmsConversation(
        registration_id=registration_id,
        attendee_phone=from_phone,
        direction=SmsDirection.inbound,
        body=body,
        twilio_sid=twilio_sid,
    )
    db.add(conversation)

    # Parse ETA from message body
    eta = parse_eta(body)
    if eta and registration_id:
        result = await db.execute(
            select(Registration).where(Registration.id == registration_id)
        )
        registration = result.scalar_one_or_none()
        if registration:
            registration.estimated_arrival = eta
            logger.info(
                "Updated ETA for registration %s to %s from SMS",
                registration_id,
                eta.isoformat(),
            )

    # Mark webhook as processed
    webhook_record.processed_at = datetime.now(timezone.utc)
    await db.flush()

    return _twiml_response()


def _twiml_response():
    """Return empty TwiML response."""
    from fastapi.responses import Response
    return Response(
        content="<?xml version='1.0' encoding='UTF-8'?><Response/>",
        media_type="application/xml",
    )
