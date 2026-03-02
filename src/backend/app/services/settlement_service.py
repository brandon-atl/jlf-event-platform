from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    CoCreator,
    EventCoCreator,
    EventSettlement,
    Expense,
    Registration,
    RegistrationStatus,
)
from app.schemas.settlements import SplitOverride


async def calculate_settlement(
    db: AsyncSession,
    event_id: UUID,
    calculated_by: UUID,
    notes: str | None = None,
    split_overrides: list[SplitOverride] | None = None,
) -> EventSettlement:
    """Calculate settlement for an event and create a new version."""

    # 1. Calculate gross revenue from COMPLETE registrations
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Registration.payment_amount_cents), 0))
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.complete
        )
    )
    gross_revenue_cents = revenue_result.scalar() or 0

    # 2. Estimate Stripe fees (2.9% + $0.30 per transaction)
    # Count the number of COMPLETE transactions
    txn_count_result = await db.execute(
        select(func.count(Registration.id))
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatus.complete
        )
    )
    txn_count = txn_count_result.scalar() or 0

    # Calculate estimated fees
    stripe_fees_cents = int(gross_revenue_cents * 0.029 + (txn_count * 30))
    fees_estimated = True

    # 3. Calculate total expenses (non-deleted)
    expenses_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount_cents), 0))
        .where(
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
    )
    total_expenses_cents = expenses_result.scalar() or 0

    # 4. Calculate net
    net_cents = gross_revenue_cents - stripe_fees_cents - total_expenses_cents

    # 5. Get co-creator split configuration
    co_creators_result = await db.execute(
        select(EventCoCreator, CoCreator.name)
        .join(CoCreator, EventCoCreator.co_creator_id == CoCreator.id)
        .where(EventCoCreator.event_id == event_id)
    )
    co_creators = co_creators_result.all()

    # Build split configuration
    split_config = []
    total_percentage = Decimal('0')

    for event_co_creator, co_creator_name in co_creators:
        # Use override percentage if provided, otherwise use stored percentage
        percentage = None
        if split_overrides:
            for override in split_overrides:
                if override.co_creator_id == event_co_creator.co_creator_id:
                    percentage = Decimal(str(override.percentage))
                    break

        if percentage is None:
            percentage = event_co_creator.split_percentage or Decimal('0')

        total_percentage += percentage

        # Calculate payout
        payout_cents = int(net_cents * (percentage / 100)) if net_cents > 0 else 0

        split_config.append({
            "co_creator_id": str(event_co_creator.co_creator_id),
            "name": co_creator_name,
            "percentage": float(percentage),
            "payout_cents": payout_cents
        })

    # 6. Validate that split percentages sum to exactly 100%
    if abs(total_percentage - Decimal('100')) > Decimal('0.01'):  # Allow small rounding errors
        raise HTTPException(
            status_code=400,
            detail=f"Split percentages must sum to exactly 100%. Current total: {total_percentage}%"
        )

    # 7. Get current max version for this event and increment
    max_version_result = await db.execute(
        select(func.coalesce(func.max(EventSettlement.version), 0))
        .where(EventSettlement.event_id == event_id)
    )
    current_max_version = max_version_result.scalar() or 0
    new_version = current_max_version + 1

    # 8. Create new settlement record
    settlement = EventSettlement(
        event_id=event_id,
        version=new_version,
        gross_revenue_cents=gross_revenue_cents,
        stripe_fees_cents=stripe_fees_cents,
        total_expenses_cents=total_expenses_cents,
        net_cents=net_cents,
        split_config=split_config,
        fees_estimated=fees_estimated,
        calculated_by=calculated_by,
        notes=notes
    )

    db.add(settlement)
    await db.flush()

    # 9. Create audit log
    audit_log = AuditLog(
        entity_type="event_settlement",
        entity_id=settlement.id,
        action="calculate",
        actor=str(calculated_by),
        new_value={
            "event_id": str(event_id),
            "version": new_version,
            "gross_revenue_cents": gross_revenue_cents,
            "stripe_fees_cents": stripe_fees_cents,
            "total_expenses_cents": total_expenses_cents,
            "net_cents": net_cents,
            "fees_estimated": fees_estimated,
            "co_creator_count": len(split_config),
            "notes": notes
        }
    )
    db.add(audit_log)

    await db.commit()
    return settlement