import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"


class NotificationStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"
    bounced = "bounced"


class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    registration_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("registrations.id"), index=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, native_enum=False)
    )
    template_id: Mapped[str] = mapped_column(String(100))
    content_hash: Mapped[str] = mapped_column(String(64))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, native_enum=False)
    )

    registration = relationship("Registration", lazy="selectin")
