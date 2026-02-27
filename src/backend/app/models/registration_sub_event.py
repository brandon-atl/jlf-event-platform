import uuid

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class RegistrationSubEvent(Base):
    __tablename__ = "registration_sub_events"
    __table_args__ = (
        UniqueConstraint("registration_id", "sub_event_id", name="uq_registration_sub_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    registration_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("registrations.id"), nullable=False, index=True
    )
    sub_event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sub_events.id"), nullable=False
    )
    payment_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)

    registration = relationship("Registration", back_populates="sub_event_selections")
    sub_event = relationship("SubEvent", back_populates="registration_sub_events")
