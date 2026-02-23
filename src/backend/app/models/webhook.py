import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, gen_uuid


class WebhookRaw(Base):
    __tablename__ = "webhooks_raw"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    stripe_event_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100))
    payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
