import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class SmsDirection(str, enum.Enum):
    inbound = "inbound"
    outbound = "outbound"


class SmsConversation(Base):
    __tablename__ = "sms_conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    registration_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("registrations.id"), nullable=True
    )
    attendee_phone: Mapped[str] = mapped_column(String(20), index=True)
    direction: Mapped[SmsDirection] = mapped_column(
        Enum(SmsDirection, native_enum=False)
    )
    body: Mapped[str] = mapped_column(Text)
    twilio_sid: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sent_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    registration = relationship("Registration", lazy="selectin")
