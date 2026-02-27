import logging

import resend

from app.config import settings
from app.models.event import Event
from app.models.registration import Registration

logger = logging.getLogger(__name__)

resend.api_key = settings.resend_api_key

FROM_EMAIL = f"Just Love Forest <{settings.from_email}>"


def _base_template(body_html: str) -> str:
    """Wrap body content in the branded JLF email layout."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#faf8f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f2;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Header -->
<tr>
<td style="background-color:#2d5a3d;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:0.5px;">Just Love Forest</h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 24px;">
  {body_html}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:20px 32px 28px;border-top:1px solid #e8e4dc;text-align:center;">
  <p style="margin:0 0 4px;color:#7ba68a;font-size:13px;">Just Love Forest &mdash; Poetry, GA</p>
  <p style="margin:0;color:#b0a990;font-size:11px;">You received this email because you registered for an event at justloveforest.com</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>"""


async def send_confirmation_email(registration: Registration, event: Event) -> bool:
    """Send registration confirmation email."""
    attendee = registration.attendee
    event_date_str = event.event_date.strftime("%B %d, %Y")
    event_time_str = event.event_date.strftime("%I:%M %p")
    meeting_point = event.meeting_point_a or "See event details for directions"

    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Welcome, {attendee.first_name}!</h2>
<p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6;">
  Your registration for <strong>{event.name}</strong> is confirmed.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#f4f9f5;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px 24px;">
  <p style="margin:0 0 8px;color:#2d5a3d;font-size:14px;font-weight:600;">Event Details</p>
  <p style="margin:0 0 4px;color:#444;font-size:14px;">Date: {event_date_str}</p>
  <p style="margin:0 0 4px;color:#444;font-size:14px;">Time: {event_time_str}</p>
  <p style="margin:0;color:#444;font-size:14px;">Meeting Point: {meeting_point}</p>
</td></tr>
</table>
<p style="margin:0;color:#444;font-size:15px;line-height:1.6;">
  We look forward to seeing you at Just Love Forest!
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": f"You're confirmed for {event.name}!",
                "html": _base_template(body),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send confirmation email to %s", attendee.email)
        return False


async def send_magic_link_email(email: str, name: str, token: str) -> bool:
    """Send a magic link login email to a co-creator."""
    link = f"{settings.app_url}/auth/verify?token={token}"

    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Hi {name},</h2>
<p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
  Click below to access the Just Love Forest co-creator portal:
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="background-color:#2d5a3d;border-radius:8px;text-align:center;">
  <a href="{link}"
     style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
    Open Portal
  </a>
</td></tr>
</table>
<p style="margin:0;color:#888;font-size:13px;">
  This link expires in {settings.magic_link_expiration_hours} hours.
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [email],
                "subject": "Your Just Love Forest portal login link",
                "html": _base_template(body),
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
    event_date_str = event.event_date.strftime("%B %d, %Y")

    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Hi {attendee.first_name},</h2>
<p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6;">
  You started registering for <strong>{event.name}</strong> ({event_date_str})
  but haven't completed payment yet.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="background-color:#2d5a3d;border-radius:8px;text-align:center;">
  <a href="{register_url}"
     style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
    Complete Registration
  </a>
</td></tr>
</table>
<p style="margin:0;color:#888;font-size:13px;">
  If you no longer wish to attend, you can ignore this email and your registration will expire automatically.
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": f"Complete your registration for {event.name}",
                "html": _base_template(body),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send reminder to %s", attendee.email)
        return False


async def send_branded_email(to: str, subject: str, body_text: str) -> bool:
    """Send a branded email with the JLF template wrapper.

    body_text is plain text — it will be wrapped in the branded HTML template.
    """
    # Convert plain text body to simple HTML paragraphs
    body_html = "".join(
        f'<p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">{line}</p>'
        for line in body_text.split("\n")
        if line.strip()
    )

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": _base_template(body_html),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send branded email to %s", to)
        return False


async def send_admin_cancel_notification(
    registration: Registration, event: Event, reason: str | None
) -> bool:
    """Send cancellation request notification to admin."""
    attendee = registration.attendee
    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Cancellation Request</h2>
<p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">
  <strong>{attendee.first_name} {attendee.last_name}</strong> ({attendee.email})
  has requested to cancel their registration for <strong>{event.name}</strong>.
</p>
<p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">
  Reason: {reason or 'No reason provided'}
</p>
<p style="margin:0;color:#888;font-size:13px;">
  This is a request only — the registration has not been cancelled automatically.
  Please review and take action in the admin dashboard.
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [settings.from_email],  # Send to the configured admin email
                "subject": f"Cancel request: {attendee.first_name} {attendee.last_name} — {event.name}",
                "html": _base_template(body),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send admin cancel notification")
        return False


async def send_event_reminder_email(
    registration: Registration, event: Event, reminder_type: str = "1d"
) -> bool:
    """Send event reminder email (1 day or 7 day before)."""
    attendee = registration.attendee
    event_date_str = event.event_date.strftime("%B %d, %Y")
    meeting_point = event.meeting_point_a or "See event details for directions"
    cancel_url = f"{settings.app_url}/register/{event.slug}/cancel?reg={registration.id}"

    if reminder_type == "1d":
        subject = f"Reminder: {event.name} is tomorrow!"
        intro = f"just a friendly reminder that <strong>{event.name}</strong> is tomorrow, {event_date_str}!"
    else:
        subject = f"{event.name} is coming up on {event_date_str}!"
        intro = f"<strong>{event.name}</strong> is coming up on {event_date_str}!"

    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Hi {attendee.first_name},</h2>
<p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6;">
  {intro} We're looking forward to seeing you at Just Love Forest.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#f4f9f5;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px 24px;">
  <p style="margin:0 0 4px;color:#444;font-size:14px;">Meeting Point: {meeting_point}</p>
</td></tr>
</table>
<p style="margin:0;color:#888;font-size:13px;">
  Need to cancel? <a href="{cancel_url}" style="color:#2d5a3d;">Submit a cancellation request</a>
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": subject,
                "html": _base_template(body),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send reminder email to %s", attendee.email)
        return False


async def send_escalation_email(registration: Registration, event: Event) -> bool:
    """Send an urgent escalation reminder — registration is about to expire."""
    attendee = registration.attendee
    register_url = f"{settings.app_url}/register/{event.slug}"
    event_date_str = event.event_date.strftime("%B %d, %Y")

    body = f"""\
<h2 style="margin:0 0 16px;color:#1a3a2a;font-size:20px;">Hi {attendee.first_name},</h2>
<p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">
  <strong>Your registration for {event.name} ({event_date_str}) is about to expire.</strong>
</p>
<p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6;">
  We noticed you haven't completed payment yet. If you still want to attend, please finish
  your registration soon — your spot will be released automatically once the hold expires.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="background-color:#d4644a;border-radius:8px;text-align:center;">
  <a href="{register_url}"
     style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
    Complete Registration Now
  </a>
</td></tr>
</table>
<p style="margin:0;color:#888;font-size:13px;">
  If you no longer wish to attend, no action is needed — your registration will expire automatically.
</p>"""

    try:
        resend.Emails.send(
            {
                "from": FROM_EMAIL,
                "to": [attendee.email],
                "subject": f"Last chance: complete your registration for {event.name}",
                "html": _base_template(body),
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send escalation email to %s", attendee.email)
        return False
