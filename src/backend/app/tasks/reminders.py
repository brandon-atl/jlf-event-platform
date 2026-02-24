import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..database import async_session
from ..models import AuditLog, Registration, RegistrationStatus
from ..services.email_service import send_escalation_email, send_reminder_email

logger = logging.getLogger(__name__)


async def check_pending_reminders() -> int:
    """Find PENDING_PAYMENT registrations past reminder_delay_minutes and send reminder emails.

    Idempotent: skips registrations that already have reminder_sent_at set.
    Returns the number of reminders sent.
    """
    sent_count = 0
    async with async_session() as db:
        # Load pending registrations with their event and attendee eagerly
        result = await db.execute(
            select(Registration)
            .options(joinedload(Registration.event), joinedload(Registration.attendee))
            .where(
                Registration.status == RegistrationStatus.pending_payment,
                Registration.reminder_sent_at.is_(None),
            )
        )
        registrations = result.unique().scalars().all()

        now = datetime.now(timezone.utc)

        for reg in registrations:
            if not reg.event or not reg.attendee:
                continue

            # Check if enough time has passed since registration was created
            delay = timedelta(minutes=reg.event.reminder_delay_minutes)
            # created_at may be naive (stored without tz); treat as UTC
            created_at = reg.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            if now < created_at + delay:
                continue

            # Send reminder email
            success = await send_reminder_email(reg, reg.event)

            if success:
                reg.reminder_sent_at = now
                sent_count += 1
                logger.info(
                    "Sent payment reminder for registration %s (event: %s)",
                    reg.id,
                    reg.event.name,
                )

        await db.commit()

    logger.info("check_pending_reminders completed: %d reminders sent", sent_count)
    return sent_count


async def send_escalation_reminders() -> int:
    """Send escalation emails for registrations that already received a first reminder
    but still haven't completed payment.

    Uses auto_expire_hours / 2 as the escalation delay after reminder_sent_at.
    Idempotent: skips registrations that already have escalation_sent_at set.
    Returns the number of escalation emails sent.
    """
    sent_count = 0
    async with async_session() as db:
        result = await db.execute(
            select(Registration)
            .options(joinedload(Registration.event), joinedload(Registration.attendee))
            .where(
                Registration.status == RegistrationStatus.pending_payment,
                Registration.reminder_sent_at.isnot(None),
                Registration.escalation_sent_at.is_(None),
            )
        )
        registrations = result.unique().scalars().all()

        now = datetime.now(timezone.utc)

        for reg in registrations:
            if not reg.event or not reg.attendee:
                continue

            # Guard: skip if auto_expire_hours is missing or too small
            if not reg.event.auto_expire_hours or reg.event.auto_expire_hours < 1:
                logger.warning(
                    "Skipping escalation for registration %s: "
                    "event %s has auto_expire_hours=%s",
                    reg.id,
                    reg.event.name,
                    reg.event.auto_expire_hours,
                )
                continue

            # Escalation delay = half the auto-expire window, but never after expiry
            expire_hours = reg.event.auto_expire_hours
            escalation_delay = timedelta(hours=expire_hours / 2)
            reminder_at = reg.reminder_sent_at
            if reminder_at.tzinfo is None:
                reminder_at = reminder_at.replace(tzinfo=timezone.utc)

            # Don't escalate after the registration would have expired
            created = reg.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            expiry_time = created + timedelta(hours=expire_hours)
            if now >= expiry_time:
                continue

            if now < reminder_at + escalation_delay:
                continue

            success = await send_escalation_email(reg, reg.event)

            if success:
                reg.escalation_sent_at = now
                sent_count += 1

                # Audit log
                db.add(
                    AuditLog(
                        entity_type="registration",
                        entity_id=reg.id,
                        action="escalation_sent",
                        actor="system",
                        old_value={"reminder_sent_at": reg.reminder_sent_at.isoformat()},
                        new_value={"escalation_sent_at": now.isoformat()},
                    )
                )

                logger.info(
                    "Sent escalation reminder for registration %s (event: %s)",
                    reg.id,
                    reg.event.name,
                )

        await db.commit()

    logger.info(
        "send_escalation_reminders completed: %d escalation emails sent",
        sent_count,
    )
    return sent_count


async def check_expired_registrations() -> int:
    """Find PENDING_PAYMENT registrations past auto_expire_hours and mark as EXPIRED.

    Idempotent: only processes registrations still in PENDING_PAYMENT status.
    Returns the number of registrations expired.
    """
    expired_count = 0
    async with async_session() as db:
        result = await db.execute(
            select(Registration)
            .options(joinedload(Registration.event))
            .where(Registration.status == RegistrationStatus.pending_payment)
        )
        registrations = result.unique().scalars().all()

        now = datetime.now(timezone.utc)

        for reg in registrations:
            if not reg.event:
                continue

            expire_window = timedelta(hours=reg.event.auto_expire_hours)
            created_at = reg.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            if now < created_at + expire_window:
                continue

            old_status = reg.status
            reg.status = RegistrationStatus.expired
            reg.updated_at = now

            # Audit log entry
            db.add(
                AuditLog(
                    entity_type="registration",
                    entity_id=reg.id,
                    action="status_change",
                    actor="system",
                    old_value={"status": old_status.value},
                    new_value={"status": RegistrationStatus.expired.value},
                )
            )

            expired_count += 1
            logger.info(
                "Auto-expired registration %s (event: %s, created: %s)",
                reg.id,
                reg.event.name,
                reg.created_at,
            )

        await db.commit()

    logger.info(
        "check_expired_registrations completed: %d registrations expired",
        expired_count,
    )
    return expired_count
