import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class FormType(str, enum.Enum):
    intake = "intake"
    waiver = "waiver"
    accommodation = "accommodation"
    dietary = "dietary"
    travel = "travel"
    logistics = "logistics"
    health = "health"
    legal = "legal"
    custom = "custom"


class FormTemplate(TimestampMixin, Base):
    __tablename__ = "form_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    form_type: Mapped[FormType] = mapped_column(
        Enum(FormType, native_enum=False), index=True
    )
    fields: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    event_form_links = relationship("EventFormLink", back_populates="form_template")
