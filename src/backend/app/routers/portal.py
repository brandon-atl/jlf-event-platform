"""Co-creator portal router — scoped access to assigned events and financial data."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import (
    AuditLog,
    CoCreator,
    Event,
    EventCoCreator,
    EventSettlement,
    Expense,
    Registration,
    RegistrationStatus,
)
from ..models.expense import ActorType
from ..schemas.expenses import ExpenseCreate, ExpenseListResponse, ExpenseResponse
from ..schemas.portal import PortalAttendee, PortalEventDetail, PortalEventSummary
from ..schemas.settlements import SettlementResponse, SplitConfigItem
from ..services.auth_service import get_current_co_creator
from ..services.storage_service import storage_service

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
                .filter(Registration.status == RegistrationStatus.complete)
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
            Registration.status == RegistrationStatus.complete,
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


# ---------------------------------------------------------------------------
# Financial endpoints for co-creators
# ---------------------------------------------------------------------------

async def _verify_co_creator_event_access(
    db: AsyncSession, event_id: UUID, co_creator: CoCreator
) -> EventCoCreator:
    """Verify co-creator has access to event and return EventCoCreator link."""
    link_result = await db.execute(
        select(EventCoCreator).where(
            EventCoCreator.event_id == event_id,
            EventCoCreator.co_creator_id == co_creator.id,
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this event"
        )
    return link


@router.get("/events/{event_id}/expenses", response_model=ExpenseListResponse)
async def get_portal_event_expenses(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """Get expenses for an event (co-creator view)."""
    await _verify_co_creator_event_access(db, event_id, co_creator)

    # Count total (non-deleted)
    count_result = await db.execute(
        select(func.count(Expense.id)).where(
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
    )
    total_count = count_result.scalar() or 0

    # Sum total amount
    sum_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount_cents), 0)).where(
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
    )
    total_amount_cents = sum_result.scalar() or 0

    # Get expenses
    result = await db.execute(
        select(Expense)
        .where(
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
        .order_by(Expense.created_at.desc())
    )
    expenses = result.scalars().all()

    return ExpenseListResponse(
        items=[ExpenseResponse.model_validate(expense) for expense in expenses],
        total_count=total_count,
        total_amount_cents=total_amount_cents
    )


@router.post("/events/{event_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_portal_expense(
    event_id: UUID,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """Create expense (co-creator with upload permission)."""
    link = await _verify_co_creator_event_access(db, event_id, co_creator)

    if not link.can_upload_expenses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expense upload not permitted for this event"
        )

    expense = Expense(
        event_id=event_id,
        submitted_by=None,  # Co-creators don't have User records, they're in CoCreator table
        actor_type=ActorType.co_creator,
        **body.model_dump()
    )

    db.add(expense)
    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="expense",
        entity_id=expense.id,
        action="create",
        actor=f"co_creator:{co_creator.id}",
        new_value={
            "event_id": str(event_id),
            "description": expense.description,
            "amount_cents": expense.amount_cents,
            "category": expense.category.value,
            "actor_type": expense.actor_type.value,
            "submitted_by_co_creator": str(co_creator.id)
        }
    )
    db.add(audit_log)

    await db.commit()
    return ExpenseResponse.model_validate(expense)


@router.post("/events/{event_id}/expenses/{expense_id}/receipt", response_model=dict)
async def upload_portal_expense_receipt(
    event_id: UUID,
    expense_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """Upload receipt for co-creator's expense."""
    await _verify_co_creator_event_access(db, event_id, co_creator)

    # Get expense
    expense_result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.event_id == event_id,
            Expense.is_deleted == False,
            Expense.actor_type == ActorType.co_creator
        )
    )
    expense = expense_result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    try:
        # Save file
        receipt_url = await storage_service.save_receipt(file)

        # Update expense
        old_url = expense.receipt_image_url
        expense.receipt_image_url = receipt_url

        await db.flush()

        # Audit log
        audit_log = AuditLog(
            entity_type="expense",
            entity_id=expense.id,
            action="upload_receipt",
            actor=f"co_creator:{co_creator.id}",
            old_value={"receipt_image_url": old_url},
            new_value={"receipt_image_url": receipt_url}
        )
        db.add(audit_log)

        await db.commit()

        return {"receipt_url": receipt_url, "message": "Receipt uploaded successfully"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload receipt: {str(e)}"
        )


@router.get("/events/{event_id}/settlement", response_model=SettlementResponse | None)
async def get_portal_event_settlement(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    co_creator: CoCreator = Depends(get_current_co_creator),
):
    """Get settlement for an event (co-creator view)."""
    await _verify_co_creator_event_access(db, event_id, co_creator)

    # Get the latest settlement version
    result = await db.execute(
        select(EventSettlement)
        .where(EventSettlement.event_id == event_id)
        .order_by(EventSettlement.version.desc())
        .limit(1)
    )
    settlement = result.scalar_one_or_none()

    if not settlement:
        return None

    # Convert split_config from dict to typed objects
    split_config_items = []
    if isinstance(settlement.split_config, list):
        for item in settlement.split_config:
            split_config_items.append(SplitConfigItem(
                co_creator_id=UUID(item["co_creator_id"]),
                name=item["name"],
                percentage=item["percentage"],
                payout_cents=item["payout_cents"]
            ))

    return SettlementResponse(
        id=settlement.id,
        event_id=settlement.event_id,
        version=settlement.version,
        gross_revenue_cents=settlement.gross_revenue_cents,
        stripe_fees_cents=settlement.stripe_fees_cents,
        total_expenses_cents=settlement.total_expenses_cents,
        net_cents=settlement.net_cents,
        split_config=split_config_items,
        fees_estimated=settlement.fees_estimated,
        calculated_at=settlement.calculated_at,
        calculated_by=settlement.calculated_by,
        notes=settlement.notes
    )
