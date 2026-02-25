"""Public registration endpoints — no auth required."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

limiter = Limiter(key_func=get_remote_address)


def sanitize_intake_data(data: dict | None, max_size_kb: int = 10) -> dict:
    """Sanitize intake_data JSON to prevent abuse.
    
    - Removes keys starting with _ or $
    - Truncates string values to 2000 chars
    - Limits nesting depth to 2
    - Rejects if serialized size > max_size_kb
    """
    import json
    
    if data is None:
        return {}
    
    def _sanitize(obj: object, depth: int = 0) -> object:
        if depth > 2:
            return None  # Too deep
        
        if isinstance(obj, dict):
            return {
                k: _sanitize(v, depth + 1)
                for k, v in obj.items()
                if isinstance(k, str) and not k.startswith(("_", "$"))
            }
        elif isinstance(obj, list):
            return [_sanitize(item, depth + 1) for item in obj[:100]]  # Max 100 items
        elif isinstance(obj, str):
            return obj[:2000]  # Truncate long strings
        elif isinstance(obj, (int, float, bool, type(None))):
            return obj
        else:
            return str(obj)[:500]  # Convert unknown types to string
    
    sanitized = _sanitize(data)
    
    # Check size
    serialized = json.dumps(sanitized)
    if len(serialized) > max_size_kb * 1024:
        raise ValueError(f"intake_data exceeds {max_size_kb}KB limit")
    
    return sanitized
from app.models.attendee import Attendee
from app.models.event import Event, EventStatus
from app.models.registration import (
    AccommodationType,
    Registration,
    RegistrationSource,
    RegistrationStatus,
)
from app.schemas.registration import EventInfo, RegistrationCreate, RegistrationResponse
from app.services.email_service import send_confirmation_email
from app.services.stripe_service import create_checkout_session

router = APIRouter(prefix="/register", tags=["registration"])


@router.get("/{event_slug}/info", response_model=dict)
async def get_event_info(event_slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.slug == event_slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Count COMPLETE + PENDING_PAYMENT registrations for spots
    reg_count_result = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.event_id == event.id,
            Registration.status.in_([
                RegistrationStatus.pending_payment,
                RegistrationStatus.complete,
            ]),
        )
    )
    reg_count = reg_count_result.scalar() or 0
    spots_remaining = (event.capacity - reg_count) if event.capacity else None

    info = EventInfo(
        name=event.name,
        slug=event.slug,
        event_date=event.event_date,
        event_end_date=event.event_end_date,
        event_type=event.event_type,
        pricing_model=event.pricing_model.value,
        fixed_price_cents=event.fixed_price_cents,
        min_donation_cents=event.min_donation_cents,
        capacity=event.capacity,
        spots_remaining=spots_remaining,
        registration_fields=event.registration_fields,
        description=event.description,
    )
    return {"event": info.model_dump(mode="json")}


@router.post("/{event_slug}", response_model=RegistrationResponse, status_code=201)
@limiter.limit("20/minute")
async def create_registration(
    request: Request,
    event_slug: str,
    data: RegistrationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Look up event
    result = await db.execute(
        select(Event).where(Event.slug == event_slug, Event.status == EventStatus.active)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not active")

    # Check capacity
    if event.capacity:
        reg_count_result = await db.execute(
            select(func.count(Registration.id)).where(
                Registration.event_id == event.id,
                Registration.status.in_([
                    RegistrationStatus.pending_payment,
                    RegistrationStatus.complete,
                ]),
            )
        )
        if (reg_count_result.scalar() or 0) >= event.capacity:
            raise HTTPException(status_code=403, detail="Event is at capacity")

    # Get or create attendee
    att_result = await db.execute(
        select(Attendee).where(Attendee.email == data.email)
    )
    attendee = att_result.scalar_one_or_none()
    if not attendee:
        attendee = Attendee(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
        )
        db.add(attendee)
        await db.flush()

    # Check for duplicate registration
    dup_result = await db.execute(
        select(Registration).where(
            Registration.attendee_id == attendee.id,
            Registration.event_id == event.id,
            Registration.status.in_([
                RegistrationStatus.pending_payment,
                RegistrationStatus.complete,
            ]),
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="You are already registered for this event. Check your email for confirmation.",
        )

    # Validate waiver
    if not data.waiver_accepted:
        raise HTTPException(status_code=422, detail="Waiver must be accepted")

    # Build accommodation enum
    accommodation = None
    if data.accommodation_type:
        try:
            accommodation = AccommodationType(data.accommodation_type)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid accommodation type")

    # Sanitize intake_data (arbitrary JSON from user input)
    try:
        safe_intake = sanitize_intake_data(data.intake_data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Create registration
    registration = Registration(
        attendee_id=attendee.id,
        event_id=event.id,
        status=RegistrationStatus.pending_payment,
        accommodation_type=accommodation,
        dietary_restrictions=data.dietary_restrictions,
        intake_data=safe_intake,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db.add(registration)
    await db.flush()

    # Create Stripe Checkout session
    checkout_url = await create_checkout_session(
        registration, event, custom_amount_cents=data.donation_amount_cents
    )

    if not checkout_url and event.pricing_model.value == "free":
        registration.status = RegistrationStatus.complete

        # Ensure relationships are set to avoid async lazy-load issues
        registration.attendee = attendee
        registration.event = event

        # Persist first, then fire email in background so failures never block the response
        await db.commit()
        background_tasks.add_task(send_confirmation_email, registration, event)

    return RegistrationResponse(
        registration_id=registration.id,
        checkout_url=checkout_url or None,
        status=registration.status.value,
    )


@router.get("/{event_slug}/success")
async def registration_success(
    event_slug: str,
    session_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.slug == event_slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return {
        "event_name": event.name,
        "event_date": event.event_date.isoformat(),
        "message": "Your registration is confirmed! Check your email for details.",
    }


@router.get("/{event_slug}/cancelled")
async def registration_cancelled(
    event_slug: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.slug == event_slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return {
        "event_name": event.name,
        "message": "Your registration was not completed. You can try again anytime.",
    }
