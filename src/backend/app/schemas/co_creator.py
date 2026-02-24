"""Co-creator admin schemas — CRUD + event assignment."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class CoCreatorCreate(BaseModel):
    name: str
    email: EmailStr


class CoCreatorEventAssignment(BaseModel):
    event_id: UUID
    can_see_amounts: bool = False


class EventBrief(BaseModel):
    event_id: UUID
    event_name: str
    can_see_amounts: bool

    model_config = {"from_attributes": True}


class CoCreatorResponse(BaseModel):
    id: UUID
    name: str
    email: str
    created_at: datetime
    events: list[EventBrief] = []

    model_config = {"from_attributes": True}
