import logging

from twilio.rest import Client

from app.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> Client | None:
    if settings.twilio_account_sid and settings.twilio_auth_token:
        return Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return None


async def send_sms(to: str, body: str) -> bool:
    """Send an SMS via Twilio. Returns True on success."""
    client = _get_client()
    if not client:
        logger.warning("Twilio not configured — skipping SMS to %s", to)
        return False
    try:
        client.messages.create(
            body=body,
            from_=settings.twilio_phone_number,
            to=to,
        )
        return True
    except Exception:
        logger.exception("Failed to send SMS to %s", to)
        return False


async def send_day_of_sms(to_phone: str, event_name: str, meeting_point: str) -> bool:
    """Send a day-of logistics SMS with event name and meeting point."""
    body = (
        f"Hi! Today is the day — {event_name} at Just Love Forest. "
        f"Your meeting point: {meeting_point}. "
        f"See you soon!"
    )
    return await send_sms(to_phone, body)
