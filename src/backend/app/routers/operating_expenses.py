"""Operating expenses router — admin endpoints for site-wide expense management."""

from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AuditLog, OperatingExpense, User
from app.models.operating_expense import OperatingExpenseCategory
from app.schemas.operating_expenses import (
    OperatingExpenseCreate,
    OperatingExpenseListResponse,
    OperatingExpenseResponse,
    OperatingExpenseUpdate
)
from app.services.auth_service import get_current_user
from app.services.storage_service import storage_service

router = APIRouter(prefix="/operating-expenses", tags=["operating-expenses"])


async def _get_operating_expense_or_404(db: AsyncSession, expense_id: UUID) -> OperatingExpense:
    """Get operating expense by ID or raise 404."""
    result = await db.execute(
        select(OperatingExpense).where(OperatingExpense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operating expense not found"
        )
    return expense


@router.get("", response_model=OperatingExpenseListResponse)
async def list_operating_expenses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    category: OperatingExpenseCategory | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    reimbursed: bool | None = Query(None),
):
    """List operating expenses with filters."""

    # Build filter conditions
    conditions = []

    if category:
        conditions.append(OperatingExpense.category == category)

    if start_date:
        conditions.append(OperatingExpense.expense_date >= start_date)

    if end_date:
        conditions.append(OperatingExpense.expense_date <= end_date)

    if reimbursed is not None:
        conditions.append(OperatingExpense.reimbursed == reimbursed)

    where_clause = and_(*conditions) if conditions else True

    # Count total
    count_result = await db.execute(
        select(func.count(OperatingExpense.id)).where(where_clause)
    )
    total_count = count_result.scalar() or 0

    # Sum total amount
    sum_result = await db.execute(
        select(func.coalesce(func.sum(OperatingExpense.amount_cents), 0)).where(where_clause)
    )
    total_amount_cents = sum_result.scalar() or 0

    # Get expenses
    offset = (page - 1) * per_page
    result = await db.execute(
        select(OperatingExpense)
        .where(where_clause)
        .order_by(OperatingExpense.expense_date.desc())
        .offset(offset)
        .limit(per_page)
    )
    expenses = result.scalars().all()

    filters_applied = {}
    if category:
        filters_applied["category"] = category.value
    if start_date:
        filters_applied["start_date"] = start_date.isoformat()
    if end_date:
        filters_applied["end_date"] = end_date.isoformat()
    if reimbursed is not None:
        filters_applied["reimbursed"] = reimbursed

    return OperatingExpenseListResponse(
        items=[OperatingExpenseResponse.model_validate(expense) for expense in expenses],
        total_count=total_count,
        total_amount_cents=total_amount_cents,
        filters_applied=filters_applied if filters_applied else None
    )


@router.post("", response_model=OperatingExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_operating_expense(
    body: OperatingExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create operating expense (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create operating expenses"
        )

    expense = OperatingExpense(
        submitted_by=current_user.id,
        **body.model_dump()
    )

    db.add(expense)
    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="operating_expense",
        entity_id=expense.id,
        action="create",
        actor=str(current_user.id),
        new_value={
            "description": expense.description,
            "amount_cents": expense.amount_cents,
            "category": expense.category if isinstance(expense.category, str) else expense.category.value,
            "expense_date": expense.expense_date.isoformat()
        }
    )
    db.add(audit_log)

    await db.commit()
    return OperatingExpenseResponse.model_validate(expense)


@router.put("/{expense_id}", response_model=OperatingExpenseResponse)
async def update_operating_expense(
    expense_id: UUID,
    body: OperatingExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update operating expense (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update operating expenses"
        )

    expense = await _get_operating_expense_or_404(db, expense_id)

    # Store old values for audit
    old_value = {
        "description": expense.description,
        "amount_cents": expense.amount_cents,
        "category": expense.category if isinstance(expense.category, str) else expense.category.value,
        "expense_date": expense.expense_date.isoformat(),
        "notes": expense.notes
    }

    # Update with provided fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="operating_expense",
        entity_id=expense.id,
        action="update",
        actor=str(current_user.id),
        old_value=old_value,
        new_value={field: str(value) for field, value in update_data.items()}
    )
    db.add(audit_log)

    await db.commit()
    return OperatingExpenseResponse.model_validate(expense)


@router.post("/{expense_id}/receipt", response_model=dict)
async def upload_operating_expense_receipt(
    expense_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload receipt for operating expense (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload receipts"
        )

    expense = await _get_operating_expense_or_404(db, expense_id)

    try:
        # Save file
        receipt_url = await storage_service.save_receipt(file)

        # Update expense
        old_url = expense.receipt_image_url
        expense.receipt_image_url = receipt_url

        await db.flush()

        # Audit log
        audit_log = AuditLog(
            entity_type="operating_expense",
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


@router.put("/{expense_id}/reimburse", response_model=OperatingExpenseResponse)
async def reimburse_operating_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark operating expense as reimbursed (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can mark expenses as reimbursed"
        )

    expense = await _get_operating_expense_or_404(db, expense_id)

    if expense.reimbursed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is already marked as reimbursed"
        )

    expense.reimbursed = True
    expense.reimbursed_at = datetime.now(timezone.utc)

    await db.flush()

    # Audit log
    audit_log = AuditLog(
        entity_type="operating_expense",
        entity_id=expense.id,
        action="reimburse",
        actor=str(current_user.id),
        old_value={"reimbursed": False, "reimbursed_at": None},
        new_value={
            "reimbursed": True,
            "reimbursed_at": expense.reimbursed_at.isoformat()
        }
    )
    db.add(audit_log)

    await db.commit()
    return OperatingExpenseResponse.model_validate(expense)