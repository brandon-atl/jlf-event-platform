from uuid import UUID

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    id: UUID
    email: str
    name: str
    role: str

    model_config = {"from_attributes": True}


class CoCreatorInfo(BaseModel):
    id: UUID
    email: str
    name: str
    role: str = "co_creator"
    event_ids: list[UUID] = []

    model_config = {"from_attributes": True}
