"""Notifications router — send SMS, bulk messaging, view notification log."""

import hashlib
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.message_template import MessageTemplate
from app.models.notification import (
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
)
from app.models.registration import Registration, RegistrationStatus
from app.models.sms_conversation import SmsConversation, SmsDirection
from app.models.user import User
from app.schemas.notification import NotificationLogEntry, SMSRequest, SMSResponse
from app.schemas.sms_conversations import BulkNotificationRequest, BulkNotificationResponse
from app.services.auth_service import get_current_operator
from app.services.email_service import send_branded_email
from app.services.sms_service import send_sms
from app.utils import render_template_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])


@router.post(
    "/events/{event_id}/notifications/sms",
    response_model=SMSResponse,
)
async def send_event_sms(
    event_id: UUID,
    data: SMSRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_operator),
):
    """Send a day-of SMS to all COMPLETE attendees for an event."""
    # Verify event exists
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all COMPLETE registrations with attendee phone numbers
    result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.complete,
        )
    )
    registrations = result.scalars().all()

    sent_count = 0
    failed_count = 0
    content_hash = hashlib.sha256(data.message.encode()).hexdigest()[:64]

    for reg in registrations:
        attendee = reg.attendee
        if not attendee or not attendee.phone:
            failed_count += 1
            continue

        success = await send_sms(attendee.phone, data.message)

        log_entry = NotificationLog(
            registration_id=reg.id,
            channel=NotificationChannel.sms,
            template_id="day_of_sms",
            content_hash=content_hash,
            status=NotificationStatus.sent if success else NotificationStatus.failed,
        )
        db.add(log_entry)

        if success:
            sent_count += 1
        else:
            failed_count += 1

    logger.info(
        "SMS blast for event %s: %d sent, %d failed",
        event_id,
        sent_count,
        failed_count,
    )

    return SMSResponse(sent_count=sent_count, failed_count=failed_count)


@router.get("/notifications/log", response_model=list[NotificationLogEntry])
async def get_notification_log(
    event_id: UUID | None = Query(None),
    channel: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_operator),
):
    """View sent notifications, optionally filtered by event and channel."""
    query = select(NotificationLog).order_by(NotificationLog.sent_at.desc())

    if event_id:
        query = query.join(Registration).where(Registration.event_id == event_id)

    if channel:
        try:
            ch = NotificationChannel(channel)
            query = query.where(NotificationLog.channel == ch)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid channel")

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        NotificationLogEntry(
            id=log.id,
            registration_id=log.registration_id,
            channel=log.channel.value,
            template_id=log.template_id,
            sent_at=log.sent_at,
            status=log.status.value,
        )
        for log in logs
    ]


def _build_attendee_variables(registration: Registration, event: Event) -> dict[str, str]:
    """Build template variable dict for an attendee/registration."""
    from app.config import settings

    attendee = registration.attendee
    event_date_str = event.event_date.strftime("%B %d, %Y") if event.event_date else ""
    event_time_str = event.event_date.strftime("%I:%M %p") if event.event_date else ""
    meeting_point = event.meeting_point_a or "See event details for directions"
    cancel_url = f"{settings.app_url}/register/{event.slug}/cancel?reg={registration.id}"

    return {
        "first_name": attendee.first_name if attendee else "",
        "last_name": attendee.last_name if attendee else "",
        "email": attendee.email if attendee else "",
        "phone": attendee.phone or "" if attendee else "",
        "event_name": event.name,
        "event_date": event_date_str,
        "event_time": event_time_str,
        "meeting_point": meeting_point,
        "cancel_url": cancel_url,
    }


@router.post(
    "/events/{event_id}/notifications/bulk",
    response_model=BulkNotificationResponse,
)
async def send_bulk_notification(
    event_id: UUID,
    data: BulkNotificationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_operator),
):
    """Send personalized message to all COMPLETE + CASH_PENDING attendees."""
    # Verify event exists
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Validate channel
    if data.channel not in ("sms", "email", "both"):
        raise HTTPException(status_code=422, detail="Channel must be sms, email, or both")

    # Get template if provided
    template = None
    if data.template_id:
        tmpl_result = await db.execute(
            select(MessageTemplate).where(MessageTemplate.id == data.template_id)
        )
        template = tmpl_result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

    if not template and not data.custom_message:
        raise HTTPException(status_code=422, detail="Either template_id or custom_message is required")

    # Generate idempotency key from request data if not provided
    if data.idempotency_key:
        idempotency_key = data.idempotency_key
    else:
        key_source = f"{event_id}:{data.channel}:{data.template_id or ''}:{data.custom_message or ''}"
        idempotency_key = hashlib.sha256(key_source.encode()).hexdigest()[:32]

    # Get registrations
    result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.status.in_([
                RegistrationStatus.complete,
                RegistrationStatus.cash_pending,
            ]),
        )
    )
    registrations = result.scalars().all()

    sent_count = 0
    failed_count = 0
    skipped = 0

    for reg in registrations:
        attendee = reg.attendee
        if not attendee:
            failed_count += 1
            continue

        # Build variables
        variables = _build_attendee_variables(reg, event)

        # Render message
        if template:
            body_text = render_template_text(template.body, variables)
            subject_text = render_template_text(template.subject, variables) if template.subject else None
        else:
            body_text = render_template_text(data.custom_message, variables)
            subject_text = render_template_text(data.subject, variables) if data.subject else f"Message from Just Love Forest"

        content_hash = hashlib.sha256(body_text.encode()).hexdigest()[:64]

        # Idempotency: check if this registration already received this bulk send
        bulk_template_key = f"bulk:{idempotency_key}"
        existing_log = await db.execute(
            select(NotificationLog).where(
                NotificationLog.registration_id == reg.id,
                NotificationLog.template_id == bulk_template_key,
            )
        )
        if existing_log.first():
            skipped += 1
            continue
        success = False

        # Send SMS
        if data.channel in ("sms", "both") and attendee.phone:
            sms_success = await send_sms(attendee.phone, body_text)
            db.add(NotificationLog(
                registration_id=reg.id,
                channel=NotificationChannel.sms,
                template_id=bulk_template_key,
                content_hash=content_hash,
                status=NotificationStatus.sent if sms_success else NotificationStatus.failed,
            ))
            # Store in sms_conversations
            db.add(SmsConversation(
                registration_id=reg.id,
                attendee_phone=attendee.phone,
                direction=SmsDirection.outbound,
                body=body_text,
                sent_by=user.id,
            ))
            if sms_success:
                success = True

        # Send email
        if data.channel in ("email", "both") and attendee.email:
            email_success = await send_branded_email(
                to=attendee.email,
                subject=subject_text,
                body_text=body_text,
            )
            db.add(NotificationLog(
                registration_id=reg.id,
                channel=NotificationChannel.email,
                template_id=bulk_template_key,
                content_hash=content_hash,
                status=NotificationStatus.sent if email_success else NotificationStatus.failed,
            ))
            if email_success:
                success = True

        if success:
            sent_count += 1
        else:
            failed_count += 1

    await db.commit()

    logger.info(
        "Bulk notification for event %s (channel=%s): %d sent, %d failed, %d skipped",
        event_id, data.channel, sent_count, failed_count, skipped,
    )

    return BulkNotificationResponse(
        sent_count=sent_count,
        failed_count=failed_count,
        channel=data.channel,
    )
