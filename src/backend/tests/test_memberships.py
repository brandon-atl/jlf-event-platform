import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attendee, Event, EventStatus, PricingModel, Registration, RegistrationStatus, User
from app.models.membership import Membership
from app.services.auth_service import create_access_token

pytestmark = pytest.mark.asyncio


def _auth_header(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


async def test_create_membership_sets_is_member(
    client, sample_attendee, sample_user, db_session
):
    """POST /memberships sets attendee.is_member=True."""
    response = await client.post(
        "/api/v1/memberships",
        json={
            "attendee_id": str(sample_attendee.id),
            "discount_value_cents": 2500,
        },
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["is_active"] is True
    assert data["discount_value_cents"] == 2500
    assert data["attendee_name"] == "Jane Doe"

    # Verify attendee flags
    await db_session.refresh(sample_attendee)
    assert sample_attendee.is_member is True
    assert sample_attendee.membership_id is not None


async def test_deactivate_membership_clears_is_member(
    client, sample_attendee, sample_user, db_session
):
    """DELETE /memberships/{id} clears attendee.is_member."""
    # Create membership first
    membership = Membership(
        id=uuid.uuid4(),
        attendee_id=sample_attendee.id,
        discount_value_cents=2500,
    )
    db_session.add(membership)
    await db_session.flush()
    sample_attendee.is_member = True
    sample_attendee.membership_id = membership.id
    await db_session.commit()

    # Deactivate
    response = await client.delete(
        f"/api/v1/memberships/{membership.id}",
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 204

    # Verify attendee flags cleared
    await db_session.refresh(sample_attendee)
    assert sample_attendee.is_member is False
    assert sample_attendee.membership_id is None


async def test_duplicate_membership_rejected(
    client, sample_attendee, sample_user, db_session
):
    """Creating a second active membership for same attendee is rejected."""
    membership = Membership(
        id=uuid.uuid4(),
        attendee_id=sample_attendee.id,
        discount_value_cents=2500,
    )
    db_session.add(membership)
    await db_session.flush()
    sample_attendee.is_member = True
    sample_attendee.membership_id = membership.id
    await db_session.commit()

    response = await client.post(
        "/api/v1/memberships",
        json={
            "attendee_id": str(sample_attendee.id),
            "discount_value_cents": 2500,
        },
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 409


async def test_list_memberships(client, sample_attendee, sample_user, db_session):
    """GET /memberships returns memberships with attendee info."""
    membership = Membership(
        id=uuid.uuid4(),
        attendee_id=sample_attendee.id,
        discount_value_cents=2500,
    )
    db_session.add(membership)
    await db_session.flush()
    sample_attendee.is_member = True
    sample_attendee.membership_id = membership.id
    await db_session.commit()

    response = await client.get(
        "/api/v1/memberships",
        headers=_auth_header(sample_user),
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["attendee_email"] == "jane@example.com"


async def test_member_discount_applied_at_registration(
    client, sample_event, sample_user, db_session
):
    """Member discount is applied during group registration."""
    # Create member attendee
    att = Attendee(
        id=uuid.uuid4(),
        email="member-reg@example.com",
        first_name="Member",
        last_name="Registrant",
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
    await db_session.commit()

    mock_session = MagicMock()
    mock_session.id = "cs_test_member"
    mock_session.url = "https://checkout.stripe.com/c/pay/cs_test_member"

    with patch("stripe.checkout.Session.create", return_value=mock_session) as mock_create:
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}/group",
            json={
                "payer": {
                    "first_name": "Member",
                    "last_name": "Registrant",
                    "email": "member-reg@example.com",
                },
                "guests": [
                    {
                        "first_name": "Member",
                        "last_name": "Registrant",
                        "email": "member-reg@example.com",
                        "waiver_accepted": True,
                    },
                ],
                "payment_method": "stripe",
            },
        )

    assert response.status_code == 201
    # Verify Stripe was called with discounted amount (25000 - 2500 = 22500)
    call_kwargs = mock_create.call_args[1]
    line_items = call_kwargs["line_items"]
    assert len(line_items) == 1
    assert line_items[0]["price_data"]["unit_amount"] == 22500
