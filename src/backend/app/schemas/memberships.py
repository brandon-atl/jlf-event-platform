from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MembershipCreate(BaseModel):
    attendee_id: UUID
    tier: str = "standard"
    discount_value_cents: int = 2500


class MembershipUpdate(BaseModel):
    tier: str | None = None
    discount_value_cents: int | None = None
    is_active: bool | None = None


class MembershipResponse(BaseModel):
    id: UUID
    attendee_id: UUID
    tier: str
    discount_type: str
    discount_value_cents: int
    started_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime
    attendee_name: str | None = None
    attendee_email: str | None = None

    model_config = {"from_attributes": True}
