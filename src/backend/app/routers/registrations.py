"""Registrations management router — operator/admin auth required."""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import (
    Attendee,
    AuditLog,
    Event,
    Registration,
    RegistrationSource,
    RegistrationStatus,
    User,
)
from ..schemas.common import PaginatedResponse, PaginationMeta
from ..schemas.registrations import (
    ManualRegistrationCreate,
    RegistrationResponse,
    RegistrationUpdate,
)
from ..services.auth_service import get_current_user
from ..services.email_service import send_reminder_email

router = APIRouter(tags=["registrations"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _audit_log(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)


def _reg_to_response(reg: Registration) -> RegistrationResponse:
    from ..schemas.registrations import AttendeeInfo

    attendee_info = None
    if reg.attendee:
        attendee_info = AttendeeInfo(
            id=reg.attendee.id,
            email=reg.attendee.email,
            first_name=reg.attendee.first_name,
            last_name=reg.attendee.last_name,
            phone=reg.attendee.phone,
        )
    return RegistrationResponse(
        id=reg.id,
        attendee_id=reg.attendee_id,
        event_id=reg.event_id,
        status=reg.status.value if hasattr(reg.status, "value") else reg.status,
        payment_amount_cents=reg.payment_amount_cents,
        stripe_checkout_session_id=reg.stripe_checkout_session_id,
        accommodation_type=(
            reg.accommodation_type.value
            if hasattr(reg.accommodation_type, "value") and reg.accommodation_type
            else reg.accommodation_type
        ),
        dietary_restrictions=reg.dietary_restrictions,
        intake_data=reg.intake_data,
        waiver_accepted_at=reg.waiver_accepted_at,
        source=reg.source.value if hasattr(reg.source, "value") else reg.source,
        notes=reg.notes,
        created_at=reg.created_at,
        updated_at=reg.updated_at,
        attendee=attendee_info,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/events/{event_id}/registrations", response_model=PaginatedResponse)
async def list_registrations(
    event_id: str,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List registrations for an event with filtering and search."""
    # Verify event exists
    ev = await db.execute(select(Event).where(Event.id == event_id))
    if not ev.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    query = (
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(Registration.event_id == event_id)
    )

    if status_filter:
        query = query.where(Registration.status == status_filter)

    if search:
        pattern = f"%{search}%"
        query = query.join(Attendee).where(
            or_(
                Attendee.first_name.ilike(pattern),
                Attendee.last_name.ilike(pattern),
                Attendee.email.ilike(pattern),
            )
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.order_by(Registration.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    registrations = result.scalars().all()

    data = [_reg_to_response(r) for r in registrations]
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(total=total, page=page, per_page=per_page),
    )


@router.get("/registrations/{registration_id}", response_model=RegistrationResponse)
async def get_registration(
    registration_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single registration detail."""
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(Registration.id == registration_id)
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return _reg_to_response(reg)


@router.put("/registrations/{registration_id}", response_model=RegistrationResponse)
async def update_registration(
    registration_id: str,
    body: RegistrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a registration (status, accommodation, notes). Audit-logged."""
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(Registration.id == registration_id)
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Capture old values for audit
    old_values = {}
    for field in update_data:
        val = getattr(reg, field, None)
        if hasattr(val, "value"):
            val = val.value
        old_values[field] = val

    for field, value in update_data.items():
        setattr(reg, field, value)

    action = "updated"
    if "status" in update_data:
        action = "status_change"

    await _audit_log(
        db,
        entity_type="registration",
        entity_id=reg.id,
        action=action,
        actor=current_user.email,
        old_value=old_values,
        new_value=update_data,
    )

    await db.commit()
    await db.refresh(reg)
    return _reg_to_response(reg)


@router.post(
    "/events/{event_id}/registrations/manual",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def manual_registration(
    event_id: str,
    body: ManualRegistrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a manual registration (walk-in, cash, comp)."""
    # Verify event exists
    ev_result = await db.execute(select(Event).where(Event.id == event_id))
    event = ev_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Find or create attendee
    att_result = await db.execute(
        select(Attendee).where(Attendee.email == body.email)
    )
    attendee = att_result.scalar_one_or_none()
    if not attendee:
        attendee = Attendee(
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
            phone=body.phone,
        )
        db.add(attendee)
        await db.flush()
    else:
        # Update name/phone if provided
        attendee.first_name = body.first_name
        attendee.last_name = body.last_name
        if body.phone:
            attendee.phone = body.phone

    # Check for duplicate registration
    dup = await db.execute(
        select(Registration).where(
            Registration.attendee_id == attendee.id,
            Registration.event_id == event_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This attendee is already registered for this event",
        )

    # Map source string to enum
    source_map = {
        "manual": RegistrationSource.manual,
        "walk_in": RegistrationSource.walk_in,
    }
    source = source_map.get(body.source, RegistrationSource.manual)

    # Map status string to enum
    status_map = {
        "complete": RegistrationStatus.complete,
        "pending_payment": RegistrationStatus.pending_payment,
    }
    reg_status = status_map.get(body.status, RegistrationStatus.complete)

    reg = Registration(
        attendee_id=attendee.id,
        event_id=event_id,
        status=reg_status,
        payment_amount_cents=body.payment_amount_cents,
        accommodation_type=body.accommodation_type,
        dietary_restrictions=body.dietary_restrictions,
        intake_data=body.intake_data,
        source=source,
        notes=body.notes,
        waiver_accepted_at=datetime.now(timezone.utc) if reg_status == RegistrationStatus.complete else None,
    )
    db.add(reg)

    await _audit_log(
        db,
        entity_type="registration",
        entity_id=reg.id,
        action="manual_entry",
        actor=current_user.email,
        new_value={
            "attendee_email": body.email,
            "source": body.source,
            "status": body.status,
            "payment_amount_cents": body.payment_amount_cents,
        },
    )

    await db.commit()

    # Re-fetch with attendee loaded
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(Registration.id == reg.id)
    )
    reg = result.scalar_one()
    return _reg_to_response(reg)


@router.post("/registrations/{registration_id}/remind", status_code=200)
async def send_registration_reminder(
    registration_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually send a payment reminder to a specific attendee."""
    result = await db.execute(
        select(Registration)
        .options(
            selectinload(Registration.attendee),
            selectinload(Registration.event),
        )
        .where(Registration.id == registration_id)
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    if not reg.attendee:
        raise HTTPException(status_code=400, detail="No attendee associated")

    if reg.status != RegistrationStatus.pending_payment:
        raise HTTPException(
            status_code=400,
            detail="Can only remind registrations with pending_payment status",
        )

    # Rate-limit: don't send if reminded within the last 30 minutes
    if reg.reminder_sent_at:
        sent_at = reg.reminder_sent_at
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        minutes_since = (datetime.now(timezone.utc) - sent_at).total_seconds() / 60
        if minutes_since < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Reminder already sent {int(minutes_since)} minutes ago. Please wait.",
            )

    success = await send_reminder_email(reg, reg.event)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send reminder email")

    reg.reminder_sent_at = datetime.now(timezone.utc)

    await _audit_log(
        db,
        entity_type="registration",
        entity_id=reg.id,
        action="manual_reminder",
        actor=current_user.email,
    )
    await db.flush()

    return {"detail": "Reminder sent", "attendee_email": reg.attendee.email}


@router.get("/events/{event_id}/registrations/export")
async def export_registrations(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export registrations for an event as CSV."""
    # Verify event exists
    ev_result = await db.execute(select(Event).where(Event.id == event_id))
    event = ev_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.attendee))
        .where(Registration.event_id == event_id)
        .order_by(Registration.created_at.asc())
    )
    registrations = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Registration ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Status",
        "Accommodation",
        "Dietary Restrictions",
        "Payment (cents)",
        "Source",
        "Notes",
        "Registered At",
    ])

    for reg in registrations:
        att = reg.attendee
        writer.writerow([
            reg.id,
            att.first_name if att else "",
            att.last_name if att else "",
            att.email if att else "",
            att.phone if att else "",
            reg.status.value if hasattr(reg.status, "value") else reg.status,
            (
                reg.accommodation_type.value
                if hasattr(reg.accommodation_type, "value") and reg.accommodation_type
                else reg.accommodation_type or ""
            ),
            reg.dietary_restrictions or "",
            reg.payment_amount_cents or "",
            reg.source.value if hasattr(reg.source, "value") else reg.source,
            reg.notes or "",
            reg.created_at.isoformat() if reg.created_at else "",
        ])

    output.seek(0)
    filename = f"{event.slug}_registrations.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Check-in endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/events/{event_id}/registrations/{registration_id}/checkin",
    response_model=RegistrationResponse,
    summary="Mark a registration as checked in",
)
async def check_in_registration(
    event_id: str,
    registration_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Registration)
        .where(Registration.id == registration_id, Registration.event_id == event_id)
        .options(selectinload(Registration.attendee))
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != RegistrationStatus.complete:
        raise HTTPException(status_code=400, detail="Only confirmed registrations can be checked in")

    now = datetime.now(timezone.utc)
    actor = current_user.email if current_user else "unknown"
    reg.checked_in_at = now
    reg.checked_in_by = actor

    await _audit_log(
        db,
        entity_type="registration",
        entity_id=str(registration_id),
        action="check_in",
        actor=actor,
        old_value={"checked_in_at": None},
        new_value={"checked_in_at": now.isoformat(), "checked_in_by": actor},
    )
    await db.commit()
    await db.refresh(reg)
    return RegistrationResponse.model_validate(reg)


