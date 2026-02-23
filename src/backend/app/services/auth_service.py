import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.co_creator import CoCreator, EventCoCreator
from app.models.user import User

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expiration_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def generate_magic_link_token() -> str:
    return secrets.token_urlsafe(48)


def hash_magic_link_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    role = payload.get("role")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if role == "co_creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Co-creator tokens cannot access operator endpoints",
        )

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_operator(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "operator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


async def get_current_co_creator(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> CoCreator:
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    role = payload.get("role")

    if role != "co_creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Requires co-creator token"
        )

    result = await db.execute(select(CoCreator).where(CoCreator.id == UUID(user_id)))
    co_creator = result.scalar_one_or_none()
    if not co_creator:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Co-creator not found")
    return co_creator


async def get_co_creator_event_ids(co_creator_id: UUID, db: AsyncSession) -> list[UUID]:
    result = await db.execute(
        select(EventCoCreator.event_id).where(
            EventCoCreator.co_creator_id == co_creator_id
        )
    )
    return list(result.scalars().all())
