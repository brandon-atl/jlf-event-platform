"""Sub-events CRUD and recurring dates endpoints."""

import uuid as _uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AuditLog, Event, User
from ..models.sub_event import SubEvent, SubEventPricingModel
from ..models.registration_sub_event import RegistrationSubEvent
from ..schemas.sub_events import (
    RecurringDateInfo,
    SubEventCreate,
    SubEventResponse,
    SubEventUpdate,
)
from ..services.auth_service import get_current_user

router = APIRouter(tags=["sub-events"])


def _to_uuid(val: str) -> _uuid.UUID:
    """Convert string to UUID, raising 422 if invalid."""
    try:
        return _uuid.UUID(val)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid UUID format")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _audit_log(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)


def _sub_event_to_response(se: SubEvent) -> SubEventResponse:
    return SubEventResponse(
        id=se.id,
        parent_event_id=se.parent_event_id,
        name=se.name,
        description=se.description,
        pricing_model=se.pricing_model.value if hasattr(se.pricing_model, "value") else se.pricing_model,
        fixed_price_cents=se.fixed_price_cents,
        min_donation_cents=se.min_donation_cents,
        stripe_price_id=se.stripe_price_id,
        capacity=se.capacity,
        sort_order=se.sort_order,
        is_required=se.is_required,
        created_at=se.created_at,
        updated_at=se.updated_at,
    )


# ---------------------------------------------------------------------------
# Sub-Event CRUD
# ---------------------------------------------------------------------------

@router.get("/events/{event_id}/sub-events", response_model=list[SubEventResponse])
async def list_sub_events(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List sub-events for a composite event, ordered by sort_order."""
    result = await db.execute(select(Event).where(Event.id == _to_uuid(event_id)))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(SubEvent)
        .where(SubEvent.parent_event_id == _to_uuid(event_id))
        .order_by(SubEvent.sort_order)
    )
    return [_sub_event_to_response(se) for se in result.scalars().all()]


@router.post(
    "/events/{event_id}/sub-events",
    response_model=SubEventResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sub_event(
    event_id: str,
    body: SubEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a sub-event to a composite event."""
    result = await db.execute(select(Event).where(Event.id == _to_uuid(event_id)))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    pm = event.pricing_model.value if hasattr(event.pricing_model, "value") else event.pricing_model
    if pm != "composite":
        raise HTTPException(
            status_code=422,
            detail="Sub-events can only be added to composite events",
        )

    # Validate sub-event pricing model
    try:
        sub_pricing = SubEventPricingModel(body.pricing_model)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid pricing_model for sub-event. Must be fixed, donation, or free.")

    sub_event = SubEvent(
        parent_event_id=_to_uuid(event_id),
        name=body.name,
        description=body.description,
        pricing_model=sub_pricing,
        fixed_price_cents=body.fixed_price_cents,
        min_donation_cents=body.min_donation_cents,
        stripe_price_id=body.stripe_price_id,
        capacity=body.capacity,
        sort_order=body.sort_order,
        is_required=body.is_required,
    )
    db.add(sub_event)
    await db.flush()

    await _audit_log(
        db,
        entity_type="sub_event",
        entity_id=sub_event.id,
        action="created",
        actor=current_user.email,
        new_value=body.model_dump(mode="json"),
    )

    await db.commit()
    await db.refresh(sub_event)
    return _sub_event_to_response(sub_event)


@router.put("/events/{event_id}/sub-events/{sub_event_id}", response_model=SubEventResponse)
async def update_sub_event(
    event_id: str,
    sub_event_id: str,
    body: SubEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a sub-event."""
    result = await db.execute(
        select(SubEvent).where(
            SubEvent.id == _to_uuid(sub_event_id),
            SubEvent.parent_event_id == _to_uuid(event_id),
        )
    )
    sub_event = result.scalar_one_or_none()
    if not sub_event:
        raise HTTPException(status_code=404, detail="Sub-event not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Validate pricing_model if being changed
    if "pricing_model" in update_data:
        try:
            update_data["pricing_model"] = SubEventPricingModel(update_data["pricing_model"])
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid pricing_model for sub-event.")

    old_values = {}
    for field in update_data:
        val = getattr(sub_event, field, None)
        if hasattr(val, "value"):
            val = val.value
        old_values[field] = val

    for field, value in update_data.items():
        setattr(sub_event, field, value)

    await _audit_log(
        db,
        entity_type="sub_event",
        entity_id=_to_uuid(sub_event_id),
        action="updated",
        actor=current_user.email,
        old_value=old_values,
        new_value=body.model_dump(exclude_unset=True, mode="json"),
    )

    await db.commit()
    await db.refresh(sub_event)
    return _sub_event_to_response(sub_event)


@router.delete("/events/{event_id}/sub-events/{sub_event_id}", status_code=status.HTTP_200_OK)
async def delete_sub_event(
    event_id: str,
    sub_event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a sub-event. Fails if registrations reference it."""
    result = await db.execute(
        select(SubEvent).where(
            SubEvent.id == _to_uuid(sub_event_id),
            SubEvent.parent_event_id == _to_uuid(event_id),
        )
    )
    sub_event = result.scalar_one_or_none()
    if not sub_event:
        raise HTTPException(status_code=404, detail="Sub-event not found")

    # Check for existing registrations referencing this sub-event
    reg_count = await db.execute(
        select(func.count()).where(RegistrationSubEvent.sub_event_id == _to_uuid(sub_event_id))
    )
    if (reg_count.scalar() or 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete sub-event with existing registrations",
        )

    await _audit_log(
        db,
        entity_type="sub_event",
        entity_id=_to_uuid(sub_event_id),
        action="deleted",
        actor=current_user.email,
        old_value={"name": sub_event.name},
    )

    await db.delete(sub_event)
    await db.commit()
    return {"detail": "Sub-event deleted", "id": sub_event_id}


# ---------------------------------------------------------------------------
# Recurring Dates
# ---------------------------------------------------------------------------

@router.get("/events/{event_slug}/recurring-dates")
async def get_recurring_dates(
    event_slug: str,
    count: int = Query(10, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
):
    """List upcoming dates for a recurring event (public, no auth)."""
    result = await db.execute(select(Event).where(Event.slug == event_slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.is_recurring or not event.recurrence_rule:
        raise HTTPException(status_code=422, detail="This event is not recurring")

    from dateutil.rrule import rrulestr

    # Ensure dtstart is timezone-aware for consistent rrule generation
    dtstart = event.event_date
    if dtstart and dtstart.tzinfo is None:
        dtstart = dtstart.replace(tzinfo=UTC)

    try:
        rule = rrulestr(event.recurrence_rule, dtstart=dtstart)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid recurrence rule: {e}")

    now = datetime.now(UTC)

    # Generate upcoming dates using xafter for efficiency (avoids iterating past dates)
    occurrences = list(rule.xafter(now, count=count, inc=True))

    dates = []
    for dt in occurrences:
        date_str = dt.strftime("%Y-%m-%d")
        # spots_remaining and is_full omitted: event-wide capacity doesn't reflect
        # per-occurrence availability. Will be added when per-date tracking exists.
        dates.append(RecurringDateInfo(
            date=date_str,
        ))

    return {
        "event_name": event.name,
        "recurrence_rule": event.recurrence_rule,
        "dates": [d.model_dump() for d in dates],
    }
