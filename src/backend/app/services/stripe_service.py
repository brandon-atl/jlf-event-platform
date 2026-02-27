import logging

import stripe

from app.config import settings
from app.models.event import Event
from app.models.registration import Registration
from app.models.sub_event import SubEvent

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key


async def create_checkout_session(
    registration: Registration, event: Event, custom_amount_cents: int | None = None
) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    params: dict = {
        "mode": "payment",
        "client_reference_id": str(registration.id),
        "customer_email": registration.attendee.email,
        "success_url": f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{settings.app_url}/register/{event.slug}/cancelled",
        "metadata": {
            "registration_id": str(registration.id),
            "event_id": str(event.id),
            "event_slug": event.slug,
        },
    }

    if event.pricing_model == "fixed" and event.stripe_price_id:
        params["line_items"] = [{"price": event.stripe_price_id, "quantity": 1}]
    elif event.pricing_model == "fixed" and event.fixed_price_cents:
        params["line_items"] = [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": event.fixed_price_cents,
                    "product_data": {"name": event.name},
                },
                "quantity": 1,
            }
        ]
    elif event.pricing_model == "donation":
        # Use custom amount from attendee, falling back to event minimum
        if custom_amount_cents is not None and custom_amount_cents > 0:
            amount = custom_amount_cents
        elif event.min_donation_cents is not None and event.min_donation_cents > 0:
            amount = event.min_donation_cents
        else:
            amount = 100  # $1.00 absolute floor
        # Enforce minimum if set
        if event.min_donation_cents and amount < event.min_donation_cents:
            amount = event.min_donation_cents
        params["line_items"] = [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount,
                    "product_data": {"name": event.name},
                },
                "quantity": 1,
            }
        ]
    else:
        # Free event — no Stripe needed
        return ""

    session = stripe.checkout.Session.create(**params)
    return session.url


async def create_composite_checkout_session(
    registration: Registration,
    event: Event,
    selected_sub_events: list[SubEvent],
    scholarship_amount: int | None = None,
) -> stripe.checkout.Session:
    """Create a Stripe Checkout Session for a composite event with multiple line items.

    Returns the Stripe Session object (caller uses .url and .id).
    """
    line_items = []

    if scholarship_amount:
        # Scholarship: single line item at flat scholarship price
        line_items = [{
            "price_data": {
                "currency": "usd",
                "unit_amount": scholarship_amount,
                "product_data": {
                    "name": f"{event.name} (Scholarship)",
                },
            },
            "quantity": 1,
        }]
    else:
        for se in selected_sub_events:
            pm = se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model
            if pm == "fixed" and se.fixed_price_cents:
                line_items.append({
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": se.fixed_price_cents,
                        "product_data": {
                            "name": f"{event.name} — {se.name}",
                        },
                    },
                    "quantity": 1,
                })

    if not line_items:
        return None

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=str(registration.id),
            customer_email=registration.attendee.email,
            success_url=f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.app_url}/register/{event.slug}/cancelled",
            metadata={
                "registration_id": str(registration.id),
                "event_id": str(event.id),
                "event_slug": event.slug,
            },
            line_items=line_items,
        )
        return session
    except stripe.error.StripeError as e:
        logger.error("Composite Stripe checkout creation failed: %s", e, exc_info=True)
        raise


def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify a Stripe webhook signature and return the event."""
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )
