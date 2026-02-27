"""Event-based reminder tasks — 7-day and 1-day before event.

Payment-chase reminders (pending_payment auto-expire, escalation emails) were
removed in v4 per ADR-016. PENDING_PAYMENT is now transient (seconds during
Stripe redirect) — no timer/reminder logic needed.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..database import async_session
from ..models import (
    Event,
    EventStatus,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    Registration,
    RegistrationStatus,
)
from ..services.email_service import send_event_reminder_email
from ..services.sms_service import send_sms

logger = logging.getLogger(__name__)


async def send_event_reminders() -> int:
    """Send event reminders to COMPLETE + CASH_PENDING attendees.

    Runs daily. Checks for events happening in 1 day or 7 days.
    Idempotent: checks notifications_log before sending.

    Returns the total number of notifications sent.
    """
    sent_count = 0
    now = datetime.now(timezone.utc)

    async with async_session() as db:
        # Find active events happening in 1 day or 7 days
        result = await db.execute(
            select(Event).where(Event.status == EventStatus.active)
        )
        events = result.scalars().all()

        for event in events:
            event_date = event.event_date
            if event_date is None:
                continue
            if event_date.tzinfo is None:
                event_date = event_date.replace(tzinfo=timezone.utc)

            # Normalize to UTC for consistent date comparison
            event_date_utc = event_date.astimezone(timezone.utc)
            days_until = (event_date_utc.date() - now.date()).days

            if days_until == 1:
                reminder_type = "1d"
                template_id = "reminder_1d"
            elif days_until == 7:
                reminder_type = "7d"
                template_id = "reminder_7d"
            else:
                continue

            logger.info(
                "Sending %s reminders for event %s (%s)",
                reminder_type, event.name, event.slug,
            )

            # Get registrations with active statuses
            reg_result = await db.execute(
                select(Registration)
                .options(joinedload(Registration.attendee))
                .where(
                    Registration.event_id == event.id,
                    Registration.status.in_([
                        RegistrationStatus.complete,
                        RegistrationStatus.cash_pending,
                    ]),
                )
            )
            registrations = reg_result.unique().scalars().all()

            meeting_point = event.meeting_point_a or "See event details"

            for reg in registrations:
                if not reg.attendee:
                    continue

                # Idempotency: check if reminder already sent
                existing = await db.execute(
                    select(NotificationLog).where(
                        NotificationLog.registration_id == reg.id,
                        NotificationLog.template_id == template_id,
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                attendee = reg.attendee
                content_key = f"{template_id}:{event.id}:{reg.id}"
                content_hash = hashlib.sha256(content_key.encode()).hexdigest()[:64]

                # Send email
                if attendee.email:
                    email_success = await send_event_reminder_email(
                        reg, event, reminder_type
                    )
                    db.add(NotificationLog(
                        registration_id=reg.id,
                        channel=NotificationChannel.email,
                        template_id=template_id,
                        content_hash=content_hash,
                        status=(
                            NotificationStatus.sent
                            if email_success
                            else NotificationStatus.failed
                        ),
                    ))
                    if email_success:
                        sent_count += 1

                # Send SMS (with idempotency check)
                sms_template_id = f"{template_id}_sms"
                if attendee.phone:
                    existing_sms = await db.execute(
                        select(NotificationLog).where(
                            NotificationLog.registration_id == reg.id,
                            NotificationLog.template_id == sms_template_id,
                        )
                    )
                    if existing_sms.scalar_one_or_none():
                        continue

                    event_date_str = event.event_date.strftime("%B %d, %Y")
                    if reminder_type == "1d":
                        sms_body = (
                            f"Hi {attendee.first_name}, reminder: {event.name} is tomorrow! "
                            f"Meeting point: {meeting_point}. See you at Just Love Forest!"
                        )
                    else:
                        sms_body = (
                            f"Hi {attendee.first_name}, {event.name} is coming up on "
                            f"{event_date_str}! Looking forward to seeing you."
                        )

                    sms_success = await send_sms(attendee.phone, sms_body)
                    db.add(NotificationLog(
                        registration_id=reg.id,
                        channel=NotificationChannel.sms,
                        template_id=f"{template_id}_sms",
                        content_hash=hashlib.sha256(sms_body.encode()).hexdigest()[:64],
                        status=(
                            NotificationStatus.sent
                            if sms_success
                            else NotificationStatus.failed
                        ),
                    ))
                    if sms_success:
                        sent_count += 1

        await db.commit()

    logger.info("send_event_reminders completed: %d notifications sent", sent_count)
    return sent_count
