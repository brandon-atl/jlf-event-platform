import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class CoCreator(Base):
    __tablename__ = "co_creators"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    auth_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    venmo_handle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ),
    )

    events = relationship(
        "Event", secondary="event_co_creators", lazy="selectin"
    )


class EventCoCreator(Base):
    __tablename__ = "event_co_creators"

    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("events.id"), primary_key=True
    )
    co_creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("co_creators.id"), primary_key=True
    )
    can_see_amounts: Mapped[bool] = mapped_column(Boolean, default=False)
    can_upload_expenses: Mapped[bool] = mapped_column(Boolean, default=True)
    split_percentage: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
