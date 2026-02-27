import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    attendee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attendees.id"), index=True
    )
    tier: Mapped[str] = mapped_column(String(50), default="standard")
    discount_type: Mapped[str] = mapped_column(String(20), default="flat")
    discount_value_cents: Mapped[int] = mapped_column(Integer, default=2500)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    attendee = relationship(
        "Attendee",
        foreign_keys=[attendee_id],
        lazy="selectin",
    )
