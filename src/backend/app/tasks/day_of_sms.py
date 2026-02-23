import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..database import async_session
from ..models import Event, NotificationLog, Registration
from ..models.models import (
    EventStatus,
    NotificationChannel,
    NotificationStatus,
    RegistrationStatus,
)
from ..services.sms_service import send_day_of_sms

logger = logging.getLogger(__name__)


async def send_day_of_notifications() -> int:
    """Send day-of logistics SMS to COMPLETE attendees for events happening today.

    Only sends for events that have day_of_sms_time configured. Checks the
    current time against day_of_sms_time to decide whether to send.
    Idempotent: checks notifications_log to avoid duplicate sends.

    Returns the number of SMS messages sent.
    """
    sent_count = 0
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    async with async_session() as db:
        # Find active events happening today with SMS configured
        result = await db.execute(
            select(Event).where(
                Event.status == EventStatus.ACTIVE,
                Event.day_of_sms_time.isnot(None),
            )
        )
        events = result.scalars().all()

        for event in events:
            # Check if event is today
            event_date = event.event_date
            if event_date.tzinfo is None:
                event_date = event_date.replace(tzinfo=timezone.utc)
            if event_date.strftime("%Y-%m-%d") != today_str:
                continue

            # Parse day_of_sms_time (stored as "HH:MM" string)
            try:
                sms_hour, sms_minute = map(int, event.day_of_sms_time.split(":"))
            except (ValueError, AttributeError):
                logger.warning(
                    "Invalid day_of_sms_time for event %s: %s",
                    event.id,
                    event.day_of_sms_time,
                )
                continue

            # Only send if current time is within the 30-minute job window
            sms_time_utc = event_date.replace(
                hour=sms_hour, minute=sms_minute, second=0, microsecond=0
            )
            time_diff = (now - sms_time_utc).total_seconds()
            if time_diff < 0 or time_diff > 1800:  # not yet time or past window
                continue

            # Get all COMPLETE registrations with attendee data
            reg_result = await db.execute(
                select(Registration)
                .options(joinedload(Registration.attendee))
                .where(
                    Registration.event_id == event.id,
                    Registration.status == RegistrationStatus.COMPLETE,
                )
            )
            registrations = reg_result.unique().scalars().all()

            meeting_point = event.meeting_point_a or "See event details"

            for reg in registrations:
                if not reg.attendee or not reg.attendee.phone:
                    continue

                # Idempotency: check if we already sent day-of SMS for this registration
                existing = await db.execute(
                    select(NotificationLog).where(
                        NotificationLog.registration_id == reg.id,
                        NotificationLog.template_id == "day_of_sms",
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                success = await send_day_of_sms(
                    to_phone=reg.attendee.phone,
                    event_name=event.name,
                    meeting_point=meeting_point,
                )

                db.add(
                    NotificationLog(
                        registration_id=reg.id,
                        channel=NotificationChannel.SMS,
                        template_id="day_of_sms",
                        status=(
                            NotificationStatus.SENT
                            if success
                            else NotificationStatus.FAILED
                        ),
                    )
                )

                if success:
                    sent_count += 1
                    logger.info(
                        "Sent day-of SMS to %s for event %s",
                        reg.attendee.phone,
                        event.name,
                    )

        await db.commit()

    logger.info("send_day_of_notifications completed: %d SMS sent", sent_count)
    return sent_count
