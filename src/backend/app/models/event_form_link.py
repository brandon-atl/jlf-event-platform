import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, gen_uuid


class EventFormLink(Base):
    __tablename__ = "event_form_links"
    __table_args__ = (
        UniqueConstraint("event_id", "form_template_id", name="uq_event_form_template"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"), index=True)
    form_template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form_templates.id"), index=True
    )
    is_waiver: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    event = relationship("Event", back_populates="form_links")
    form_template = relationship("FormTemplate", back_populates="event_form_links")
