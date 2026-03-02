import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class OperatingExpenseCategory(str, enum.Enum):
    propane = "propane"
    water = "water"
    maintenance = "maintenance"
    forest_fund = "forest_fund"
    supplies = "supplies"
    other = "other"


class OperatingExpense(Base, TimestampMixin):
    __tablename__ = "operating_expenses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    submitted_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    description: Mapped[str] = mapped_column(String(500))
    amount_cents: Mapped[int] = mapped_column(Integer)
    category: Mapped[OperatingExpenseCategory] = mapped_column(String(50))
    receipt_image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    expense_date: Mapped[date] = mapped_column(Date)
    reimbursed: Mapped[bool] = mapped_column(Boolean, default=False)
    reimbursed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    submitted_by_user = relationship("User", lazy="selectin")