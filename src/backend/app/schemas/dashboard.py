"""Dashboard response schemas."""

from datetime import datetime

from pydantic import BaseModel


class HeadcountByStatus(BaseModel):
    total: int = 0
    complete: int = 0
    pending_payment: int = 0
    cancelled: int = 0
    refunded: int = 0
    expired: int = 0


class AccommodationBreakdown(BaseModel):
    bell_tent: int = 0
    nylon_tent: int = 0
    self_camping: int = 0
    yurt_shared: int = 0
    none: int = 0


class DietarySummaryItem(BaseModel):
    restriction: str
    count: int


class RevenueStats(BaseModel):
    total_cents: int = 0
    average_cents: int = 0
    payment_count: int = 0


class UpcomingEvent(BaseModel):
    id: str
    name: str
    event_date: datetime
    event_type: str
    status: str
    total_registrations: int = 0
    complete_registrations: int = 0
    capacity: int | None = None

    model_config = {"from_attributes": True}


class OverviewDashboard(BaseModel):
    active_events: int = 0
    total_registrations: int = 0
    total_complete: int = 0
    total_pending: int = 0
    total_revenue_cents: int = 0
    upcoming_events: list[UpcomingEvent] = []


class EventDashboard(BaseModel):
    event_id: str
    event_name: str
    headcount: HeadcountByStatus
    accommodation: AccommodationBreakdown
    dietary_summary: list[DietarySummaryItem] = []
    revenue: RevenueStats
    spots_remaining: int | None = None
    capacity: int | None = None
