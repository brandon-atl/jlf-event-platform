import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.models import (
    Attendee,
    Event,
    EventStatus,
    PricingModel,
    User,
    UserRole,
)
from app.models.scholarship_link import ScholarshipLink
from app.services.auth_service import create_access_token, hash_password

pytestmark = pytest.mark.asyncio


def _auth_header(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


async def test_create_scholarship_link(client, sample_event, sample_user):
    """POST /scholarship-links creates a new scholarship link."""
    response = await client.post(
        "/api/v1/scholarship-links",
        json={
            "event_id": str(sample_event.id),
            "code": "TEST-SCHOLAR-1",
            "scholarship_price_cents": 3000,
            "max_uses": 5,
        },
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "TEST-SCHOLAR-1"
    assert data["scholarship_price_cents"] == 3000
    assert data["max_uses"] == 5
    assert data["uses"] == 0


async def test_validate_code_valid(client, sample_event, sample_user, db_session):
    """GET /scholarship-links/validate/{code} returns valid for active code."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="VALID-CODE",
        scholarship_price_cents=3000,
        max_uses=3,
        uses=1,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    response = await client.get("/api/v1/scholarship-links/validate/VALID-CODE")

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["scholarship_price_cents"] == 3000
    assert data["remaining_uses"] == 2


async def test_validate_code_invalid(client):
    """GET /scholarship-links/validate/{code} returns invalid for unknown code."""
    response = await client.get("/api/v1/scholarship-links/validate/NONEXISTENT")

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False


async def test_validate_code_exhausted(client, sample_event, sample_user, db_session):
    """GET /scholarship-links/validate/{code} returns invalid when uses >= max_uses."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="USED-UP",
        scholarship_price_cents=3000,
        max_uses=1,
        uses=1,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    response = await client.get("/api/v1/scholarship-links/validate/USED-UP")

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False


async def test_scholarship_code_increments_uses(client, sample_event, sample_user, db_session):
    """Using a scholarship code during registration increments the uses counter."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="USE-ME",
        scholarship_price_cents=3000,
        max_uses=5,
        uses=0,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    with patch(
        "app.routers.registration.create_checkout_session",
        new_callable=AsyncMock,
        return_value="https://checkout.stripe.com/c/pay/cs_test_abc",
    ):
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}",
            json={
                "first_name": "Scholar",
                "last_name": "Test",
                "email": "scholar@example.com",
                "waiver_accepted": True,
                "scholarship_code": "USE-ME",
            },
        )

    assert response.status_code == 201

    # Verify uses incremented
    response2 = await client.get("/api/v1/scholarship-links/validate/USE-ME")
    data = response2.json()
    assert data["remaining_uses"] == 4


async def test_max_uses_enforcement(client, sample_event, sample_user, db_session):
    """Registration rejects scholarship code that is fully redeemed."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="MAXED-OUT",
        scholarship_price_cents=3000,
        max_uses=1,
        uses=1,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/register/{sample_event.slug}",
        json={
            "first_name": "Scholar",
            "last_name": "Test",
            "email": "scholar2@example.com",
            "waiver_accepted": True,
            "scholarship_code": "MAXED-OUT",
        },
    )

    assert response.status_code == 422
    assert "redeemed" in response.json()["detail"].lower()


async def test_deactivate_scholarship_link(client, sample_event, sample_user, db_session):
    """DELETE /scholarship-links/{id} deactivates by setting max_uses = uses."""
    link = ScholarshipLink(
        id=uuid.uuid4(),
        event_id=sample_event.id,
        code="DEACTIVATE-ME",
        scholarship_price_cents=3000,
        max_uses=5,
        uses=2,
        created_by=sample_user.id,
    )
    db_session.add(link)
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/scholarship-links/{link.id}",
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 204

    # Verify it's now invalid
    response2 = await client.get("/api/v1/scholarship-links/validate/DEACTIVATE-ME")
    assert response2.json()["valid"] is False
