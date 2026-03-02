from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SplitOverride(BaseModel):
    co_creator_id: UUID
    percentage: float


class SettlementCalculateRequest(BaseModel):
    notes: str | None = None
    split_overrides: list[SplitOverride] | None = None


class SplitConfigItem(BaseModel):
    co_creator_id: UUID
    name: str
    percentage: float
    payout_cents: int


class SettlementResponse(BaseModel):
    id: UUID
    event_id: UUID
    version: int
    gross_revenue_cents: int
    stripe_fees_cents: int
    total_expenses_cents: int
    net_cents: int
    split_config: list[SplitConfigItem]
    fees_estimated: bool
    calculated_at: datetime
    calculated_by: UUID
    notes: str | None = None

    model_config = {"from_attributes": True}


class SettlementHistoryResponse(BaseModel):
    items: list[SettlementResponse]
    total_count: int