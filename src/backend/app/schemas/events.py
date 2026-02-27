"""Event CRUD schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    description: str | None = None
    event_date: datetime
    event_end_date: datetime | None = None
    event_type: str = Field(..., max_length=50)
    pricing_model: str  # fixed | donation | free | composite
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    location_text: str | None = None
    zoom_link: str | None = None
    allow_cash_payment: bool = False
    max_member_discount_slots: int = 3
    day_of_sms_time: str | None = None
    registration_fields: dict[str, Any] | None = None
    notification_templates: dict[str, Any] | None = None
    virtual_meeting_url: str | None = None
    is_recurring: bool = False
    recurrence_rule: str | None = None
    status: str = "draft"


class EventUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    event_date: datetime | None = None
    event_end_date: datetime | None = None
    event_type: str | None = None
    pricing_model: str | None = None
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    location_text: str | None = None
    zoom_link: str | None = None
    allow_cash_payment: bool | None = None
    max_member_discount_slots: int | None = None
    day_of_sms_time: str | None = None
    registration_fields: dict[str, Any] | None = None
    notification_templates: dict[str, Any] | None = None
    virtual_meeting_url: str | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
    status: str | None = None


class EventStats(BaseModel):
    total_registrations: int = 0
    complete: int = 0
    pending_payment: int = 0
    cash_pending: int = 0
    cancelled: int = 0
    refunded: int = 0
    expired: int = 0
    total_revenue_cents: int = 0
    spots_remaining: int | None = None
    accommodation_breakdown: dict[str, int] = {}


class SubEventBrief(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    pricing_model: str
    fixed_price_cents: int | None = None
    min_donation_cents: int | None = None
    capacity: int | None = None
    sort_order: int = 0
    is_required: bool = False

    model_config = {"from_attributes": True}


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
    min_donation_cents: int | None = None
    stripe_price_id: str | None = None
    capacity: int | None = None
    meeting_point_a: str | None = None
    meeting_point_b: str | None = None
    location_text: str | None = None
    zoom_link: str | None = None
    allow_cash_payment: bool = False
    max_member_discount_slots: int = 3
    day_of_sms_time: str | None = None
    registration_fields: dict[str, Any] | None = None
    notification_templates: dict[str, Any] | None = None
    virtual_meeting_url: str | None = None
    is_recurring: bool = False
    recurrence_rule: str | None = None
    sub_events: list[SubEventBrief] | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    stats: EventStats | None = None

    model_config = {"from_attributes": True}
