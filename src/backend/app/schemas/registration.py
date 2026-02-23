from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class RegistrationCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    waiver_accepted: bool
    intake_data: dict | None = None


class RegistrationResponse(BaseModel):
    registration_id: UUID
    checkout_url: str | None = None
    status: str

    model_config = {"from_attributes": True}


class RegistrationDetail(BaseModel):
    id: UUID
    attendee_id: UUID
    event_id: UUID
    status: str
    payment_amount_cents: int | None = None
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    intake_data: dict | None = None
    source: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventInfo(BaseModel):
    name: str
    slug: str
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str
    pricing_model: str
    fixed_price_cents: int | None = None
    capacity: int | None = None
    spots_remaining: int | None = None
    registration_fields: dict | None = None

    model_config = {"from_attributes": True}
