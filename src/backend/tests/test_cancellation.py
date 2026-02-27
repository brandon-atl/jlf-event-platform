"""Tests for cancellation request endpoint."""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, AsyncMock

from app.models.attendee import Attendee
from app.models.event import Event, EventStatus, PricingModel
from app.models.registration import Registration, RegistrationSource, RegistrationStatus

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def cancel_event(db_session: AsyncSession) -> Event:
    event = Event(
        id=uuid.uuid4(),
        name="Cancel Test Event",
        slug="cancel-test",
        event_date=datetime(2026, 3, 20, 10, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest_asyncio.fixture
async def cancel_attendee(db_session: AsyncSession) -> Attendee:
    attendee = Attendee(
        id=uuid.uuid4(),
        email="cancel@example.com",
        first_name="Cancel",
        last_name="Test",
    )
    db_session.add(attendee)
    await db_session.commit()
    await db_session.refresh(attendee)
    return attendee


@pytest_asyncio.fixture
async def cancel_registration(
    db_session: AsyncSession, cancel_event: Event, cancel_attendee: Attendee
) -> Registration:
    reg = Registration(
        id=uuid.uuid4(),
        attendee_id=cancel_attendee.id,
        event_id=cancel_event.id,
        status=RegistrationStatus.complete,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db_session.add(reg)
    await db_session.commit()
    await db_session.refresh(reg)
    return reg


@patch("app.services.email_service.send_admin_cancel_notification", new_callable=AsyncMock, return_value=True)
async def test_cancel_request_success(
    mock_notify,
    client: AsyncClient,
    cancel_event: Event,
    cancel_attendee: Attendee,
    cancel_registration: Registration,
):
    resp = await client.post(
        f"/api/v1/register/{cancel_event.slug}/cancel-request",
        json={
            "registration_id": str(cancel_registration.id),
            "email": "cancel@example.com",
            "reason": "Cannot attend due to schedule conflict",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "received" in data["message"].lower()

    # Verify registration was NOT cancelled (just a request)
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as fresh_db:
        result = await fresh_db.execute(
            select(Registration).where(Registration.id == cancel_registration.id)
        )
        reg = result.scalar_one()
        assert reg.status == RegistrationStatus.complete
        assert "CANCEL REQUEST" in reg.notes


@patch("app.services.email_service.send_admin_cancel_notification", new_callable=AsyncMock, return_value=True)
async def test_cancel_request_wrong_email(
    mock_notify,
    client: AsyncClient,
    cancel_event: Event,
    cancel_attendee: Attendee,
    cancel_registration: Registration,
):
    resp = await client.post(
        f"/api/v1/register/{cancel_event.slug}/cancel-request",
        json={
            "registration_id": str(cancel_registration.id),
            "email": "wrong@example.com",
            "reason": "Test",
        },
    )
    assert resp.status_code == 403


async def test_cancel_request_not_found(client: AsyncClient, cancel_event: Event):
    resp = await client.post(
        f"/api/v1/register/{cancel_event.slug}/cancel-request",
        json={
            "registration_id": str(uuid.uuid4()),
            "email": "nope@example.com",
        },
    )
    assert resp.status_code == 404


async def test_cancel_request_wrong_event(
    client: AsyncClient,
    cancel_event: Event,
    cancel_registration: Registration,
):
    resp = await client.post(
        "/api/v1/register/nonexistent-event/cancel-request",
        json={
            "registration_id": str(cancel_registration.id),
            "email": "cancel@example.com",
        },
    )
    assert resp.status_code == 404
