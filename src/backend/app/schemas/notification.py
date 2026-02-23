from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SMSRequest(BaseModel):
    message: str


class SMSResponse(BaseModel):
    sent_count: int
    failed_count: int


class NotificationLogEntry(BaseModel):
    id: UUID
    registration_id: UUID
    channel: str
    template_id: str
    sent_at: datetime
    status: str

    model_config = {"from_attributes": True}
