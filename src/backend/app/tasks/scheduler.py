import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .day_of_sms import send_day_of_notifications
from .reminders import (
    check_expired_registrations,
    check_pending_reminders,
    send_escalation_reminders,
)

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Initialize and start the background task scheduler.

    Called during FastAPI app lifespan startup.
    """
    scheduler.add_job(
        check_pending_reminders,
        "interval",
        minutes=15,
        id="check_pending_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        check_expired_registrations,
        "interval",
        minutes=15,
        id="check_expired_registrations",
        replace_existing=True,
    )
    scheduler.add_job(
        send_escalation_reminders,
        "interval",
        minutes=15,
        id="send_escalation_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        send_day_of_notifications,
        "interval",
        minutes=30,
        id="send_day_of_notifications",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started with 4 periodic jobs")


def stop_scheduler() -> None:
    """Shut down the scheduler gracefully.

    Called during FastAPI app lifespan shutdown.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
