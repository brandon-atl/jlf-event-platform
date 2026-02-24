import logging

import resend

from app.config import settings
from app.models.event import Event
from app.models.registration import Registration

logger = logging.getLogger(__name__)

resend.api_key = settings.resend_api_key

FROM_EMAIL = f"Just Love Forest <{settings.from_email}>"


async def send_confirmation_email(registration: Registration, event: Event) -> bool:
    """Send registration confirmation email."""
    attendee = registration.attendee
    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": f"You're confirmed for {event.name}!",
                "html": (
                    f"<h2>Welcome, {attendee.first_name}!</h2>"
                    f"<p>Your registration for <strong>{event.name}</strong> is confirmed.</p>"
                    f"<p>Date: {event.event_date.strftime('%B %d, %Y')}</p>"
                    f"<p>We look forward to seeing you at Just Love Forest!</p>"
                ),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send confirmation email to %s", attendee.email)
        return False


async def send_magic_link_email(email: str, name: str, token: str) -> bool:
    """Send a magic link login email to a co-creator."""
    link = f"{settings.app_url}/auth/verify?token={token}"
    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [email],
                "subject": "Your Just Love Forest portal login link",
                "html": (
                    f"<h2>Hi {name},</h2>"
                    f"<p>Click below to access the Just Love Forest co-creator portal:</p>"
                    f'<p><a href="{link}">Open Portal</a></p>'
                    f"<p>This link expires in {settings.magic_link_expiration_hours} hours.</p>"
                ),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send magic link to %s", email)
        return False


async def send_reminder_email(registration: Registration, event: Event) -> bool:
    """Send a payment reminder email."""
    attendee = registration.attendee
    register_url = f"{settings.app_url}/register/{event.slug}"
    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": f"Complete your registration for {event.name}",
                "html": (
                    f"<h2>Hi {attendee.first_name},</h2>"
                    f"<p>You started registering for <strong>{event.name}</strong> "
                    f"but haven't completed payment yet.</p>"
                    f'<p><a href="{register_url}">Complete Registration</a></p>'
                ),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send reminder to %s", attendee.email)
        return False
