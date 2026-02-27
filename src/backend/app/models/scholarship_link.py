import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class ScholarshipLink(Base):
    __tablename__ = "scholarship_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    attendee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("attendees.id"), nullable=True
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    scholarship_price_cents: Mapped[int] = mapped_column(Integer, default=3000)
    stripe_coupon_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    uses: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event = relationship("Event", lazy="selectin")
    attendee = relationship("Attendee", lazy="selectin")
    creator = relationship("User", lazy="selectin")
