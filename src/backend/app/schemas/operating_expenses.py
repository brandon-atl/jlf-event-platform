from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.operating_expense import OperatingExpenseCategory


class OperatingExpenseCreate(BaseModel):
    description: str = Field(..., max_length=500)
    amount_cents: int = Field(..., gt=0)
    category: OperatingExpenseCategory
    expense_date: date
    notes: str | None = None


class OperatingExpenseUpdate(BaseModel):
    description: str | None = Field(None, max_length=500)
    amount_cents: int | None = Field(None, gt=0)
    category: OperatingExpenseCategory | None = None
    expense_date: date | None = None
    notes: str | None = None


class OperatingExpenseResponse(BaseModel):
    id: UUID
    submitted_by: UUID
    description: str
    amount_cents: int
    category: OperatingExpenseCategory
    receipt_image_url: str | None = None
    notes: str | None = None
    expense_date: date
    reimbursed: bool
    reimbursed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OperatingExpenseListResponse(BaseModel):
    items: list[OperatingExpenseResponse]
    total_count: int
    total_amount_cents: int
    filters_applied: dict[str, Any] | None = None