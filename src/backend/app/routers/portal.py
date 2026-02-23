"""Co-creator portal router — scoped read-only access to assigned events."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import (
    CoCreator,
    Event,
    EventCoCreator,
    Registration,
    RegistrationStatus,
)
from ..schemas.portal import PortalAttendee, PortalEventDetail, PortalEventSummary
from ..services.auth_service import get_current_co_creator

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/events", response_model=list[PortalEventSummary])
async def list_portal_events(
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """List events assigned to the authenticated co-creator."""
    # Get event IDs this co-creator is assigned to
    links = await db.execute(
        select(EventCoCreator.event_id).where(
            EventCoCreator.co_creator_id == co_creator.id
        )
    )
    event_ids = [row[0] for row in links.all()]

    if not event_ids:
        return []

    events_result = await db.execute(
        select(Event)
        .where(Event.id.in_(event_ids))
        .order_by(Event.event_date.desc())
    )
    events = events_result.scalars().all()

    result = []
    for event in events:
        counts = await db.execute(
            select(
                func.count(Registration.id).label("total"),
                func.count(Registration.id)
                .filter(Registration.status == RegistrationStatus.COMPLETE)
                .label("complete"),
            ).where(Registration.event_id == event.id)
        )
        c = counts.one()
        result.append(
            PortalEventSummary(
                id=event.id,
                name=event.name,
                event_date=event.event_date,
                event_end_date=event.event_end_date,
                event_type=event.event_type,
                status=event.status.value if hasattr(event.status, "value") else event.status,
                total_registrations=c.total,
                complete_registrations=c.complete,
                capacity=event.capacity,
            )
        )
    return result


@router.get("/events/{event_id}", response_model=PortalEventDetail)
async def get_portal_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """Event detail with attendee list, scoped by co-creator permissions."""
    # Verify co-creator has access to this event
    link_result = await db.execute(
        select(EventCoCreator).where(
            EventCoCreator.event_id == event_id,
            EventCoCreator.co_creator_id == co_creator.id,
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=403, detail="You do not have access to this event")

    # Get event
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get COMPLETE registrations with attendee info
    regs_result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.COMPLETE,
        )
        .order_by(Registration.created_at.asc())
    )
    registrations = regs_result.scalars().all()

    attendees = []
    for reg in registrations:
        att = reg.attendee
        attendee = PortalAttendee(
            first_name=att.first_name,
            last_name=att.last_name,
            email=att.email,
            phone=att.phone,
            status=reg.status.value if hasattr(reg.status, "value") else reg.status,
            accommodation_type=(
                reg.accommodation_type.value
                if hasattr(reg.accommodation_type, "value") and reg.accommodation_type
                else reg.accommodation_type
            ),
            dietary_restrictions=reg.dietary_restrictions,
            # Only include payment amounts if co-creator has permission
            payment_amount_cents=reg.payment_amount_cents if link.can_see_amounts else None,
        )
        attendees.append(attendee)

    return PortalEventDetail(
        id=event.id,
        name=event.name,
        event_date=event.event_date,
        event_end_date=event.event_end_date,
        event_type=event.event_type,
        status=event.status.value if hasattr(event.status, "value") else event.status,
        capacity=event.capacity,
        meeting_point_a=event.meeting_point_a,
        meeting_point_b=event.meeting_point_b,
        attendees=attendees,
    )
