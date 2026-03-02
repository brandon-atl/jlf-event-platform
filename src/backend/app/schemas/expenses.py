from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.expense import ExpenseCategory, ActorType


class ExpenseCreate(BaseModel):
    description: str = Field(..., max_length=500)
    amount_cents: int = Field(..., gt=0)
    category: ExpenseCategory
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    description: str | None = Field(None, max_length=500)
    amount_cents: int | None = Field(None, gt=0)
    category: ExpenseCategory | None = None
    notes: str | None = None


class ExpenseResponse(BaseModel):
    id: UUID
    event_id: UUID
    submitted_by: UUID | None
    actor_type: ActorType
    description: str
    amount_cents: int
    category: ExpenseCategory
    receipt_image_url: str | None = None
    notes: str | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    items: list[ExpenseResponse]
    total_count: int
    total_amount_cents: int