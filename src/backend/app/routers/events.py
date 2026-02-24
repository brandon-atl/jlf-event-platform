"""Events CRUD router — all endpoints require operator/admin auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AuditLog, Event, EventStatus, Registration, RegistrationStatus
from ..schemas.events import EventCreate, EventResponse, EventStats, EventUpdate
from ..schemas.common import PaginatedResponse, PaginationMeta
from ..services.auth_service import get_current_user
from ..models import User

router = APIRouter(prefix="/events", tags=["events"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _compute_event_stats(db: AsyncSession, event: Event) -> EventStats:
    """Compute registration/revenue stats for a single event."""
    result = await db.execute(
        select(
            func.count(Registration.id).label("total"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.complete)
            .label("complete"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.pending_payment)
            .label("pending_payment"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.cancelled)
            .label("cancelled"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.refunded)
            .label("refunded"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.expired)
            .label("expired"),
            func.coalesce(
                func.sum(Registration.payment_amount_cents).filter(
                    Registration.status == RegistrationStatus.complete
                ),
                0,
            ).label("revenue"),
        ).where(Registration.event_id == event.id)
    )
    row = result.one()

    # Accommodation breakdown (only COMPLETE registrations)
    acc_result = await db.execute(
        select(Registration.accommodation_type, func.count(Registration.id))
        .where(
            Registration.event_id == event.id,
            Registration.status == RegistrationStatus.complete,
            Registration.accommodation_type.is_not(None),
        )
        .group_by(Registration.accommodation_type)
    )
    accommodation = {r[0]: r[1] for r in acc_result.all()}

    spots_remaining = None
    if event.capacity is not None:
        spots_remaining = max(0, event.capacity - row.complete)

    return EventStats(
        total_registrations=row.total,
        complete=row.complete,
        pending_payment=row.pending_payment,
        cancelled=row.cancelled,
        refunded=row.refunded,
        expired=row.expired,
        total_revenue_cents=row.revenue,
        spots_remaining=spots_remaining,
        accommodation_breakdown=accommodation,
    )


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
    """Write an entry to the audit_log table."""
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)


def _event_to_response(event: Event, stats: EventStats | None = None) -> EventResponse:
    return EventResponse(
        id=event.id,
        name=event.name,
        slug=event.slug,
        description=event.description,
        event_date=event.event_date,
        event_end_date=event.event_end_date,
        event_type=event.event_type,
        pricing_model=event.pricing_model.value if hasattr(event.pricing_model, "value") else event.pricing_model,
        fixed_price_cents=event.fixed_price_cents,
        min_donation_cents=event.min_donation_cents,
        stripe_price_id=event.stripe_price_id,
        capacity=event.capacity,
        meeting_point_a=event.meeting_point_a,
        meeting_point_b=event.meeting_point_b,
        reminder_delay_minutes=event.reminder_delay_minutes,
        auto_expire_hours=event.auto_expire_hours,
        day_of_sms_time=str(event.day_of_sms_time) if event.day_of_sms_time else None,
        registration_fields=event.registration_fields,
        notification_templates=event.notification_templates,
        status=event.status.value if hasattr(event.status, "value") else event.status,
        created_at=event.created_at,
        updated_at=event.updated_at,
        stats=stats,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedResponse)
async def list_events(
    status_filter: str | None = Query(None, alias="status"),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all events with optional filters and pagination."""
    query = select(Event)

    if status_filter:
        query = query.where(Event.status == status_filter)
    if date_from:
        query = query.where(Event.event_date >= date_from)
    if date_to:
        query = query.where(Event.event_date <= date_to)

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(Event.event_date.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    events = result.scalars().all()

    # Compute basic stats for each event in the list
    data = []
    for e in events:
        stats = await _compute_event_stats(db, e)
        data.append(_event_to_response(e, stats=stats))
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(total=total, page=page, per_page=per_page),
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event."""
    # Check slug uniqueness
    existing = await db.execute(select(Event).where(Event.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Event with slug '{body.slug}' already exists",
        )

    event = Event(**body.model_dump())
    db.add(event)

    await _audit_log(
        db,
        entity_type="event",
        entity_id=event.id,
        action="created",
        actor=current_user.email,
        new_value=body.model_dump(mode="json"),
    )

    await db.commit()
    await db.refresh(event)
    return _event_to_response(event)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get event details with computed stats."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    stats = await _compute_event_stats(db, event)
    return _event_to_response(event, stats=stats)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an event. Logs changes to audit_log."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Capture old values for audit
    old_values = {}
    for field in update_data:
        val = getattr(event, field, None)
        if hasattr(val, "value"):
            val = val.value
        old_values[field] = val

    # Check slug uniqueness if changing
    if "slug" in update_data and update_data["slug"] != event.slug:
        existing = await db.execute(
            select(Event).where(Event.slug == update_data["slug"], Event.id != event_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Event with slug '{update_data['slug']}' already exists",
            )

    for field, value in update_data.items():
        setattr(event, field, value)

    await _audit_log(
        db,
        entity_type="event",
        entity_id=event.id,
        action="updated",
        actor=current_user.email,
        old_value=old_values,
        new_value=update_data,
    )

    await db.commit()
    await db.refresh(event)

    stats = await _compute_event_stats(db, event)
    return _event_to_response(event, stats=stats)


@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete an event by setting status to cancelled."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    old_status = event.status.value if hasattr(event.status, "value") else event.status
    event.status = EventStatus.cancelled

    await _audit_log(
        db,
        entity_type="event",
        entity_id=event.id,
        action="soft_deleted",
        actor=current_user.email,
        old_value={"status": old_status},
        new_value={"status": EventStatus.cancelled.value},
    )

    await db.commit()
    return {"detail": "Event cancelled", "id": event_id}
