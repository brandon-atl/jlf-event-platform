import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Attendee(TimestampMixin, Base):
    __tablename__ = "attendees"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_member: Mapped[bool] = mapped_column(Boolean, default=False)
    # Denormalized FK — creates circular dependency with memberships.attendee_id.
    # memberships.attendee_id is the source of truth for the relationship.
    # This field is a convenience cache for fast lookups; keep in sync via membership CRUD.
    membership_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("memberships.id", use_alter=True), nullable=True
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    registrations = relationship(
        "Registration", back_populates="attendee", lazy="selectin"
    )
    membership = relationship(
        "Membership", foreign_keys=[membership_id], lazy="selectin"
    )
