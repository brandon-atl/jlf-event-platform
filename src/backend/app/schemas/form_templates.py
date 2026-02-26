"""Pydantic schemas for form_templates endpoints."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class FormTemplateCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    form_type: str  # intake | waiver | accommodation | dietary | travel | logistics | health | legal | custom
    fields: list[dict[str, Any]] = []
    is_default: bool = False


class FormTemplateUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    form_type: str | None = None
    fields: list[dict[str, Any]] | None = None
    is_default: bool | None = None


class FormTemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    form_type: str
    fields: list[dict[str, Any]]
    is_default: bool
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventFormLinkCreate(BaseModel):
    form_template_id: UUID
    is_waiver: bool = False
    sort_order: int = 0


class EventFormLinkResponse(BaseModel):
    id: UUID
    event_id: UUID
    form_template_id: UUID
    is_waiver: bool
    sort_order: int
    form_template: FormTemplateResponse | None = None

    model_config = {"from_attributes": True}
