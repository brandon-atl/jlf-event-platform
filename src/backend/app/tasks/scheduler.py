import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .day_of_sms import send_day_of_notifications
from .reminders import send_event_reminders

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Initialize and start the background task scheduler.

    Called during FastAPI app lifespan startup.

    NOTE: Payment-chase jobs (check_pending_reminders, check_expired_registrations,
    send_escalation_reminders) were removed in v4 per ADR-016. PENDING_PAYMENT is
    now transient — no auto-expire or reminder timers needed.
    """
    scheduler.add_job(
        send_day_of_notifications,
        "interval",
        minutes=30,
        id="send_day_of_notifications",
        replace_existing=True,
    )

    # Event reminders: 1-day and 7-day before event (runs daily at 9am UTC)
    scheduler.add_job(
        send_event_reminders,
        "cron",
        hour=9,
        minute=0,
        id="send_event_reminders",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started with 2 periodic jobs")


def stop_scheduler() -> None:
    """Shut down the scheduler gracefully.

    Called during FastAPI app lifespan shutdown.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
