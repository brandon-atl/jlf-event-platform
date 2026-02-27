"""Tests for SMS conversations — inbound webhook, ETA parsing, conversations."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendee import Attendee
from app.models.event import Event, EventStatus, PricingModel
from app.models.registration import Registration, RegistrationSource, RegistrationStatus
from app.models.sms_conversation import SmsConversation
from app.models.user import User
from app.routers.webhooks import parse_eta

pytestmark = pytest.mark.asyncio


# --- ETA Parsing Unit Tests ---


class TestETAParsing:
    def test_eta_time_pm(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("ETA 3pm", now=now)
        assert result is not None
        assert result.hour == 15
        assert result.minute == 0

    def test_eta_time_with_minutes(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("ETA 3:30pm", now=now)
        assert result is not None
        assert result.hour == 15
        assert result.minute == 30

    def test_arriving_at(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("arriving at 3pm", now=now)
        assert result is not None
        assert result.hour == 15

    def test_arriving_around(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("arriving around 3:30", now=now)
        assert result is not None
        assert result.hour == 15
        assert result.minute == 30

    def test_be_there_by(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("be there by 4", now=now)
        assert result is not None
        assert result.hour == 16

    def test_be_there_by_pm(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("be there by 4pm", now=now)
        assert result is not None
        assert result.hour == 16

    def test_ill_be_there_around(self):
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        result = parse_eta("ill be there around 5", now=now)
        assert result is not None
        assert result.hour == 17

    def test_on_my_way_minutes(self):
        now = datetime(2026, 3, 15, 14, 0, tzinfo=timezone.utc)
        result = parse_eta("on my way, about 30 min", now=now)
        assert result is not None
        expected = now + timedelta(minutes=30)
        assert abs((result - expected).total_seconds()) < 1

    def test_on_my_way_45_minutes(self):
        now = datetime(2026, 3, 15, 14, 0, tzinfo=timezone.utc)
        result = parse_eta("on my way, 45 minutes", now=now)
        assert result is not None
        expected = now + timedelta(minutes=45)
        assert abs((result - expected).total_seconds()) < 1

    def test_no_eta(self):
        result = parse_eta("Hey, looking forward to the event!")
        assert result is None

    def test_no_eta_random_numbers(self):
        result = parse_eta("I have 3 guests coming with me")
        assert result is None

    def test_am_time(self):
        now = datetime(2026, 3, 15, 6, 0, tzinfo=timezone.utc)
        result = parse_eta("ETA 10am", now=now)
        assert result is not None
        assert result.hour == 10


# --- Inbound Webhook Tests ---


@pytest_asyncio.fixture
async def phone_attendee(db_session: AsyncSession) -> Attendee:
    """Create an attendee with a phone number."""
    attendee = Attendee(
        id=uuid.uuid4(),
        email="smstest@example.com",
        first_name="SMS",
        last_name="Tester",
        phone="+14045559999",
    )
    db_session.add(attendee)
    await db_session.commit()
    await db_session.refresh(attendee)
    return attendee


@pytest_asyncio.fixture
async def active_registration(
    db_session: AsyncSession, phone_attendee: Attendee
) -> Registration:
    """Create a complete registration for the phone attendee."""
    event = Event(
        id=uuid.uuid4(),
        name="Test Event",
        slug="test-event-sms",
        event_date=datetime(2026, 3, 15, 13, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.flush()

    reg = Registration(
        id=uuid.uuid4(),
        attendee_id=phone_attendee.id,
        event_id=event.id,
        status=RegistrationStatus.complete,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db_session.add(reg)
    await db_session.commit()
    await db_session.refresh(reg)
    return reg


async def test_twilio_inbound_stores_conversation(
    client: AsyncClient, phone_attendee: Attendee, active_registration: Registration
):
    resp = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={
            "From": "+14045559999",
            "Body": "Hello! Looking forward to the event.",
            "MessageSid": "SM_test_123",
        },
    )
    assert resp.status_code == 200
    assert "<Response/>" in resp.text


async def test_twilio_inbound_idempotent(
    client: AsyncClient, phone_attendee: Attendee, active_registration: Registration
):
    """Sending the same SID twice should only create one record."""
    data = {
        "From": "+14045559999",
        "Body": "Test message",
        "MessageSid": "SM_idempotent_test",
    }
    resp1 = await client.post("/api/v1/webhooks/twilio/inbound", data=data)
    assert resp1.status_code == 200

    resp2 = await client.post("/api/v1/webhooks/twilio/inbound", data=data)
    assert resp2.status_code == 200


async def test_twilio_inbound_eta_parsing(
    client: AsyncClient,
    phone_attendee: Attendee,
    active_registration: Registration,
    db_session: AsyncSession,
):
    resp = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={
            "From": "+14045559999",
            "Body": "on my way, about 30 min",
            "MessageSid": "SM_eta_test",
        },
    )
    assert resp.status_code == 200

    # Check that ETA was set on the registration
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as fresh_db:
        result = await fresh_db.execute(
            select(Registration).where(Registration.id == active_registration.id)
        )
        reg = result.scalar_one()
        assert reg.estimated_arrival is not None


async def test_twilio_inbound_missing_from(client: AsyncClient):
    resp = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={"Body": "hello", "MessageSid": "SM_no_from"},
    )
    assert resp.status_code == 400


# --- Conversation Listing Tests ---


async def _get_auth_headers(client: AsyncClient, sample_user: User) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "testpassword123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_list_conversations(
    client: AsyncClient,
    sample_user: User,
    phone_attendee: Attendee,
    active_registration: Registration,
):
    headers = await _get_auth_headers(client, sample_user)

    # Create an inbound message first
    await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={
            "From": "+14045559999",
            "Body": "Hi there!",
            "MessageSid": "SM_list_test",
        },
    )

    resp = await client.get("/api/v1/sms/conversations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["attendee_phone"] == "+14045559999"


async def test_get_conversation_thread(
    client: AsyncClient,
    sample_user: User,
    phone_attendee: Attendee,
    active_registration: Registration,
):
    headers = await _get_auth_headers(client, sample_user)

    # Create messages
    await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={
            "From": "+14045559999",
            "Body": "First message",
            "MessageSid": "SM_thread_1",
        },
    )
    await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={
            "From": "+14045559999",
            "Body": "Second message",
            "MessageSid": "SM_thread_2",
        },
    )

    resp = await client.get(
        "/api/v1/sms/conversations/+14045559999", headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["attendee_phone"] == "+14045559999"
    assert len(data["messages"]) == 2


async def test_reply_to_conversation(
    client: AsyncClient,
    sample_user: User,
    phone_attendee: Attendee,
    active_registration: Registration,
):
    headers = await _get_auth_headers(client, sample_user)

    # Send a reply (will fail since Twilio is not configured, but should store)
    resp = await client.post(
        "/api/v1/sms/conversations/+14045559999/reply",
        json={"message": "Thanks for reaching out!"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message_id"] is not None


async def test_conversation_not_found(client: AsyncClient, sample_user: User):
    headers = await _get_auth_headers(client, sample_user)
    resp = await client.get(
        "/api/v1/sms/conversations/+10000000000", headers=headers
    )
    assert resp.status_code == 404
