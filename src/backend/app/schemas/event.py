from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel


class EventCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str
    pricing_model: str = "fixed"
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    reminder_delay_minutes: int = 60
    auto_expire_hours: int = 24
    day_of_sms_time: time | None = None
    registration_fields: dict | None = None
    notification_templates: dict | None = None
    virtual_meeting_url: str | None = None
    status: str = "draft"


class EventResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str
    pricing_model: str
    fixed_price_cents: int | None = None
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    virtual_meeting_url: str | None = None
    notification_templates: dict | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