@router.delete(
    "/events/{event_id}/registrations/{registration_id}/checkin",
    response_model=RegistrationResponse,
    summary="Undo check-in for a registration",
)
async def undo_check_in(
    event_id: str,
    registration_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Registration)
        .where(Registration.id == registration_id, Registration.event_id == event_id)
        .options(selectinload(Registration.attendee))
    )
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    old_at = reg.checked_in_at.isoformat() if reg.checked_in_at else None
    reg.checked_in_at = None
    reg.checked_in_by = None
    actor = current_user.email if current_user else "unknown"

    await _audit_log(
        db,
        entity_type="registration",
        entity_id=str(registration_id),
        action="undo_check_in",
        actor=actor,
        old_value={"checked_in_at": old_at},
        new_value={"checked_in_at": None},
    )
    await db.commit()
    await db.refresh(reg)
    return RegistrationResponse.model_validate(reg)


# ---------------------------------------------------------------------------
# Audit log endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/events/{event_id}/audit",
    summary="Audit log for an event (registrations + event changes)",
)
async def get_event_audit(
    event_id: str,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get all registration IDs for this event
    reg_result = await db.execute(
        select(Registration.id).where(Registration.event_id == event_id)
    )
    reg_ids = {str(r) for r in reg_result.scalars().all()}

    # Fetch audit logs for the event itself + all its registrations
    from sqlalchemy import cast, String as SAString
    result = await db.execute(
        select(AuditLog)
        .where(
            (cast(AuditLog.entity_id, SAString).in_([event_id] + list(reg_ids)))
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "action": log.action,
            "actor": log.actor,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
