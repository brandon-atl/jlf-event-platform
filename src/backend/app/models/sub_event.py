import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class SubEventPricingModel(str, enum.Enum):
    fixed = "fixed"
    donation = "donation"
    free = "free"


class SubEvent(TimestampMixin, Base):
    __tablename__ = "sub_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    parent_event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pricing_model: Mapped[SubEventPricingModel] = mapped_column(
        Enum(SubEventPricingModel, native_enum=False)
    )
    fixed_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_donation_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)

    parent_event = relationship("Event", back_populates="sub_events")
    registration_sub_events = relationship(
        "RegistrationSubEvent", back_populates="sub_event", lazy="selectin"
    )
