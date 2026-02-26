import json
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.models import Registration, RegistrationStatus, WebhookRaw
from tests.conftest import TestSessionLocal

pytestmark = pytest.mark.asyncio


def _make_stripe_event(event_id: str, event_type: str, registration_id, **kwargs):
    """Build a mock Stripe event dict."""
    session_obj = {
        "id": "cs_test_session_123",
        "client_reference_id": str(registration_id),
        "amount_total": 25000,
        "payment_intent": "pi_test_123",
    }
    session_obj.update(kwargs)
    return {
        "id": event_id,
        "type": event_type,
        "data": {"object": session_obj},
    }


async def test_checkout_completed(client, sample_registration):
    """checkout.session.completed webhook updates registration to COMPLETE."""
    reg_id = sample_registration.id
    stripe_event = _make_stripe_event(
        "evt_completed_1", "checkout.session.completed", reg_id
    )

    with patch(
        "app.routers.webhooks.verify_webhook",
        return_value=stripe_event,
    ), patch(
        "app.routers.webhooks.send_confirmation_email",
        new_callable=AsyncMock,
    ):
        response = await client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(stripe_event).encode(),
            headers={
                "stripe-signature": "test_sig",
                "content-type": "application/json",
            },
        )

    assert response.status_code == 200
    assert response.json()["status"] == "processed"

    # Open a fresh session to verify the committed state
    async with TestSessionLocal() as fresh_session:
        result = await fresh_session.execute(
            select(Registration).where(Registration.id == reg_id)
        )
        reg = result.scalar_one()
        assert reg.status == RegistrationStatus.complete
        assert reg.payment_amount_cents == 25000
        assert reg.stripe_payment_intent_id == "pi_test_123"


async def test_idempotent_webhook(client, sample_registration, db_session):
    """Same Stripe event_id processed twice returns already_processed on second call."""
    reg_id = sample_registration.id
    stripe_event = _make_stripe_event(
        "evt_idempotent_1", "checkout.session.completed", reg_id
    )

    with patch(
        "app.routers.webhooks.verify_webhook",
        return_value=stripe_event,
    ), patch(
        "app.routers.webhooks.send_confirmation_email",
        new_callable=AsyncMock,
    ):
        # First call
        resp1 = await client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(stripe_event).encode(),
            headers={
                "stripe-signature": "test_sig",
                "content-type": "application/json",
            },
        )
        assert resp1.json()["status"] == "processed"

        # Second call — same event_id
        resp2 = await client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(stripe_event).encode(),
            headers={
                "stripe-signature": "test_sig",
                "content-type": "application/json",
            },
        )

    assert resp2.status_code == 200
    assert resp2.json()["status"] == "already_processed"

    # Verify only one webhook_raw entry exists (use fresh session)
    async with TestSessionLocal() as fresh_session:
        result = await fresh_session.execute(
            select(WebhookRaw).where(WebhookRaw.stripe_event_id == "evt_idempotent_1")
        )
        webhooks = result.scalars().all()
        assert len(webhooks) == 1


async def test_checkout_expired(client, sample_registration):
    """checkout.session.expired webhook updates registration to EXPIRED."""
    reg_id = sample_registration.id
    stripe_event = _make_stripe_event(
        "evt_expired_1", "checkout.session.expired", reg_id
    )

    with patch(
        "app.routers.webhooks.verify_webhook",
        return_value=stripe_event,
    ):
        response = await client.post(
            "/api/v1/webhooks/stripe",
            content=json.dumps(stripe_event).encode(),
            headers={
                "stripe-signature": "test_sig",
                "content-type": "application/json",
            },
        )

    assert response.status_code == 200
    assert response.json()["status"] == "processed"

    # Open a fresh session to verify the committed state
    async with TestSessionLocal() as fresh_session:
        result = await fresh_session.execute(
            select(Registration).where(Registration.id == reg_id)
        )
        reg = result.scalar_one()
        assert reg.status == RegistrationStatus.expired
