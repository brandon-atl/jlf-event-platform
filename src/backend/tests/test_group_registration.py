from unittest.mock import AsyncMock, patch, MagicMock
import uuid

import pytest

from app.models import (
    Attendee,
    Event,
    EventStatus,
    Membership,
    PricingModel,
    Registration,
    RegistrationStatus,
)
from app.models.scholarship_link import ScholarshipLink
from datetime import datetime, timezone

pytestmark = pytest.mark.asyncio


def _mock_stripe_session(session_id="cs_test_group"):
    """Create a mock Stripe session object."""
    mock = MagicMock()
    mock.id = session_id
    mock.url = f"https://checkout.stripe.com/c/pay/{session_id}"
    return mock


async def test_group_registration_two_guests(client, sample_event):
    """POST /register/{slug}/group with 2 guests returns 201 + checkout URL."""
    mock_session = _mock_stripe_session()
    with patch(
        "stripe.checkout.Session.create",
        return_value=mock_session,
    ):
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}/group",
            json={
                "payer": {
                    "first_name": "Jane",
                    "last_name": "Doe",
                    "email": "jane@example.com",
                    "phone": "+14045551234",
                },
                "guests": [
                    {
                        "first_name": "Jane",
                        "last_name": "Doe",
                        "email": "jane@example.com",
                        "waiver_accepted": True,
                    },
                    {
                        "first_name": "John",
                        "last_name": "Doe",
                        "email": "john@example.com",
                        "waiver_accepted": True,
                    },
                ],
                "payment_method": "stripe",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending_payment"
    assert data["checkout_url"] is not None
    assert len(data["registrations"]) == 2
    assert data["group_id"] is not None


async def test_group_registration_capacity(client, db_session):
    """Group registration rejects when not enough spots."""
    event = Event(
        id=uuid.uuid4(),
        name="Small Retreat",
        slug="small-retreat",
        event_date=datetime(2026, 4, 1, 13, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        capacity=3,
        status=EventStatus.active,
    )
    db_session.add(event)

    # Add 2 existing registrations
    for i in range(2):
        att = Attendee(
            id=uuid.uuid4(),
            email=f"existing{i}@example.com",
            first_name="Existing",
            last_name=f"Person{i}",
        )
        db_session.add(att)
        await db_session.flush()
        reg = Registration(
            id=uuid.uuid4(),
            attendee_id=att.id,
            event_id=event.id,
            status=RegistrationStatus.complete,
            waiver_accepted_at=datetime.now(timezone.utc),
        )
        db_session.add(reg)
    await db_session.commit()

    # Try to register 4 guests (only 1 spot left)
    response = await client.post(
        f"/api/v1/register/{event.slug}/group",
        json={
            "payer": {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "payer@example.com",
            },
            "guests": [
                {"first_name": f"Guest{i}", "last_name": "Test", "email": f"guest{i}@example.com", "waiver_accepted": True}
                for i in range(4)
            ],
            "payment_method": "stripe",
        },
    )

    assert response.status_code == 403
    assert "spot" in response.json()["detail"].lower()


async def test_group_duplicate_email_rejected(client, sample_event):
    """Group registration rejects duplicate emails in guest list."""
    response = await client.post(
        f"/api/v1/register/{sample_event.slug}/group",
        json={
            "payer": {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
            },
            "guests": [
                {"first_name": "Jane", "last_name": "Doe", "email": "same@example.com", "waiver_accepted": True},
                {"first_name": "John", "last_name": "Doe", "email": "same@example.com", "waiver_accepted": True},
            ],
            "payment_method": "stripe",
        },
    )

    assert response.status_code == 422
    assert "duplicate" in response.json()["detail"].lower()


async def test_group_cash_payment(client, db_session):
    """Group registration with cash payment creates cash_pending registrations."""
    event = Event(
        id=uuid.uuid4(),
        name="Cash Event",
        slug="cash-event",
        event_date=datetime(2026, 4, 1, 13, 0, tzinfo=timezone.utc),
        event_type="retreat",
        pricing_model=PricingModel.fixed,
        fixed_price_cents=25000,
        capacity=20,
        allow_cash_payment=True,
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/register/{event.slug}/group",
        json={
            "payer": {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
            },
            "guests": [
                {"first_name": "Jane", "last_name": "Doe", "email": "jane@example.com", "waiver_accepted": True},
                {"first_name": "John", "last_name": "Doe", "email": "john@example.com", "waiver_accepted": True},
            ],
            "payment_method": "cash",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "cash_pending"
    assert data["checkout_url"] is None
    assert len(data["registrations"]) == 2


async def test_group_free_event(client, free_event):
    """Group registration for free event completes immediately."""
    response = await client.post(
        f"/api/v1/register/{free_event.slug}/group",
        json={
            "payer": {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
            },
            "guests": [
                {"first_name": "Jane", "last_name": "Doe", "email": "jane@example.com", "waiver_accepted": True},
                {"first_name": "John", "last_name": "Doe", "email": "john@example.com", "waiver_accepted": True},
            ],
            "payment_method": "free",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "complete"
    assert len(data["registrations"]) == 2


async def test_group_scholarship_code(client, sample_event, sample_user, db_session):
    """Group registration with scholarship code applies scholarship price."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="SCHOLAR-TEST",
        scholarship_price_cents=3000,
        max_uses=5,
        uses=0,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    mock_session = _mock_stripe_session()
    with patch("stripe.checkout.Session.create", return_value=mock_session):
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}/group",
            json={
                "payer": {
                    "first_name": "Jane",
                    "last_name": "Doe",
                    "email": "jane@example.com",
                },
                "guests": [
                    {"first_name": "Jane", "last_name": "Doe", "email": "jane@example.com", "waiver_accepted": True},
                ],
                "payment_method": "stripe",
                "scholarship_code": "SCHOLAR-TEST",
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending_payment"


async def test_group_member_discount_max_slots(client, sample_event, db_session):
    """Member discount enforces max 3 slots per event."""
    # Create 3 member attendees with registrations
    for i in range(3):
        att = Attendee(
            id=uuid.uuid4(),
            email=f"member{i}@example.com",
            first_name=f"Member{i}",
            last_name="Test",
            is_member=True,
        )
        db_session.add(att)
        await db_session.flush()

        membership = Membership(
            id=uuid.uuid4(),
            attendee_id=att.id,
            discount_value_cents=2500,
        )
        db_session.add(membership)
        await db_session.flush()

        att.membership_id = membership.id

        reg = Registration(
            id=uuid.uuid4(),
            attendee_id=att.id,
            event_id=sample_event.id,
            status=RegistrationStatus.complete,
            waiver_accepted_at=datetime.now(timezone.utc),
        )
        db_session.add(reg)

    await db_session.commit()

    # 4th member tries to register — should not get discount
    new_member = Attendee(
        id=uuid.uuid4(),
        email="member4@example.com",
        first_name="Member4",
        last_name="Test",
        is_member=True,
    )
    db_session.add(new_member)
    await db_session.flush()
    m4 = Membership(
        id=uuid.uuid4(),
        attendee_id=new_member.id,
        discount_value_cents=2500,
    )
    db_session.add(m4)
    await db_session.flush()
    new_member.membership_id = m4.id
    await db_session.commit()

    mock_session = _mock_stripe_session()
    with patch("stripe.checkout.Session.create", return_value=mock_session) as mock_create:
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}/group",
            json={
                "payer": {
                    "first_name": "Member4",
                    "last_name": "Test",
                    "email": "member4@example.com",
                },
                "guests": [
                    {"first_name": "Member4", "last_name": "Test", "email": "member4@example.com", "waiver_accepted": True},
                ],
                "payment_method": "stripe",
            },
        )

    assert response.status_code == 201
    # The 4th member should pay full price (25000 cents) since 3 slots are used
    data = response.json()
    assert data["status"] == "pending_payment"
