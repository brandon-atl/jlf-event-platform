"""Pydantic schemas for message_templates endpoints."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class MessageTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    category: str  # reminder | day_of | post_event | confirmation | cancellation | custom
    channel: str  # sms | email | both
    subject: str | None = None
    body: str
    variables: list[str] = []
    is_default: bool = False


class MessageTemplateUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    category: str | None = None
    channel: str | None = None
    subject: str | None = None
    body: str | None = None
    variables: list[str] | None = None
    is_default: bool | None = None


class MessageTemplateResponse(BaseModel):
    id: UUID
    name: str
    category: str
    channel: str
    subject: str | None = None
    body: str
    variables: list[str] | Any = []
    is_default: bool
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplatePreviewRequest(BaseModel):
    sample_data: dict[str, str] = {}


class TemplatePreviewResponse(BaseModel):
    rendered_subject: str | None = None
    rendered_body: str
