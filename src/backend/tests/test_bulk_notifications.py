"""Tests for bulk notification endpoint — successful send, idempotency guard, missing event."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Attendee,
    Event,
    EventStatus,
    PricingModel,
    Registration,
    RegistrationSource,
    RegistrationStatus,
    User,
    UserRole,
)
from app.models.notification import NotificationLog
from app.services.auth_service import hash_password

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def notif_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="admin@justloveforest.com",
        name="Admin",
        role=UserRole.admin,
        password_hash=hash_password("testpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def notif_auth_headers(client: AsyncClient, notif_user: User) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "testpassword123"},
    )
    data = resp.json()
    assert "access_token" in data, f"Login failed: {data}"
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest_asyncio.fixture
async def notif_event_with_registrations(db_session: AsyncSession):
    """Create an event with 2 complete registrations (with phone+email)."""
    event = Event(
        id=uuid.uuid4(),
        name="Notification Test Event",
        slug="notif-test",
        event_date=datetime(2026, 4, 1, 13, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.flush()

    registrations = []
    for i in range(2):
        attendee = Attendee(
            id=uuid.uuid4(),
            email=f"attendee{i}@example.com",
            first_name=f"Attendee{i}",
            last_name="Test",
            phone=f"+140455500{i}0",
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
        registrations.append(reg)

    await db_session.commit()
    await db_session.refresh(event)
    return event, registrations


async def test_bulk_notification_sends_successfully(
    client: AsyncClient,
    notif_auth_headers: dict,
    notif_event_with_registrations,
):
    """Bulk notification with custom message sends to all complete attendees."""
    event, regs = notif_event_with_registrations

    with patch("app.routers.notifications.send_sms", new_callable=AsyncMock, return_value=True):
        resp = await client.post(
            f"/api/v1/events/{event.id}/notifications/bulk",
            json={
                "channel": "sms",
                "custom_message": "Hello {{first_name}}, see you at {{event_name}}!",
            },
            headers=notif_auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["sent_count"] == 2
    assert data["failed_count"] == 0


async def test_bulk_notification_idempotency(
    client: AsyncClient,
    notif_auth_headers: dict,
    notif_event_with_registrations,
):
    """Second send with same idempotency_key should skip all attendees."""
    event, regs = notif_event_with_registrations

    payload = {
        "channel": "sms",
        "custom_message": "Reminder!",
        "idempotency_key": "test-idempotency-key-123",
    }

    with patch("app.routers.notifications.send_sms", new_callable=AsyncMock, return_value=True):
        # First send
        resp1 = await client.post(
            f"/api/v1/events/{event.id}/notifications/bulk",
            json=payload,
            headers=notif_auth_headers,
        )
        assert resp1.status_code == 200
        assert resp1.json()["sent_count"] == 2

        # Second send — should be idempotent
        resp2 = await client.post(
            f"/api/v1/events/{event.id}/notifications/bulk",
            json=payload,
            headers=notif_auth_headers,
        )
        assert resp2.status_code == 200
        # All skipped — 0 sent, 0 failed (attendees were already notified)
        assert resp2.json()["sent_count"] == 0


async def test_bulk_notification_missing_event(
    client: AsyncClient,
    notif_auth_headers: dict,
):
    """Bulk notification for nonexistent event returns 404."""
    fake_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/events/{fake_id}/notifications/bulk",
        json={
            "channel": "sms",
            "custom_message": "Hello!",
        },
        headers=notif_auth_headers,
    )
    assert resp.status_code == 404
