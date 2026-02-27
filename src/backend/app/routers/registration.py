"""Public registration endpoints — no auth required."""

import logging
import uuid as uuid_mod
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter  # shared app-level limiter

logger = logging.getLogger(__name__)


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
            return "[truncated]"  # Too deep — explicit sentinel instead of null

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

    # Check size using compact JSON (no extra whitespace) for accurate byte count
    serialized = json.dumps(sanitized, separators=(",", ":"))
    if len(serialized) > max_size_kb * 1024:
        raise ValueError(f"intake_data exceeds {max_size_kb}KB limit")

    return sanitized


from app.models.attendee import Attendee
from app.models.event import Event, EventStatus
from app.models.registration import (
    AccommodationType,
    PaymentMethod,
    Registration,
    RegistrationSource,
    RegistrationStatus,
)
from app.models.membership import Membership
from app.models.scholarship_link import ScholarshipLink
from app.models.sub_event import SubEvent
from app.models.registration_sub_event import RegistrationSubEvent
from app.schemas.registration import (
    EventInfo,
    GroupRegistrationCreate,
    GroupRegistrationItem,
    GroupRegistrationResponse,
    RegistrationCreate,
    RegistrationResponse,
    SubEventInfo,
)
from app.services.email_service import send_confirmation_email
from app.services.stripe_service import create_checkout_session

router = APIRouter(prefix="/register", tags=["registration"])


async def _calculate_composite_price(
    db: AsyncSession,
    event: Event,
    selected_sub_event_ids: list[str],
) -> tuple[list[SubEvent], int]:
    """Validate sub-event selections and calculate total price for a composite event.

    Returns (selected_sub_events, total_price_cents).
    """
    if not selected_sub_event_ids:
        raise HTTPException(status_code=422, detail="At least one sub-event must be selected for composite events")

    # Fetch sub-events for this event
    result = await db.execute(
        select(SubEvent)
        .where(SubEvent.parent_event_id == event.id)
        .order_by(SubEvent.sort_order)
    )
    all_sub_events = result.scalars().all()
    sub_event_map = {str(se.id): se for se in all_sub_events}

    # Validate all selected IDs exist and belong to this event
    selected = []
    for sid in selected_sub_event_ids:
        se = sub_event_map.get(sid)
        if not se:
            raise HTTPException(status_code=422, detail=f"Sub-event {sid} not found for this event")
        selected.append(se)

    # Validate all required sub-events are included
    selected_ids_set = set(selected_sub_event_ids)
    for se in all_sub_events:
        if se.is_required and str(se.id) not in selected_ids_set:
            raise HTTPException(
                status_code=422,
                detail=f"Required sub-event '{se.name}' must be selected",
            )

    # Calculate total price
    total = 0
    for se in selected:
        pm = se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model
        if pm == "fixed" and se.fixed_price_cents:
            total += se.fixed_price_cents
        # donation and free sub-events contribute 0 to the required total

    return selected, total


