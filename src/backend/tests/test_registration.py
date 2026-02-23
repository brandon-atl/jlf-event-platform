from unittest.mock import AsyncMock, patch

import pytest

pytestmark = pytest.mark.asyncio


async def test_successful_registration(client, sample_event):
    """POST /register/{slug} with valid data returns 201 + checkout URL."""
    with patch(
        "app.routers.registration.stripe_service.create_checkout_session",
        new_callable=AsyncMock,
        return_value="https://checkout.stripe.com/c/pay/cs_test_abc",
    ):
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}",
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
                "phone": "+14045551234",
                "accommodation_type": "bell_tent",
                "dietary_restrictions": "vegan",
                "waiver_accepted": True,
                "intake_data": {"how_did_you_hear": "Instagram"},
            },
        )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending_payment"
    assert data["checkout_url"] == "https://checkout.stripe.com/c/pay/cs_test_abc"
    assert data["registration_id"]


async def test_free_event_registration(client, free_event):
    """Free event registration completes immediately with status COMPLETE."""
    response = await client.post(
        f"/api/v1/register/{free_event.slug}",
        json={
            "first_name": "Bob",
            "last_name": "Smith",
            "email": "bob@example.com",
            "waiver_accepted": True,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "complete"
    assert data["checkout_url"] is None


async def test_duplicate_registration(client, sample_event):
    """Registering same email for same event returns 409."""
    with patch(
        "app.routers.registration.stripe_service.create_checkout_session",
        new_callable=AsyncMock,
        return_value="https://checkout.stripe.com/c/pay/cs_test_1",
    ):
        # First registration
        await client.post(
            f"/api/v1/register/{sample_event.slug}",
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "duplicate@example.com",
                "waiver_accepted": True,
            },
        )

        # Second registration — same email, same event
        response = await client.post(
            f"/api/v1/register/{sample_event.slug}",
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "duplicate@example.com",
                "waiver_accepted": True,
            },
        )

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"]


async def test_capacity_full(client, full_event):
    """Registration to a full event returns 403."""
    response = await client.post(
        f"/api/v1/register/{full_event.slug}",
        json={
            "first_name": "New",
            "last_name": "Person",
            "email": "new@example.com",
            "waiver_accepted": True,
        },
    )

    assert response.status_code == 403
    assert "capacity" in response.json()["detail"].lower()


async def test_waiver_not_accepted(client, sample_event):
    """Registration without accepting waiver returns 400."""
    response = await client.post(
        f"/api/v1/register/{sample_event.slug}",
        json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "waiver_accepted": False,
        },
    )

    assert response.status_code == 400
    assert "waiver" in response.json()["detail"].lower()


async def test_event_not_found(client):
    """Registration to nonexistent event returns 404."""
    response = await client.post(
        "/api/v1/register/nonexistent-event",
        json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "waiver_accepted": True,
        },
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
