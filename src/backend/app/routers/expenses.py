"""Event expenses router — admin/co-creator endpoints for expense management."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    AuditLog,
    CoCreator,
    Event,
    EventCoCreator,
    Expense,
    User
)
from app.models.expense import ActorType
from app.schemas.expenses import (
    ExpenseCreate,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdate
)
from app.services.auth_service import get_current_co_creator, get_current_user
from app.services.storage_service import storage_service

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


async def _get_expense_or_404(db: AsyncSession, expense_id: UUID, event_id: UUID) -> Expense:
    """Get expense by ID and event_id or raise 404."""
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense


async def _check_co_creator_expense_access(
    db: AsyncSession,
    event_id: UUID,
    co_creator: CoCreator
) -> EventCoCreator:
    """Check if co-creator can upload expenses for this event."""
    result = await db.execute(
        select(EventCoCreator).where(
            EventCoCreator.event_id == event_id,
            EventCoCreator.co_creator_id == co_creator.id
        )
    )
    event_co_creator = result.scalar_one_or_none()

    if not event_co_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this event"
        )

    if not event_co_creator.can_upload_expenses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expense upload not permitted for this event"
        )

    return event_co_creator


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
):
    """List expenses for an event (admin only)."""
    await _get_event_or_404(db, event_id)

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
    offset = (page - 1) * per_page
    result = await db.execute(
        select(Expense)
        .where(
            Expense.event_id == event_id,
            Expense.is_deleted == False
        )
        .order_by(Expense.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    expenses = result.scalars().all()

    return ExpenseListResponse(
        items=[ExpenseResponse.model_validate(expense) for expense in expenses],
        total_count=total_count,
        total_amount_cents=total_amount_cents
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    event_id: UUID,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create expense (admin only)."""
    await _get_event_or_404(db, event_id)

    expense = Expense(
        event_id=event_id,
        submitted_by=current_user.id,
        actor_type=ActorType.admin,
        **body.model_dump()
    )

    db.add(expense)
    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="expense",
        entity_id=expense.id,
        action="create",
        actor=str(current_user.id),
        new_value={
            "event_id": str(event_id),
            "description": expense.description,
            "amount_cents": expense.amount_cents,
            "category": expense.category.value if hasattr(expense.category, 'value') else str(expense.category),
            "actor_type": expense.actor_type.value if hasattr(expense.actor_type, 'value') else str(expense.actor_type)
        }
    )
    db.add(audit_log)

    await db.commit()
    return ExpenseResponse.model_validate(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    event_id: UUID,
    expense_id: UUID,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update expense (admin only, or co-creator who submitted it)."""
    expense = await _get_expense_or_404(db, expense_id, event_id)

    # Check permission: admin can update any, co-creator can only update their own
    if expense.submitted_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own expenses"
        )

    # Store old values for audit
    old_value = {
        "description": expense.description,
        "amount_cents": expense.amount_cents,
        "category": expense.category.value if hasattr(expense.category, 'value') else str(expense.category),
        "notes": expense.notes
    }

    # Update with provided fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="expense",
        entity_id=expense.id,
        action="update",
        actor=str(current_user.id),
        old_value=old_value,
        new_value={field: str(value) for field, value in update_data.items()}
    )
    db.add(audit_log)

    await db.commit()
    return ExpenseResponse.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    event_id: UUID,
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete expense."""
    expense = await _get_expense_or_404(db, expense_id, event_id)

    # Check permission: admin can delete any, co-creator can only delete their own
    if expense.submitted_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own expenses"
        )

    expense.is_deleted = True
    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="expense",
        entity_id=expense.id,
        action="delete",
        actor=str(current_user.id),
        old_value={
            "description": expense.description,
            "amount_cents": expense.amount_cents,
            "category": expense.category.value if hasattr(expense.category, 'value') else str(expense.category)
        }
    )
    db.add(audit_log)

    await db.commit()


@router.post("/{expense_id}/receipt", response_model=dict)
async def upload_expense_receipt(
    event_id: UUID,
    expense_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload receipt image for expense."""
    expense = await _get_expense_or_404(db, expense_id, event_id)

    # Check permission
    if expense.submitted_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only upload receipts for your own expenses"
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
            actor=str(current_user.id),
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