"""Registration management schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AttendeeInfo(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None = None

    model_config = {"from_attributes": True}


class RegistrationResponse(BaseModel):
    id: UUID
    attendee_id: UUID
    event_id: UUID
    status: str
    payment_amount_cents: int | None = None
    stripe_checkout_session_id: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    intake_data: dict[str, Any] | None = None
    waiver_accepted_at: datetime | None = None
    source: str
    notes: str | None = None
    checked_in_at: datetime | None = None
    checked_in_by: str | None = None
    created_at: datetime
    updated_at: datetime
    attendee: AttendeeInfo | None = None

    model_config = {"from_attributes": True}


class RegistrationUpdate(BaseModel):
    status: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    notes: str | None = None
    payment_amount_cents: int | None = None


class ManualRegistrationCreate(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    phone: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    payment_amount_cents: int | None = None
    source: str = "manual"  # manual | walk_in
    notes: str | None = None
    intake_data: dict[str, Any] | None = None
    status: str = "complete"  # manual entries default to complete
