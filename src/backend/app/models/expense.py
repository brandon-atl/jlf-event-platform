import enum
import uuid
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ExpenseCategory(str, enum.Enum):
    groceries = "groceries"
    supplies = "supplies"
    replenishables = "replenishables"
    cacao = "cacao"
    venue = "venue"
    transportation = "transportation"
    other = "other"


class ActorType(str, enum.Enum):
    admin = "admin"
    co_creator = "co_creator"


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"))
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    actor_type: Mapped[ActorType] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(String(500))
    amount_cents: Mapped[int] = mapped_column(Integer)
    category: Mapped[ExpenseCategory] = mapped_column(String(50))
    receipt_image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    event = relationship("Event", lazy="selectin")
    submitted_by_user = relationship("User", lazy="selectin")