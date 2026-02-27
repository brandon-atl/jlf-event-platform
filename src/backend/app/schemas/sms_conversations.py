"""Pydantic schemas for sms_conversations endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SMSConversationEntry(BaseModel):
    id: UUID
    registration_id: UUID | None = None
    attendee_phone: str
    direction: str
    body: str
    twilio_sid: str | None = None
    sent_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SMSConversationThread(BaseModel):
    attendee_phone: str
    attendee_name: str | None = None
    messages: list[SMSConversationEntry]
    last_message_at: datetime


class SMSConversationSummary(BaseModel):
    attendee_phone: str
    attendee_name: str | None = None
    last_message: str
    last_message_at: datetime
    message_count: int


class SMSReplyRequest(BaseModel):
    message: str


class SMSReplyResponse(BaseModel):
    success: bool
    message_id: UUID | None = None


class CancelRequest(BaseModel):
    registration_id: UUID
    email: str
    reason: str | None = None


class BulkNotificationRequest(BaseModel):
    channel: str  # sms | email | both
    template_id: UUID | None = None
    custom_message: str | None = None
    subject: str | None = None


class BulkNotificationResponse(BaseModel):
    sent_count: int
    failed_count: int
    channel: str
