"""Stripe webhook router — idempotent event processing."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog
from app.models.registration import Registration, RegistrationStatus
from app.models.webhook import WebhookRaw
from app.services.email_service import send_confirmation_email
from app.services.stripe_service import verify_webhook

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

    return {"status": "processed"}


async def _handle_checkout_completed(event: dict, webhook: WebhookRaw, db: AsyncSession):
    """Handle checkout.session.completed — mark registration as COMPLETE."""
    session = event["data"]["object"]
    registration_id = session.get("client_reference_id")

    if not registration_id:
        logger.warning("checkout.session.completed missing client_reference_id")
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
    registration_id = session.get("client_reference_id")

    if not registration_id:
        logger.warning("checkout.session.expired missing client_reference_id")
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
