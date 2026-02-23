"""Notifications router — send SMS, view notification log."""

import hashlib
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.event import Event
from app.models.notification import (
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
)
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User
from app.schemas.notification import NotificationLogEntry, SMSRequest, SMSResponse
from app.services.auth_service import get_current_operator
from app.services.sms_service import send_sms

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
    content_hash = hashlib.sha256(data.message.encode()).hexdigest()

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
