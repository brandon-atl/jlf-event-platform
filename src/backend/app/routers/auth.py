"""Authentication router — JWT login, magic links, user info."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.co_creator import CoCreator
from app.models.user import User
from app.schemas.auth import (
    CoCreatorInfo,
    LoginRequest,
    MagicLinkRequest,
    TokenResponse,
    UserInfo,
)
from app.services.auth_service import (
    create_access_token,
    generate_magic_link_token,
    get_co_creator_event_ids,
    get_current_co_creator,
    get_current_user,
    hash_magic_link_token,
    verify_password,
    verify_token,
)
from app.services.email_service import send_magic_link_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate operator/admin with email and password, return JWT."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return TokenResponse(access_token=token)


@router.post("/magic-link", status_code=202)
async def send_magic_link(data: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """Send a magic link to a co-creator's email. Always returns 202 (no email enumeration)."""
    result = await db.execute(
        select(CoCreator).where(CoCreator.email == data.email)
    )
    co_creator = result.scalar_one_or_none()

    if co_creator:
        token = generate_magic_link_token()
        co_creator.auth_token_hash = hash_magic_link_token(token)
        co_creator.token_expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.magic_link_expiration_hours
        )
        await db.flush()
        await send_magic_link_email(co_creator.email, co_creator.name, token)

    # Always return 202 to prevent email enumeration
    return {"detail": "If that email is registered, a login link has been sent."}


@router.get("/verify", response_model=TokenResponse)
async def verify_magic_link(token: str, db: AsyncSession = Depends(get_db)):
    """Verify a magic link token and return a JWT for the co-creator."""
    token_hash = hash_magic_link_token(token)
    result = await db.execute(
        select(CoCreator).where(CoCreator.auth_token_hash == token_hash)
    )
    co_creator = result.scalar_one_or_none()

    if not co_creator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link",
        )

    if co_creator.token_expires_at and co_creator.token_expires_at < datetime.now(
        timezone.utc
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Magic link has expired",
        )

    # Invalidate token (single-use)
    co_creator.auth_token_hash = None
    co_creator.token_expires_at = None
    await db.flush()

    event_ids = await get_co_creator_event_ids(co_creator.id, db)

    jwt_token = create_access_token(
        {
            "sub": str(co_creator.id),
            "email": co_creator.email,
            "role": "co_creator",
            "event_ids": [str(eid) for eid in event_ids],
        }
    )
    return TokenResponse(access_token=jwt_token)


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
):
    """Return the current authenticated user's info."""
    return UserInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value,
    )
