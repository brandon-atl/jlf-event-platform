from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ScholarshipLinkCreate(BaseModel):
    event_id: UUID
    code: str = Field(..., max_length=50)
    scholarship_price_cents: int = 3000
    max_uses: int = 1
    attendee_id: UUID | None = None


class ScholarshipLinkResponse(BaseModel):
    id: UUID
    event_id: UUID
    attendee_id: UUID | None = None
    code: str
    scholarship_price_cents: int
    stripe_coupon_id: str | None = None
    max_uses: int
    uses: int
    created_by: UUID
    created_at: datetime
    event_name: str | None = None

    model_config = {"from_attributes": True}


class ScholarshipLinkValidation(BaseModel):
    valid: bool
    event_id: UUID | None = None
    event_slug: str | None = None
    scholarship_price_cents: int | None = None
    remaining_uses: int | None = None
