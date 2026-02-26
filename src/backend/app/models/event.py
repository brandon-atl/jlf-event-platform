import enum
import uuid
from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class PricingModel(str, enum.Enum):
    fixed = "fixed"
    donation = "donation"
    free = "free"
    composite = "composite"


class EventStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class Event(TimestampMixin, Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    event_end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(50))
    pricing_model: Mapped[PricingModel] = mapped_column(
        Enum(PricingModel, native_enum=False)
    )
    fixed_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_donation_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    meeting_point_a: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_point_b: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    zoom_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    allow_cash_payment: Mapped[bool] = mapped_column(Boolean, default=False)
    max_member_discount_slots: Mapped[int] = mapped_column(Integer, default=3)
    day_of_sms_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    registration_fields: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, default=dict
    )
    notification_templates: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, default=dict
    )
    virtual_meeting_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, native_enum=False), default=EventStatus.draft
    )

    registrations = relationship("Registration", back_populates="event", lazy="selectin")
    form_links = relationship("EventFormLink", back_populates="event", lazy="selectin")
