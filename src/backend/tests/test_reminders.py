"""Tests for send_event_reminders task — correct intervals, idempotent, skips events outside window."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Attendee,
    Event,
    EventStatus,
    PricingModel,
    Registration,
    RegistrationSource,
    RegistrationStatus,
)
from app.models.notification import NotificationChannel, NotificationLog, NotificationStatus

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def reminder_event_1d(db_session: AsyncSession) -> tuple[Event, Registration]:
    """Create an event happening in 1 day with one complete registration."""
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    event = Event(
        id=uuid.uuid4(),
        name="Tomorrow Retreat",
        slug="tomorrow-retreat",
        event_date=tomorrow.replace(hour=13, minute=0, second=0, microsecond=0),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        status=EventStatus.active,
        meeting_point_a="Main gate",
    )
    db_session.add(event)
    await db_session.flush()

    attendee = Attendee(
        id=uuid.uuid4(),
        email="reminder@example.com",
        first_name="Remi",
        last_name="Nder",
        phone="+14045551111",
    )
    db_session.add(attendee)
    await db_session.flush()

    reg = Registration(
        id=uuid.uuid4(),
        attendee_id=attendee.id,
        event_id=event.id,
        status=RegistrationStatus.complete,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db_session.add(reg)
    await db_session.commit()
    await db_session.refresh(event)
    await db_session.refresh(reg)
    return event, reg


@pytest_asyncio.fixture
async def event_not_in_reminder_window(db_session: AsyncSession) -> Event:
    """Create an active event not happening in 1 or 7 days (3 days away)."""
    future = datetime.now(timezone.utc) + timedelta(days=3)
    event = Event(
        id=uuid.uuid4(),
        name="Not Soon Event",
        slug="not-soon-event",
        event_date=future.replace(hour=13, minute=0, second=0, microsecond=0),
        event_type="retreat",
        pricing_model=PricingModel.free,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


async def test_sends_1d_reminder(reminder_event_1d):
    """Reminders are sent for events happening in 1 day."""
    event, reg = reminder_event_1d

    with patch("app.tasks.reminders.send_event_reminder_email", new_callable=AsyncMock, return_value=True) as mock_email, \
         patch("app.tasks.reminders.send_sms", new_callable=AsyncMock, return_value=True) as mock_sms, \
         patch("app.tasks.reminders.async_session") as mock_session_ctx:

        from tests.conftest import TestSessionLocal
        mock_session_ctx.return_value = TestSessionLocal()

        from app.tasks.reminders import send_event_reminders
        sent = await send_event_reminders()

    assert sent >= 1
    mock_email.assert_called_once()
    mock_sms.assert_called_once()


async def test_reminders_idempotent(db_session: AsyncSession, reminder_event_1d):
    """Reminders are not re-sent if already logged."""
    event, reg = reminder_event_1d

    # Pre-populate notification log (simulate already sent)
    db_session.add(NotificationLog(
        registration_id=reg.id,
        channel=NotificationChannel.email,
        template_id="reminder_1d",
        content_hash="x" * 64,
        status=NotificationStatus.sent,
    ))
    db_session.add(NotificationLog(
        registration_id=reg.id,
        channel=NotificationChannel.sms,
        template_id="reminder_1d_sms",
        content_hash="x" * 64,
        status=NotificationStatus.sent,
    ))
    await db_session.commit()

    with patch("app.tasks.reminders.send_event_reminder_email", new_callable=AsyncMock) as mock_email, \
         patch("app.tasks.reminders.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("app.tasks.reminders.async_session") as mock_session_ctx:

        from tests.conftest import TestSessionLocal
        mock_session_ctx.return_value = TestSessionLocal()

        from app.tasks.reminders import send_event_reminders
        sent = await send_event_reminders()

    # Nothing should be sent — already logged
    assert sent == 0
    mock_email.assert_not_called()
    mock_sms.assert_not_called()


async def test_skips_events_outside_reminder_window(event_not_in_reminder_window):
    """Events not happening in 1 or 7 days are skipped (no reminders sent)."""
    with patch("app.tasks.reminders.send_event_reminder_email", new_callable=AsyncMock) as mock_email, \
         patch("app.tasks.reminders.send_sms", new_callable=AsyncMock) as mock_sms, \
         patch("app.tasks.reminders.async_session") as mock_session_ctx:

        from tests.conftest import TestSessionLocal
        mock_session_ctx.return_value = TestSessionLocal()

        from app.tasks.reminders import send_event_reminders
        sent = await send_event_reminders()

    assert sent == 0
    mock_email.assert_not_called()
    mock_sms.assert_not_called()
