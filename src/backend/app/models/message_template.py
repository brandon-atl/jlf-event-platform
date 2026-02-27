import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import JSONType, Base, TimestampMixin, gen_uuid


class TemplateCategory(str, enum.Enum):
    reminder = "reminder"
    day_of = "day_of"
    post_event = "post_event"
    confirmation = "confirmation"
    cancellation = "cancellation"
    custom = "custom"


class TemplateChannel(str, enum.Enum):
    sms = "sms"
    email = "email"
    both = "both"


class MessageTemplate(TimestampMixin, Base):
    __tablename__ = "message_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[TemplateCategory] = mapped_column(
        Enum(TemplateCategory, native_enum=False), index=True
    )
    channel: Mapped[TemplateChannel] = mapped_column(
        Enum(TemplateChannel, native_enum=False)
    )
    subject: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    variables: Mapped[list | None] = mapped_column(JSONType, nullable=True, default=list)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
