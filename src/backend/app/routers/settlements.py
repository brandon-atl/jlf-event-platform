"""Settlement calculation router — admin endpoints for financial settlement management."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Event, EventSettlement, User
from app.schemas.settlements import (
    SettlementCalculateRequest,
    SettlementHistoryResponse,
    SettlementResponse,
    SplitConfigItem
)
from app.services.auth_service import get_current_user
from app.services.settlement_service import calculate_settlement

router = APIRouter()


async def _get_event_or_404(db: AsyncSession, event_id: UUID) -> Event:
    """Get event by ID or raise 404."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event


def _settlement_to_response(settlement: EventSettlement) -> SettlementResponse:
    """Convert settlement model to response schema."""
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


@router.get("", response_model=SettlementResponse | None)
async def get_current_settlement(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current (latest version) settlement for an event."""
    await _get_event_or_404(db, event_id)

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

    return _settlement_to_response(settlement)


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
async def calculate_event_settlement(
    event_id: UUID,
    body: SettlementCalculateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate/recalculate settlement (admin only)."""
    await _get_event_or_404(db, event_id)

    # Only admin can calculate settlements
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can calculate settlements"
        )

    try:
        settlement = await calculate_settlement(
            db=db,
            event_id=event_id,
            calculated_by=current_user.id,
            notes=body.notes,
            split_overrides=body.split_overrides
        )

        return _settlement_to_response(settlement)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate settlement: {str(e)}"
        )


@router.get("/history", response_model=SettlementHistoryResponse)
async def get_settlement_history(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all settlement versions for an event."""
    await _get_event_or_404(db, event_id)

    # Get count
    count_result = await db.execute(
        select(func.count(EventSettlement.id))
        .where(EventSettlement.event_id == event_id)
    )
    total_count = count_result.scalar() or 0

    # Get all settlements, newest first
    result = await db.execute(
        select(EventSettlement)
        .where(EventSettlement.event_id == event_id)
        .order_by(EventSettlement.version.desc())
    )
    settlements = result.scalars().all()

    return SettlementHistoryResponse(
        items=[_settlement_to_response(s) for s in settlements],
        total_count=total_count
    )