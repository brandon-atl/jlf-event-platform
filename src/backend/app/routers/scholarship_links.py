"""Scholarship link management — admin CRUD + public validation."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog
from app.models.scholarship_link import ScholarshipLink
from app.models.user import User
from app.schemas.scholarship_links import (
    ScholarshipLinkCreate,
    ScholarshipLinkResponse,
    ScholarshipLinkValidation,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/scholarship-links", tags=["scholarship-links"])


def _to_response(link: ScholarshipLink) -> ScholarshipLinkResponse:
    return ScholarshipLinkResponse(
        id=link.id,
        event_id=link.event_id,
        attendee_id=link.attendee_id,
        code=link.code,
        scholarship_price_cents=link.scholarship_price_cents,
        stripe_coupon_id=link.stripe_coupon_id,
        max_uses=link.max_uses,
        uses=link.uses,
        created_by=link.created_by,
        created_at=link.created_at,
        event_name=link.event.name if link.event else None,
    )


@router.get("", response_model=list[ScholarshipLinkResponse])
async def list_scholarship_links(
    event_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all scholarship links, optionally filtered by event."""
    query = select(ScholarshipLink)
    if event_id:
        query = query.where(ScholarshipLink.event_id == event_id)
    query = query.order_by(ScholarshipLink.created_at.desc())
    result = await db.execute(query)
    links = result.scalars().all()
    return [_to_response(link) for link in links]


@router.post("", response_model=ScholarshipLinkResponse, status_code=201)
async def create_scholarship_link(
    body: ScholarshipLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new scholarship link."""
    # Check code uniqueness
    existing = await db.execute(
        select(ScholarshipLink).where(ScholarshipLink.code == body.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Scholarship code already exists")

    link = ScholarshipLink(
        event_id=body.event_id,
        attendee_id=body.attendee_id,
        code=body.code,
        scholarship_price_cents=body.scholarship_price_cents,
        max_uses=body.max_uses,
        created_by=current_user.id,
    )
    db.add(link)
    await db.flush()

    db.add(
        AuditLog(
            entity_type="scholarship_link",
            entity_id=link.id,
            action="created",
            actor=current_user.email,
            new_value={
                "code": body.code,
                "event_id": str(body.event_id),
                "scholarship_price_cents": body.scholarship_price_cents,
                "max_uses": body.max_uses,
            },
        )
    )

    await db.commit()
    await db.refresh(link)
    return _to_response(link)


@router.delete("/{link_id}", status_code=204)
async def deactivate_scholarship_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a scholarship link by setting max_uses = uses."""
    result = await db.execute(
        select(ScholarshipLink).where(ScholarshipLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Scholarship link not found")

    old_max = link.max_uses
    link.max_uses = link.uses  # effectively deactivate

    db.add(
        AuditLog(
            entity_type="scholarship_link",
            entity_id=link.id,
            action="deactivated",
            actor=current_user.email,
            old_value={"max_uses": old_max},
            new_value={"max_uses": link.uses},
        )
    )
    await db.commit()


@router.get("/validate/{code}", response_model=ScholarshipLinkValidation)
async def validate_scholarship_code(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — validate a scholarship code."""
    result = await db.execute(
        select(ScholarshipLink).where(ScholarshipLink.code == code)
    )
    link = result.scalar_one_or_none()

    if not link or link.uses >= link.max_uses:
        return ScholarshipLinkValidation(valid=False)

    return ScholarshipLinkValidation(
        valid=True,
        event_id=link.event_id,
        scholarship_price_cents=link.scholarship_price_cents,
        remaining_uses=link.max_uses - link.uses,
    )
