"""Tests for sub-events CRUD, composite registration flow, and recurring dates."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Event,
    EventStatus,
    PricingModel,
    User,
    UserRole,
)
from app.models.sub_event import SubEvent, SubEventPricingModel
from app.models.registration_sub_event import RegistrationSubEvent
from app.services.auth_service import hash_password

pytestmark = pytest.mark.asyncio


# ── Fixtures ──────────────────────────────────────


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user for sub-event tests."""
    user = User(
        id=uuid.uuid4(),
        email="admin@justloveforest.com",
        name="Admin User",
        role=UserRole.admin,
        password_hash=hash_password("testpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client, admin_user) -> dict:
    """Login as admin and return auth headers."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@justloveforest.com", "password": "testpassword123"},
    )
    data = resp.json()
    assert "access_token" in data, f"Login failed: {data}"
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest_asyncio.fixture
async def composite_event(db_session: AsyncSession) -> Event:
    """Create a composite event for sub-event testing."""
    event = Event(
        id=uuid.uuid4(),
        name="Community Weekend",
        slug="community-weekend",
        description="Monthly community gathering",
        event_date=datetime(2026, 4, 10, 13, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 4, 12, 12, 0, tzinfo=timezone.utc),
        event_type="community_weekend",
        pricing_model=PricingModel.composite,
        capacity=30,
        status=EventStatus.active,
        allow_cash_payment=True,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


@pytest_asyncio.fixture
async def composite_with_subs(db_session: AsyncSession, composite_event: Event) -> tuple[Event, list[SubEvent]]:
    """Create a composite event with 3 sub-events."""
    subs = []
    for i, (name, pricing, price, required) in enumerate([
        ("Friday Night", SubEventPricingModel.donation, None, False),
        ("Saturday Day", SubEventPricingModel.free, None, True),
        ("Saturday Night Fire Circle", SubEventPricingModel.fixed, 5000, False),
    ]):
        se = SubEvent(
            parent_event_id=composite_event.id,
            name=name,
            pricing_model=pricing,
            fixed_price_cents=price,
            sort_order=i,
            is_required=required,
        )
        db_session.add(se)
        subs.append(se)
    await db_session.commit()
    for se in subs:
        await db_session.refresh(se)
    return composite_event, subs


@pytest_asyncio.fixture
async def recurring_event(db_session: AsyncSession) -> Event:
    """Create a recurring event with RRULE."""
    event = Event(
        id=uuid.uuid4(),
        name="Hanuman Tuesday",
        slug="hanuman-tuesday",
        description="Weekly gathering",
        event_date=datetime(2026, 3, 3, 18, 0, tzinfo=timezone.utc),
        event_type="hanuman_tuesday",
        pricing_model=PricingModel.donation,
        min_donation_cents=100,
        status=EventStatus.active,
        is_recurring=True,
        recurrence_rule="RRULE:FREQ=WEEKLY;BYDAY=TU",
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


# ── Sub-Event CRUD Tests ─────────────────────────


async def test_create_sub_event(client, composite_event, auth_headers):
    """POST sub-event on a composite event returns 201."""
    resp = await client.post(
        f"/api/v1/events/{composite_event.id}/sub-events",
        json={
            "name": "Sunday Forest Therapy",
            "pricing_model": "fixed",
            "fixed_price_cents": 12500,
            "sort_order": 0,
            "is_required": False,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Sunday Forest Therapy"
    assert data["pricing_model"] == "fixed"
    assert data["fixed_price_cents"] == 12500
    assert data["is_required"] is False


async def test_create_sub_event_on_non_composite_fails(client, sample_event, auth_headers):
    """POST sub-event on a non-composite event returns 422."""
    resp = await client.post(
        f"/api/v1/events/{sample_event.id}/sub-events",
        json={
            "name": "Bonus Activity",
            "pricing_model": "free",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert "composite" in resp.json()["detail"].lower()


async def test_list_sub_events(client, composite_with_subs, auth_headers):
    """GET sub-events returns all sub-events in sort order."""
    event, subs = composite_with_subs
    resp = await client.get(
        f"/api/v1/events/{event.id}/sub-events",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    assert data[0]["name"] == "Friday Night"
    assert data[1]["name"] == "Saturday Day"
    assert data[2]["name"] == "Saturday Night Fire Circle"


async def test_update_sub_event(client, composite_with_subs, auth_headers):
    """PUT sub-event updates fields."""
    event, subs = composite_with_subs
    resp = await client.put(
        f"/api/v1/events/{event.id}/sub-events/{subs[0].id}",
        json={"name": "Friday Evening Gathering", "fixed_price_cents": 2500},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Friday Evening Gathering"
    assert data["fixed_price_cents"] == 2500


async def test_delete_sub_event(client, composite_with_subs, auth_headers):
    """DELETE sub-event without registrations succeeds."""
    event, subs = composite_with_subs
    resp = await client.delete(
        f"/api/v1/events/{event.id}/sub-events/{subs[0].id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Sub-event deleted"


async def test_delete_sub_event_not_found(client, composite_event, auth_headers):
    """DELETE nonexistent sub-event returns 404."""
    fake_id = str(uuid.uuid4())
    resp = await client.delete(
        f"/api/v1/events/{composite_event.id}/sub-events/{fake_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ── Composite Registration Tests ─────────────────


async def test_composite_registration_with_sub_events(client, composite_with_subs):
    """POST /register/{slug} with selected_sub_event_ids creates registration + junction rows."""
    event, subs = composite_with_subs
    required_se = subs[1]  # Saturday Day (required, free)
    fixed_se = subs[2]  # Saturday Night ($50)

    mock_session = type("MockSession", (), {"url": "https://checkout.stripe.com/c/pay/cs_test_composite", "id": "cs_test_composite"})()
    with patch(
        "stripe.checkout.Session.create",
        return_value=mock_session,
    ):
        resp = await client.post(
            f"/api/v1/register/{event.slug}",
            json={
                "first_name": "Alice",
                "last_name": "Wonder",
                "email": "alice@example.com",
                "waiver_accepted": True,
                "selected_sub_event_ids": [str(required_se.id), str(fixed_se.id)],
            },
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["registration_id"]
    assert data["checkout_url"] == "https://checkout.stripe.com/c/pay/cs_test_composite"


async def test_composite_registration_missing_required_sub_event(client, composite_with_subs):
    """POST /register/{slug} without required sub-event returns 422."""
    event, subs = composite_with_subs
    optional_se = subs[0]  # Friday Night (not required)

    resp = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "Bob",
            "last_name": "Smith",
            "email": "bob@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(optional_se.id)],
        },
    )

    assert resp.status_code == 422
    assert "required" in resp.json()["detail"].lower()


async def test_composite_cash_registration(client, composite_with_subs):
    """POST /register/{slug} composite event with cash payment_method succeeds without checkout."""
    event, subs = composite_with_subs
    all_ids = [str(se.id) for se in subs]

    resp = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "Charlie",
            "last_name": "Brown",
            "email": "charlie@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": all_ids,
            "payment_method": "cash",
        },
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "cash_pending"
    assert data["checkout_url"] is None


# ── Recurring Dates Tests ────────────────────────


async def test_recurring_dates_returns_upcoming(client, recurring_event):
    """GET /events/{slug}/recurring-dates returns future dates."""
    resp = await client.get(
        f"/api/v1/events/{recurring_event.slug}/recurring-dates?count=5",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["event_name"] == "Hanuman Tuesday"
    assert len(data["dates"]) <= 5
    # All dates should be Tuesdays
    for d in data["dates"]:
        dt = datetime.strptime(d["date"], "%Y-%m-%d")
        assert dt.weekday() == 1  # Tuesday


async def test_recurring_dates_non_recurring_event_fails(client, sample_event):
    """GET /events/{slug}/recurring-dates on non-recurring event returns 422."""
    resp = await client.get(
        f"/api/v1/events/{sample_event.slug}/recurring-dates",
    )
    assert resp.status_code == 422
    assert "not recurring" in resp.json()["detail"].lower()


# ── Event Info / Public Endpoint Tests ───────────


async def test_event_info_includes_sub_events(client, composite_with_subs):
    """GET /register/{slug}/info for composite event includes sub_events array."""
    event, subs = composite_with_subs
    resp = await client.get(f"/api/v1/register/{event.slug}/info")
    assert resp.status_code == 200
    data = resp.json()["event"]
    assert data["pricing_model"] == "composite"
    assert data.get("sub_events") is not None
    assert len(data["sub_events"]) == 3
    # Verify sort order
    names = [se["name"] for se in data["sub_events"]]
    assert names == ["Friday Night", "Saturday Day", "Saturday Night Fire Circle"]


# ── Sub-Event Capacity Enforcement Tests ─────────


@pytest_asyncio.fixture
async def capped_composite(db_session: AsyncSession) -> tuple[Event, SubEvent]:
    """Create a composite event with a capacity-limited sub-event (capacity=1)."""
    event = Event(
        id=uuid.uuid4(),
        name="Capped Weekend",
        slug="capped-weekend",
        description="Capacity test",
        event_date=datetime(2026, 5, 1, 13, 0, tzinfo=timezone.utc),
        event_type="community_weekend",
        pricing_model=PricingModel.composite,
        capacity=30,
        status=EventStatus.active,
        allow_cash_payment=True,
    )
    db_session.add(event)
    await db_session.flush()

    # Required sub-event with capacity=1
    se = SubEvent(
        parent_event_id=event.id,
        name="Limited Workshop",
        pricing_model=SubEventPricingModel.free,
        capacity=1,
        sort_order=0,
        is_required=True,
    )
    db_session.add(se)
    await db_session.commit()
    await db_session.refresh(event)
    await db_session.refresh(se)
    return event, se


async def test_sub_event_capacity_enforced(client, capped_composite):
    """Registration rejected when sub-event is at capacity."""
    event, se = capped_composite

    # First registration (cash) — should succeed
    resp1 = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "First",
            "last_name": "Person",
            "email": "first@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(se.id)],
            "payment_method": "cash",
        },
    )
    assert resp1.status_code == 201

    # Second registration — should fail (capacity=1, already full)
    resp2 = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "Second",
            "last_name": "Person",
            "email": "second@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(se.id)],
            "payment_method": "cash",
        },
    )
    assert resp2.status_code == 409
    assert "full" in resp2.json()["detail"].lower()


async def test_sub_event_capacity_group_registration(client, capped_composite, db_session: AsyncSession):
    """Group registration correctly counts against sub-event capacity."""
    event, se = capped_composite

    # Increase capacity to 2 for this test
    se.capacity = 2
    db_session.add(se)
    await db_session.commit()

    # Register 2 guests (group) — fills capacity
    resp1 = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "GroupA",
            "last_name": "One",
            "email": "groupa@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(se.id)],
            "payment_method": "cash",
        },
    )
    assert resp1.status_code == 201

    resp2 = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "GroupA",
            "last_name": "Two",
            "email": "groupa2@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(se.id)],
            "payment_method": "cash",
        },
    )
    assert resp2.status_code == 201

    # Third registration — should fail (capacity=2, 2 already registered)
    resp3 = await client.post(
        f"/api/v1/register/{event.slug}",
        json={
            "first_name": "Extra",
            "last_name": "Person",
            "email": "extra@example.com",
            "waiver_accepted": True,
            "selected_sub_event_ids": [str(se.id)],
            "payment_method": "cash",
        },
    )
    assert resp3.status_code == 409
