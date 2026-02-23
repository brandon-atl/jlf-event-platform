import stripe

from app.config import settings
from app.models.event import Event
from app.models.registration import Registration

stripe.api_key = settings.stripe_api_key


async def create_checkout_session(
    registration: Registration, event: Event
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
        params["line_items"] = [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": event.min_donation_cents or 100,
                    "product_data": {"name": event.name},
                },
                "quantity": 1,
                "adjustable_quantity": {"enabled": False},
            }
        ]
        params["custom_fields"] = []
    else:
        # Free event — no Stripe needed
        return ""

    session = stripe.checkout.Session.create(**params)
    return session.url


def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify a Stripe webhook signature and return the event."""
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )
