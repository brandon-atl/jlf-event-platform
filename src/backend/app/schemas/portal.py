"""Co-creator portal schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PortalEventSummary(BaseModel):
    id: UUID
    name: str
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str
    status: str
    total_registrations: int = 0
    complete_registrations: int = 0
    capacity: int | None = None

    model_config = {"from_attributes": True}


class PortalAttendee(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    status: str
    accommodation_type: str | None = None
    dietary_restrictions: str | None = None
    payment_amount_cents: int | None = None  # only if can_see_amounts

    model_config = {"from_attributes": True}


class PortalEventDetail(BaseModel):
    id: UUID
    name: str
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str
    status: str
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    attendees: list[PortalAttendee] = []

    model_config = {"from_attributes": True}
