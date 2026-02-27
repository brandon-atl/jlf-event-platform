"""Dashboard router — aggregate and per-event stats. Requires operator/admin auth."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Event, EventStatus, PricingModel, Registration, RegistrationStatus, User
from ..models.sub_event import SubEvent
from ..models.registration_sub_event import RegistrationSubEvent
from ..schemas.dashboard import (
    AccommodationBreakdown,
    DietarySummaryItem,
    EventDashboard,
    HeadcountByStatus,
    OverviewDashboard,
    RevenueStats,
    SubEventHeadcount,
    UpcomingEvent,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=OverviewDashboard)
async def overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats across all active events."""
    # Count active events
    active_count = (
        await db.execute(
            select(func.count()).where(Event.status == EventStatus.active)
        )
    ).scalar() or 0

    # Registration counts across active events
    active_event_ids = select(Event.id).where(Event.status == EventStatus.active)

    reg_stats = await db.execute(
        select(
            func.count(Registration.id).label("total"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.complete)
            .label("complete"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.pending_payment)
            .label("pending"),
            func.coalesce(
                func.sum(Registration.payment_amount_cents).filter(
                    Registration.status == RegistrationStatus.complete
                ),
                0,
            ).label("revenue"),
        ).where(Registration.event_id.in_(active_event_ids))
    )
    row = reg_stats.one()

    # Upcoming events (active, ordered by date)
    upcoming_result = await db.execute(
        select(Event)
        .where(Event.status == EventStatus.active)
        .order_by(Event.event_date.asc())
        .limit(10)
    )
    upcoming_events = []
    for event in upcoming_result.scalars().all():
        counts = await db.execute(
            select(
                func.count(Registration.id).label("total"),
                func.count(Registration.id)
                .filter(Registration.status == RegistrationStatus.complete)
                .label("complete"),
            ).where(Registration.event_id == event.id)
        )
        c = counts.one()
        upcoming_events.append(
            UpcomingEvent(
                id=event.id,
                name=event.name,
                event_date=event.event_date,
                event_type=event.event_type,
                status=event.status.value if hasattr(event.status, "value") else event.status,
                total_registrations=c.total,
                complete_registrations=c.complete,
                capacity=event.capacity,
            )
        )

    return OverviewDashboard(
        active_events=active_count,
        total_registrations=row.total,
        total_complete=row.complete,
        total_pending=row.pending,
        total_revenue_cents=row.revenue,
        upcoming_events=upcoming_events,
    )


@router.get("/events/{event_id}", response_model=EventDashboard)
async def event_dashboard(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-event dashboard: headcount, accommodation, dietary, revenue, spots."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Headcount by status
    hc_result = await db.execute(
        select(
            func.count(Registration.id).label("total"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.complete)
            .label("complete"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.pending_payment)
            .label("pending_payment"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.cash_pending)
            .label("cash_pending"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.cancelled)
            .label("cancelled"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.refunded)
            .label("refunded"),
            func.count(Registration.id)
            .filter(Registration.status == RegistrationStatus.expired)
            .label("expired"),
        ).where(Registration.event_id == event_id)
    )
    hc = hc_result.one()
    headcount = HeadcountByStatus(
        total=hc.total,
        complete=hc.complete,
        pending_payment=hc.pending_payment,
        cash_pending=hc.cash_pending,
        cancelled=hc.cancelled,
        refunded=hc.refunded,
        expired=hc.expired,
    )

    # Accommodation breakdown (COMPLETE + CASH_PENDING registrations)
    acc_result = await db.execute(
        select(Registration.accommodation_type, func.count(Registration.id))
        .where(
            Registration.event_id == event_id,
            Registration.status.in_([
                RegistrationStatus.complete,
                RegistrationStatus.cash_pending,
            ]),
            Registration.accommodation_type.is_not(None),
        )
        .group_by(Registration.accommodation_type)
    )
    acc_map = {r[0]: r[1] for r in acc_result.all()}
    accommodation = AccommodationBreakdown(
        bell_tent=acc_map.get("bell_tent", 0),
        tipi_twin=acc_map.get("tipi_twin", 0),
        self_camping=acc_map.get("self_camping", 0),
        day_only=acc_map.get("day_only", 0),
        none=acc_map.get("none", 0),
    )

    # Dietary summary (COMPLETE registrations with non-null dietary)
    dietary_result = await db.execute(
        select(Registration.dietary_restrictions)
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.complete,
            Registration.dietary_restrictions.is_not(None),
            Registration.dietary_restrictions != "",
        )
    )
    dietary_counts: dict[str, int] = {}
    for (raw,) in dietary_result.all():
        # Each registration may list multiple (comma-separated)
        for item in raw.split(","):
            item = item.strip().lower()
            if item:
                dietary_counts[item] = dietary_counts.get(item, 0) + 1
    dietary_summary = [
        DietarySummaryItem(restriction=k, count=v)
        for k, v in sorted(dietary_counts.items(), key=lambda x: -x[1])
    ]

    # Revenue stats (COMPLETE registrations)
    rev_result = await db.execute(
        select(
            func.coalesce(func.sum(Registration.payment_amount_cents), 0).label("total"),
            func.count(Registration.payment_amount_cents).label("count"),
        ).where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.complete,
            Registration.payment_amount_cents.is_not(None),
        )
    )
    rev = rev_result.one()
    revenue = RevenueStats(
        total_cents=rev.total,
        average_cents=rev.total // rev.count if rev.count > 0 else 0,
        payment_count=rev.count,
    )

    # Spots remaining
    spots_remaining = None
    if event.capacity is not None:
        spots_remaining = max(0, event.capacity - hc.complete)

    # Sub-event headcounts for composite events
    sub_event_headcounts = None
    pm = event.pricing_model.value if hasattr(event.pricing_model, "value") else event.pricing_model
    if pm == "composite":
        # Get all sub-events for this event
        se_result = await db.execute(
            select(SubEvent)
            .where(SubEvent.parent_event_id == event_id)
            .order_by(SubEvent.sort_order)
        )
        sub_events = se_result.scalars().all()

        # Single grouped query instead of N+1 per sub-event
        counts_result = await db.execute(
            select(
                RegistrationSubEvent.sub_event_id,
                func.count(RegistrationSubEvent.id).label("count"),
            )
            .join(Registration, Registration.id == RegistrationSubEvent.registration_id)
            .where(
                RegistrationSubEvent.sub_event_id.in_([se.id for se in sub_events]),
                Registration.status.in_([
                    RegistrationStatus.complete,
                    RegistrationStatus.cash_pending,
                ]),
            )
            .group_by(RegistrationSubEvent.sub_event_id)
        )
        counts_map = {row.sub_event_id: row.count for row in counts_result}

        sub_event_headcounts = [
            SubEventHeadcount(
                sub_event_id=str(se.id),
                sub_event_name=se.name,
                count=counts_map.get(se.id, 0),
            )
            for se in sub_events
        ]

    return EventDashboard(
        event_id=event.id,
        event_name=event.name,
        headcount=headcount,
        accommodation=accommodation,
        dietary_summary=dietary_summary,
        revenue=revenue,
        spots_remaining=spots_remaining,
        capacity=event.capacity,
        sub_event_headcounts=sub_event_headcounts,
    )