async def _create_registration_sub_events(
    db: AsyncSession,
    registration_id,
    selected_sub_events: list[SubEvent],
) -> None:
    """Create registration_sub_events rows for a composite registration."""
    for se in selected_sub_events:
        pm = se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model
        amount = None
        if pm == "fixed" and se.fixed_price_cents:
            amount = se.fixed_price_cents
        rse = RegistrationSubEvent(
            registration_id=registration_id,
            sub_event_id=se.id,
            payment_amount_cents=amount,
        )
        db.add(rse)


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
                RegistrationStatus.cash_pending,
                RegistrationStatus.complete,
            ]),
        )
    )
    reg_count = reg_count_result.scalar() or 0
    spots_remaining = (event.capacity - reg_count) if event.capacity else None

    # Build sub_events for composite events
    sub_events_info = None
    pm = event.pricing_model.value if hasattr(event.pricing_model, "value") else event.pricing_model
    if pm == "composite" and hasattr(event, "sub_events") and event.sub_events:
        sub_events_info = [
            SubEventInfo(
                id=se.id,
                name=se.name,
                description=se.description,
                pricing_model=se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model,
                fixed_price_cents=se.fixed_price_cents,
                min_donation_cents=se.min_donation_cents,
                capacity=se.capacity,
                sort_order=se.sort_order,
                is_required=se.is_required,
            )
            for se in sorted(event.sub_events, key=lambda s: s.sort_order)
        ]

    info = EventInfo(
        name=event.name,
        slug=event.slug,
        event_date=event.event_date,
        event_end_date=event.event_end_date,
        event_type=event.event_type,
        pricing_model=pm,
        fixed_price_cents=event.fixed_price_cents,
        min_donation_cents=event.min_donation_cents,
        capacity=event.capacity,
        spots_remaining=spots_remaining,
        registration_fields=event.registration_fields,
        description=event.description,
        allow_cash_payment=event.allow_cash_payment,
        is_recurring=event.is_recurring,
        recurrence_rule=event.recurrence_rule,
        sub_events=sub_events_info,
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
                RegistrationStatus.cash_pending,
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

    # Resolve payment method
    try:
        payment_method = PaymentMethod(data.payment_method)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid payment_method")

    # BUG 2: Scholarship code handling with row-level lock to prevent race conditions
    scholarship_link = None
    scholarship_amount = None
    if data.scholarship_code:
        sl_result = await db.execute(
            select(ScholarshipLink)
            .where(ScholarshipLink.code == data.scholarship_code)
            .with_for_update()
        )
        scholarship_link = sl_result.scalar_one_or_none()
        if not scholarship_link or scholarship_link.uses >= scholarship_link.max_uses:
            raise HTTPException(status_code=422, detail="Invalid or fully redeemed scholarship code")
        if scholarship_link.event_id != event.id:
            raise HTTPException(status_code=422, detail="This scholarship code is not valid for this event")
        payment_method = PaymentMethod.scholarship
        scholarship_amount = scholarship_link.scholarship_price_cents

    # Cash payment requires event to allow it
    if payment_method == PaymentMethod.cash and not event.allow_cash_payment:
        raise HTTPException(
            status_code=422,
            detail="This event does not accept cash payments",
        )

    # Free payment method only allowed for free events
    if payment_method == PaymentMethod.free and event.pricing_model.value != "free":
        raise HTTPException(
            status_code=422,
            detail="Free payment method is only allowed for free events",
        )

    # Sanitize intake_data (arbitrary JSON from user input)
    try:
        safe_intake = sanitize_intake_data(data.intake_data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Handle composite event pricing
    is_composite = event.pricing_model.value == "composite"
    selected_sub_events = []
    composite_total = 0

    if is_composite:
        selected_sub_events, composite_total = await _calculate_composite_price(
            db, event, data.selected_sub_event_ids or []
        )
        # For scholarship on composite, use scholarship amount instead
        if scholarship_amount:
            composite_total = scholarship_amount

    # Determine initial status based on payment method and pricing model
    is_free_event = event.pricing_model.value == "free"
    if payment_method == PaymentMethod.cash:
        initial_status = RegistrationStatus.cash_pending
    elif is_free_event or payment_method == PaymentMethod.free:
        initial_status = RegistrationStatus.complete
    elif is_composite and composite_total == 0:
        initial_status = RegistrationStatus.complete
    else:
        initial_status = RegistrationStatus.pending_payment

    # Create registration
    registration = Registration(
        attendee_id=attendee.id,
        event_id=event.id,
        status=initial_status,
        payment_method=payment_method,
        payment_amount_cents=composite_total if is_composite else None,
        accommodation_type=accommodation,
        dietary_restrictions=data.dietary_restrictions,
        intake_data=safe_intake,
        waiver_accepted_at=datetime.now(timezone.utc),
        source=RegistrationSource.registration_form,
    )
    db.add(registration)
    await db.flush()

    # Create registration_sub_events for composite
    if is_composite and selected_sub_events:
        await _create_registration_sub_events(db, registration.id, selected_sub_events)

    # Increment scholarship uses
    if scholarship_link:
        scholarship_link.uses += 1

    # Route by payment method
    checkout_url = None

    if initial_status == RegistrationStatus.complete:
        # Free event — confirm immediately
        registration.attendee = attendee
        registration.event = event
        await db.commit()
        background_tasks.add_task(send_confirmation_email, registration, event)
        return RegistrationResponse(
            registration_id=registration.id,
            checkout_url=None,
            status=registration.status.value,
            message="You're registered! Check your email for confirmation.",
        )

    if initial_status == RegistrationStatus.cash_pending:
        # Cash — no Stripe, registered immediately
        registration.attendee = attendee
        registration.event = event
        await db.commit()
        background_tasks.add_task(send_confirmation_email, registration, event)
        return RegistrationResponse(
            registration_id=registration.id,
            checkout_url=None,
            status=registration.status.value,
            message="Registration received. Please bring payment to the event.",
        )

    # Stripe / scholarship — create Checkout session
    registration.attendee = attendee
    registration.event = event

    if is_composite and selected_sub_events:
        # Multi-line-item Checkout for composite events
        import stripe
        from app.config import settings

        line_items = []
        for se in selected_sub_events:
            pm = se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model
            amount = 0
            if scholarship_amount:
                # Distribute scholarship evenly? No — flat $30 total
                # For scholarship, use a single line item below
                continue
            elif pm == "fixed" and se.fixed_price_cents:
                amount = se.fixed_price_cents
            if amount > 0:
                line_items.append({
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": amount,
                        "product_data": {
                            "name": f"{event.name} — {se.name}",
                        },
                    },
                    "quantity": 1,
                })

        # If scholarship, use single line item
        if scholarship_amount:
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

        if not line_items:
            # All sub-events are free/donation
            registration.status = RegistrationStatus.complete
            await db.commit()
            background_tasks.add_task(send_confirmation_email, registration, event)
            return RegistrationResponse(
                registration_id=registration.id,
                checkout_url=None,
                status="complete",
                message="You're registered! Check your email for confirmation.",
            )

        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                client_reference_id=str(registration.id),
                customer_email=data.email,
                success_url=f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.app_url}/register/{event.slug}/cancelled",
                metadata={
                    "registration_id": str(registration.id),
                    "event_id": str(event.id),
                    "event_slug": event.slug,
                },
                line_items=line_items,
            )
            checkout_url = session.url
            registration.stripe_checkout_session_id = session.id
        except stripe.error.StripeError as e:
            logger.error("Stripe checkout creation failed: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail="Payment provider error. Please try again.")

        await db.commit()
        return RegistrationResponse(
            registration_id=registration.id,
            checkout_url=checkout_url,
            status=registration.status.value,
        )

    # Standard (non-composite) Stripe/scholarship checkout
    checkout_url = await create_checkout_session(
        registration,
        event,
        custom_amount_cents=scholarship_amount or data.donation_amount_cents,
    )
    await db.commit()

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


@router.post("/{event_slug}/group", response_model=GroupRegistrationResponse, status_code=201)
@limiter.limit("10/minute")
async def create_group_registration(
    request: Request,
    event_slug: str,
    data: GroupRegistrationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Multi-guest registration — one payer, multiple attendees."""
    import stripe

    # Look up event — BUG 3: lock event row to prevent capacity overbooking
    result = await db.execute(
        select(Event)
        .where(Event.slug == event_slug, Event.status == EventStatus.active)
        .with_for_update()
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not active")

    if not data.guests:
        raise HTTPException(status_code=422, detail="At least one guest is required")

    if len(data.guests) > 10:
        raise HTTPException(status_code=422, detail="Maximum 10 guests per group")

    # MINOR 2: Reject group registration for donation-priced events
    if event.pricing_model.value == "donation" and len(data.guests) > 1:
        raise HTTPException(
            status_code=422,
            detail="Group registration is not available for donation-priced events",
        )

    # Check capacity for ALL guests at once
    if event.capacity:
        reg_count_result = await db.execute(
            select(func.count(Registration.id)).where(
                Registration.event_id == event.id,
                Registration.status.in_([
                    RegistrationStatus.pending_payment,
                    RegistrationStatus.complete,
                    RegistrationStatus.cash_pending,
                ]),
            )
        )
        current_count = reg_count_result.scalar() or 0
        if current_count + len(data.guests) > event.capacity:
            remaining = event.capacity - current_count
            raise HTTPException(
                status_code=403,
                detail=f"Not enough spots. Only {remaining} spot(s) remaining.",
            )

    # Resolve payment method
    try:
        payment_method = PaymentMethod(data.payment_method)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid payment_method")

    # BUG 2: Scholarship code handling with row-level lock
    scholarship_link = None
    scholarship_amount = None
    if data.scholarship_code:
        sl_result = await db.execute(
            select(ScholarshipLink)
            .where(ScholarshipLink.code == data.scholarship_code)
            .with_for_update()
        )
        scholarship_link = sl_result.scalar_one_or_none()
        if not scholarship_link:
            raise HTTPException(status_code=422, detail="Invalid or fully redeemed scholarship code")
        # BUG 1: Pre-check uses + guest count against max_uses
        if scholarship_link.uses + len(data.guests) > scholarship_link.max_uses:
            remaining = scholarship_link.max_uses - scholarship_link.uses
            raise HTTPException(
                status_code=422,
                detail=f"Scholarship code does not have enough remaining uses. {remaining} use(s) left.",
            )
        if scholarship_link.event_id != event.id:
            raise HTTPException(status_code=422, detail="This scholarship code is not valid for this event")
        payment_method = PaymentMethod.scholarship
        scholarship_amount = scholarship_link.scholarship_price_cents

    # Cash payment requires event to allow it
    if payment_method == PaymentMethod.cash and not event.allow_cash_payment:
        raise HTTPException(status_code=422, detail="This event does not accept cash payments")

    # Free payment method only allowed for free events
    if payment_method == PaymentMethod.free and event.pricing_model.value != "free":
        raise HTTPException(status_code=422, detail="Free payment method is only allowed for free events")

    # Generate shared group_id
    group_id = uuid_mod.uuid4()

    # Determine initial status
    is_free_event = event.pricing_model.value == "free"
    if payment_method == PaymentMethod.cash:
        initial_status = RegistrationStatus.cash_pending
    elif is_free_event or payment_method == PaymentMethod.free:
        initial_status = RegistrationStatus.complete
    else:
        initial_status = RegistrationStatus.pending_payment

    # Check for duplicate emails within the group
    guest_emails = [g.email.lower() for g in data.guests]
    if len(guest_emails) != len(set(guest_emails)):
        raise HTTPException(status_code=422, detail="Duplicate email addresses in guest list")

    # BUG 5: Count existing member discount slots using member_discount_applied column
    member_discount_count = 0
    existing_member_regs = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.event_id == event.id,
            Registration.status.in_([
                RegistrationStatus.pending_payment,
                RegistrationStatus.cash_pending,
                RegistrationStatus.complete,
            ]),
            Registration.member_discount_applied == True,  # noqa: E712
        )
    )
    member_discount_count = existing_member_regs.scalar() or 0

    # ARCH 2: Keep ORM registration objects to avoid N+1 re-queries
    registration_objects = []
    registrations_created = []
    total_amount_cents = 0

    for guest in data.guests:
        # Validate waiver
        if not guest.waiver_accepted:
            raise HTTPException(
                status_code=422,
                detail=f"Waiver must be accepted for {guest.first_name} {guest.last_name}",
            )

        # Get or create attendee
        att_result = await db.execute(
            select(Attendee).where(Attendee.email == guest.email)
        )
        attendee = att_result.scalar_one_or_none()
        if not attendee:
            attendee = Attendee(
                email=guest.email,
                first_name=guest.first_name,
                last_name=guest.last_name,
                phone=guest.phone,
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
                    RegistrationStatus.cash_pending,
                    RegistrationStatus.complete,
                ]),
            )
        )
        if dup_result.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail=f"{guest.first_name} {guest.last_name} ({guest.email}) is already registered for this event.",
            )

        # Validate accommodation
        accommodation = None
        if guest.accommodation_type:
            try:
                accommodation = AccommodationType(guest.accommodation_type)
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid accommodation type")

        # Sanitize intake_data
        try:
            safe_intake = sanitize_intake_data(guest.intake_data)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # Handle composite sub-event selection for this guest
        guest_selected_sub_events = []
        is_composite = event.pricing_model.value == "composite"
        if is_composite and guest.selected_sub_event_ids:
            guest_selected_sub_events, _ = await _calculate_composite_price(
                db, event, guest.selected_sub_event_ids
            )

        # Calculate per-guest price
        guest_price = 0
        discount_applied = False
        if scholarship_amount:
            guest_price = scholarship_amount
        elif is_composite:
            # Sum sub-event prices for this guest
            for se in guest_selected_sub_events:
                pm = se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model
                if pm == "fixed" and se.fixed_price_cents:
                    guest_price += se.fixed_price_cents
        elif event.fixed_price_cents:
            guest_price = event.fixed_price_cents

        # Member discount applies to the total (not per sub-event)
        if guest_price > 0 and not scholarship_amount:
            if attendee.is_member and payment_method != PaymentMethod.scholarship:
                if member_discount_count < event.max_member_discount_slots:
                    if attendee.membership_id:
                        mem_result = await db.execute(
                            select(Membership).where(
                                Membership.id == attendee.membership_id,
                                Membership.is_active == True,  # noqa: E712
                            )
                        )
                        membership = mem_result.scalar_one_or_none()
                        if membership:
                            guest_price = max(0, guest_price - membership.discount_value_cents)
                            member_discount_count += 1
                            discount_applied = True

        total_amount_cents += guest_price

        # Create registration
        registration = Registration(
            attendee_id=attendee.id,
            event_id=event.id,
            status=initial_status,
            payment_method=payment_method,
            payment_amount_cents=guest_price if guest_price > 0 else None,
            accommodation_type=accommodation,
            dietary_restrictions=guest.dietary_restrictions,
            intake_data=safe_intake,
            waiver_accepted_at=datetime.now(timezone.utc),
            source=RegistrationSource.group,
            group_id=group_id,
            member_discount_applied=discount_applied,
        )
        registration.attendee = attendee
        registration.event = event
        db.add(registration)
        await db.flush()

        # Create sub-event selections for composite
        if is_composite and guest_selected_sub_events:
            await _create_registration_sub_events(db, registration.id, guest_selected_sub_events)

        registration_objects.append(registration)
        registrations_created.append(
            GroupRegistrationItem(
                registration_id=registration.id,
                attendee_name=f"{guest.first_name} {guest.last_name}",
            )
        )

    # BUG 1: Increment scholarship uses by guest count (not 1)
    if scholarship_link:
        scholarship_link.uses += len(data.guests)

    # Route by payment method
    if initial_status == RegistrationStatus.complete:
        await db.commit()
        # BUG 4: Send confirmation emails for each guest
        for reg in registration_objects:
            background_tasks.add_task(send_confirmation_email, reg, event)
        return GroupRegistrationResponse(
            group_id=group_id,
            registrations=registrations_created,
            status="complete",
            message="You're registered! Check your email for confirmation.",
        )

    if initial_status == RegistrationStatus.cash_pending:
        await db.commit()
        # BUG 4: Send confirmation emails for each guest
        for reg in registration_objects:
            background_tasks.add_task(send_confirmation_email, reg, event)
        return GroupRegistrationResponse(
            group_id=group_id,
            registrations=registrations_created,
            status="cash_pending",
            message="Registration received. Please bring payment to the event.",
        )

    # Stripe / scholarship — create single Checkout session for group total
    if total_amount_cents <= 0:
        # Edge case: all discounts made it free
        for reg in registration_objects:
            reg.status = RegistrationStatus.complete
        await db.commit()
        # BUG 4: Send confirmation emails
        for reg in registration_objects:
            background_tasks.add_task(send_confirmation_email, reg, event)
        return GroupRegistrationResponse(
            group_id=group_id,
            registrations=registrations_created,
            status="complete",
            message="You're registered! Check your email for confirmation.",
        )

    # ARCH 2: Build Stripe Checkout line items from in-memory objects (no N+1 queries)
    from app.config import settings

    line_items = []
    for reg, reg_item in zip(registration_objects, registrations_created):
        amount = reg.payment_amount_cents or event.fixed_price_cents or 0
        if amount > 0:
            line_items.append({
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount,
                    "product_data": {
                        "name": f"{event.name} — {reg_item.attendee_name}",
                    },
                },
                "quantity": 1,
            })

    if not line_items:
        # Everything is free after discounts
        for reg in registration_objects:
            reg.status = RegistrationStatus.complete
        await db.commit()
        for reg in registration_objects:
            background_tasks.add_task(send_confirmation_email, reg, event)
        return GroupRegistrationResponse(
            group_id=group_id,
            registrations=registrations_created,
            status="complete",
            message="You're registered! Check your email for confirmation.",
        )

    # ARCH 3: Catch stripe.error.StripeError specifically, sanitize message
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=str(group_id),
            customer_email=data.payer.email,
            success_url=f"{settings.app_url}/register/{event.slug}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.app_url}/register/{event.slug}/cancelled",
            metadata={
                "group_id": str(group_id),
                "event_id": str(event.id),
                "event_slug": event.slug,
                "registration_ids": ",".join(
                    str(r.registration_id) for r in registrations_created
                ),
            },
            line_items=line_items,
        )
        checkout_url = session.url
    except stripe.error.StripeError as e:
        logger.error("Stripe checkout creation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Payment provider error. Please try again.")

    # ARCH 2: Store checkout session ID directly on in-memory objects
    for reg in registration_objects:
        reg.stripe_checkout_session_id = session.id

    await db.commit()

    return GroupRegistrationResponse(
        group_id=group_id,
        registrations=registrations_created,
        checkout_url=checkout_url,
        status="pending_payment",
    )
