import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import JSONType, Base, gen_uuid


class EventSettlement(Base):
    __tablename__ = "event_settlements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    gross_revenue_cents: Mapped[int] = mapped_column(Integer)
    stripe_fees_cents: Mapped[int] = mapped_column(Integer)
    total_expenses_cents: Mapped[int] = mapped_column(Integer)
    net_cents: Mapped[int] = mapped_column(Integer)
    split_config: Mapped[dict] = mapped_column(JSONType)
    fees_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ),
    )
    calculated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    event = relationship("Event", lazy="selectin")
    calculated_by_user = relationship("User", lazy="selectin")