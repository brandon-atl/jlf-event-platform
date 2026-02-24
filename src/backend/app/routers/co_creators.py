"""Admin co-creator CRUD router — create, list, delete, assign events, invite."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import CoCreator, Event, EventCoCreator
from ..schemas.co_creator import (
    CoCreatorCreate,
    CoCreatorEventAssignment,
    CoCreatorResponse,
    EventBrief,
)
from ..services.auth_service import (
    generate_magic_link_token,
    get_current_operator,
    hash_magic_link_token,
)
from ..services.email_service import send_magic_link_email
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/co-creators", tags=["co-creators"])


def _build_response(co_creator: CoCreator, event_briefs: list[EventBrief]) -> CoCreatorResponse:
    return CoCreatorResponse(
        id=co_creator.id,
        name=co_creator.name,
        email=co_creator.email,
        created_at=co_creator.created_at,
        events=event_briefs,
    )


async def _get_event_briefs(co_creator_id, db: AsyncSession) -> list[EventBrief]:
    result = await db.execute(
        select(EventCoCreator, Event.name)
        .join(Event, Event.id == EventCoCreator.event_id)
        .where(EventCoCreator.co_creator_id == co_creator_id)
    )
    return [
        EventBrief(
            event_id=row.EventCoCreator.event_id,
            event_name=row.name,
            can_see_amounts=row.EventCoCreator.can_see_amounts,
        )
        for row in result.all()
    ]


@router.post("", response_model=CoCreatorResponse, status_code=201)
async def create_co_creator(
    data: CoCreatorCreate,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Create a new co-creator record."""
    # Check for duplicate email
    existing = await db.execute(
        select(CoCreator).where(CoCreator.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A co-creator with that email already exists",
        )

    co_creator = CoCreator(name=data.name, email=data.email)
    db.add(co_creator)
    await db.flush()
    await db.refresh(co_creator)
    return _build_response(co_creator, [])


@router.get("", response_model=list[CoCreatorResponse])
async def list_co_creators(
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """List all co-creators with their assigned events."""
    result = await db.execute(
        select(CoCreator).order_by(CoCreator.created_at.desc())
    )
    co_creators = result.scalars().all()

    responses = []
    for cc in co_creators:
        briefs = await _get_event_briefs(cc.id, db)
        responses.append(_build_response(cc, briefs))
    return responses


@router.get("/{co_creator_id}", response_model=CoCreatorResponse)
async def get_co_creator(
    co_creator_id: str,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Get a single co-creator with assigned events."""
    result = await db.execute(
        select(CoCreator).where(CoCreator.id == co_creator_id)
    )
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Co-creator not found")
    briefs = await _get_event_briefs(cc.id, db)
    return _build_response(cc, briefs)


@router.delete("/{co_creator_id}", status_code=204)
async def delete_co_creator(
    co_creator_id: str,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Delete a co-creator and all their event assignments."""
    result = await db.execute(
        select(CoCreator).where(CoCreator.id == co_creator_id)
    )
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Co-creator not found")

    # Delete event assignments first
    await db.execute(
        select(EventCoCreator).where(EventCoCreator.co_creator_id == co_creator_id)
    )
    from sqlalchemy import delete as sa_delete

    await db.execute(
        sa_delete(EventCoCreator).where(EventCoCreator.co_creator_id == co_creator_id)
    )
    await db.delete(cc)
    await db.flush()


@router.post("/{co_creator_id}/events", status_code=201)
async def assign_event(
    co_creator_id: str,
    data: CoCreatorEventAssignment,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Assign a co-creator to an event."""
    # Verify co-creator exists
    cc_result = await db.execute(
        select(CoCreator).where(CoCreator.id == co_creator_id)
    )
    if not cc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Co-creator not found")

    # Verify event exists
    event_result = await db.execute(select(Event).where(Event.id == data.event_id))
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    # Check for existing assignment
    existing = await db.execute(
        select(EventCoCreator).where(
            EventCoCreator.co_creator_id == co_creator_id,
            EventCoCreator.event_id == data.event_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Co-creator is already assigned to this event",
        )

    link = EventCoCreator(
        co_creator_id=co_creator_id,
        event_id=data.event_id,
        can_see_amounts=data.can_see_amounts,
    )
    db.add(link)
    await db.flush()
    return {"detail": "Event assigned"}


@router.delete("/{co_creator_id}/events/{event_id}", status_code=204)
async def remove_event(
    co_creator_id: str,
    event_id: str,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Remove a co-creator from an event."""
    from sqlalchemy import delete as sa_delete

    result = await db.execute(
        sa_delete(EventCoCreator).where(
            EventCoCreator.co_creator_id == co_creator_id,
            EventCoCreator.event_id == event_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")


@router.post("/{co_creator_id}/invite", status_code=202)
async def send_invite(
    co_creator_id: str,
    db: AsyncSession = Depends(get_db),
    _operator=Depends(get_current_operator),
):
    """Generate and send a magic link email to the co-creator."""
    result = await db.execute(
        select(CoCreator).where(CoCreator.id == co_creator_id)
    )
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Co-creator not found")

    token = generate_magic_link_token()
    cc.auth_token_hash = hash_magic_link_token(token)
    cc.token_expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.magic_link_expiration_hours
    )
    await db.flush()

    await send_magic_link_email(cc.email, cc.name, token)
    return {"detail": "Magic link sent"}
