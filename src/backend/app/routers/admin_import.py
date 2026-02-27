"""Admin data import endpoint."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.post("/import-clients")
async def import_clients_endpoint(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Trigger CSV client import. Admin-only."""
    from scripts.import_clients import import_clients

    summary = await import_clients(db)
    return summary
