import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class RegistrationStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    complete = "complete"
    expired = "expired"
    cancelled = "cancelled"
    refunded = "refunded"


class AccommodationType(str, enum.Enum):
    bell_tent = "bell_tent"
    nylon_tent = "nylon_tent"
    self_camping = "self_camping"
    yurt_shared = "yurt_shared"
    none = "none"


class RegistrationSource(str, enum.Enum):
    registration_form = "registration_form"
    manual = "manual"
    walk_in = "walk_in"


class Registration(TimestampMixin, Base):
    __tablename__ = "registrations"
    __table_args__ = (
        UniqueConstraint("attendee_id", "event_id", name="uq_attendee_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    attendee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attendees.id"), index=True
    )
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus, native_enum=False),
        default=RegistrationStatus.pending_payment,
    )
    payment_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    accommodation_type: Mapped[AccommodationType | None] = mapped_column(
        Enum(AccommodationType, native_enum=False), nullable=True
    )
    dietary_restrictions: Mapped[str | None] = mapped_column(Text, nullable=True)
    intake_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    waiver_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    escalation_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    checked_in_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    checked_in_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[RegistrationSource] = mapped_column(
        Enum(RegistrationSource, native_enum=False),
        default=RegistrationSource.registration_form,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    attendee = relationship("Attendee", back_populates="registrations", lazy="selectin")
    event = relationship("Event", back_populates="registrations", lazy="selectin")
