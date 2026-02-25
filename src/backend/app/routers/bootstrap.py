"""One-time admin bootstrap — creates the first admin user when zero users exist."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

router = APIRouter(prefix="/admin", tags=["bootstrap"])


class BootstrapRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


@router.post("/bootstrap", status_code=201)
async def bootstrap_admin(data: BootstrapRequest, db: AsyncSession = Depends(get_db)):
    """Create the first admin user. Only works when zero users exist in the DB."""
    count_result = await db.execute(select(func.count()).select_from(User))
    if (count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin user already exists. Bootstrap is only available when no users exist.",
        )

    user = User(
        email=data.email,
        name=data.name,
        role=UserRole.admin,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin user already exists. Bootstrap is only available when no users exist.",
        ) from e

    return {"message": "Admin user created", "email": data.email}
