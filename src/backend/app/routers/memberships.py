"""Membership management — admin CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.attendee import Attendee
from app.models.audit import AuditLog
from app.models.membership import Membership
from app.models.user import User
from app.schemas.memberships import (
    MembershipCreate,
    MembershipResponse,
    MembershipUpdate,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/memberships", tags=["memberships"])


def _to_response(m: Membership) -> MembershipResponse:
    return MembershipResponse(
        id=m.id,
        attendee_id=m.attendee_id,
        tier=m.tier,
        discount_type=m.discount_type,
        discount_value_cents=m.discount_value_cents,
        started_at=m.started_at,
        expires_at=m.expires_at,
        is_active=m.is_active,
        created_at=m.created_at,
        attendee_name=(
            f"{m.attendee.first_name} {m.attendee.last_name}" if m.attendee else None
        ),
        attendee_email=m.attendee.email if m.attendee else None,
    )


@router.get("", response_model=list[MembershipResponse])
async def list_memberships(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all memberships with attendee info."""
    result = await db.execute(
        select(Membership).order_by(Membership.created_at.desc())
    )
    memberships = result.scalars().all()
    return [_to_response(m) for m in memberships]


@router.post("", response_model=MembershipResponse, status_code=201)
async def create_membership(
    body: MembershipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a membership for an attendee."""
    # Check attendee exists
    att_result = await db.execute(
        select(Attendee).where(Attendee.id == body.attendee_id)
    )
    attendee = att_result.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    # Check for existing active membership
    existing = await db.execute(
        select(Membership).where(
            Membership.attendee_id == body.attendee_id,
            Membership.is_active == True,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail="Attendee already has an active membership"
        )

    membership = Membership(
        attendee_id=body.attendee_id,
        tier=body.tier,
        discount_value_cents=body.discount_value_cents,
    )
    db.add(membership)
    await db.flush()

    # Update attendee flags
    attendee.is_member = True
    attendee.membership_id = membership.id

    db.add(
        AuditLog(
            entity_type="membership",
            entity_id=membership.id,
            action="created",
            actor=current_user.email,
            new_value={
                "attendee_id": str(body.attendee_id),
                "tier": body.tier,
                "discount_value_cents": body.discount_value_cents,
            },
        )
    )

    await db.commit()
    await db.refresh(membership)
    return _to_response(membership)


@router.put("/{membership_id}", response_model=MembershipResponse)
async def update_membership(
    membership_id: UUID,
    body: MembershipUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a membership."""
    result = await db.execute(
        select(Membership).where(Membership.id == membership_id)
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    old_values = {}
    new_values = {}

    if body.tier is not None:
        old_values["tier"] = membership.tier
        membership.tier = body.tier
        new_values["tier"] = body.tier

    if body.discount_value_cents is not None:
        old_values["discount_value_cents"] = membership.discount_value_cents
        membership.discount_value_cents = body.discount_value_cents
        new_values["discount_value_cents"] = body.discount_value_cents

    if body.is_active is not None:
        old_values["is_active"] = membership.is_active
        membership.is_active = body.is_active
        new_values["is_active"] = body.is_active
        # Sync attendee flags
        att_result = await db.execute(
            select(Attendee).where(Attendee.id == membership.attendee_id)
        )
        attendee = att_result.scalar_one_or_none()
        if attendee:
            attendee.is_member = body.is_active
            if not body.is_active:
                attendee.membership_id = None

    if new_values:
        db.add(
            AuditLog(
                entity_type="membership",
                entity_id=membership.id,
                action="updated",
                actor=current_user.email,
                old_value=old_values,
                new_value=new_values,
            )
        )

    await db.commit()
    await db.refresh(membership)
    return _to_response(membership)


@router.delete("/{membership_id}", status_code=204)
async def deactivate_membership(
    membership_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a membership."""
    result = await db.execute(
        select(Membership).where(Membership.id == membership_id)
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    membership.is_active = False

    # Clear attendee flags
    att_result = await db.execute(
        select(Attendee).where(Attendee.id == membership.attendee_id)
    )
    attendee = att_result.scalar_one_or_none()
    if attendee:
        attendee.is_member = False
        attendee.membership_id = None

    db.add(
        AuditLog(
            entity_type="membership",
            entity_id=membership.id,
            action="deactivated",
            actor=current_user.email,
            old_value={"is_active": True},
            new_value={"is_active": False},
        )
    )

    await db.commit()
