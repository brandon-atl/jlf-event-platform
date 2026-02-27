"""Sub-event schemas for composite events."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SubEventCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    pricing_model: str  # fixed | donation | free
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    sort_order: int = 0
    is_required: bool = False


class SubEventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    pricing_model: str | None = None
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    sort_order: int | None = None
    is_required: bool | None = None


class SubEventResponse(BaseModel):
    id: UUID
    parent_event_id: UUID
    name: str
    description: str | None = None
    pricing_model: str
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    sort_order: int = 0
    is_required: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RegistrationSubEventResponse(BaseModel):
    id: UUID
    registration_id: UUID
    sub_event_id: UUID
    sub_event_name: str | None = None
    payment_amount_cents: int | None = None

    model_config = {"from_attributes": True}


class RecurringDateInfo(BaseModel):
    date: str
    spots_remaining: int | None = None
    is_full: bool = False
