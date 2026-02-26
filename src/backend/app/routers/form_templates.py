"""Form templates CRUD router — all endpoints require operator/admin auth."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AuditLog, Event, EventStatus, FormTemplate, EventFormLink
from ..models.form_template import FormType
from ..schemas.common import PaginatedResponse, PaginationMeta
from ..schemas.form_templates import (
    EventFormLinkCreate,
    EventFormLinkResponse,
    FormTemplateCreate,
    FormTemplateResponse,
    FormTemplateUpdate,
)
from ..services.auth_service import get_current_user
from ..models import User

router = APIRouter(prefix="/form-templates", tags=["form-templates"])


VALID_FORM_TYPES = {t.value for t in FormType}


def _validate_form_type(form_type: str) -> None:
    if form_type not in VALID_FORM_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid form_type '{form_type}'. Must be one of: {', '.join(sorted(VALID_FORM_TYPES))}",
        )


def _template_to_response(t: FormTemplate) -> FormTemplateResponse:
    return FormTemplateResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        form_type=t.form_type.value if hasattr(t.form_type, "value") else t.form_type,
        fields=t.fields or [],
        is_default=t.is_default,
        created_by=t.created_by,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


async def _audit(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id,
    action: str,
    actor: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            old_value=old_value,
            new_value=new_value,
        )
    )


# --------------------------------------------------------------------------- #
# Form Template Endpoints                                                       #
# --------------------------------------------------------------------------- #


@router.get("", response_model=PaginatedResponse)
async def list_form_templates(
    form_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all form templates, optionally filtered by form_type."""
    query = select(FormTemplate)

    if form_type:
        _validate_form_type(form_type)
        query = query.where(FormTemplate.form_type == form_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(FormTemplate.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    templates = result.scalars().all()

    return PaginatedResponse(
        data=[_template_to_response(t) for t in templates],
        meta=PaginationMeta(total=total, page=page, per_page=per_page),
    )


@router.post("", response_model=FormTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_form_template(
    body: FormTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new form template."""
    _validate_form_type(body.form_type)

    template = FormTemplate(
        name=body.name,
        description=body.description,
        form_type=body.form_type,
        fields=body.fields,
        is_default=body.is_default,
        created_by=current_user.id,
    )
    db.add(template)

    await _audit(
        db,
        entity_type="form_template",
        entity_id=template.id,
        action="created",
        actor=current_user.email,
        new_value=body.model_dump(mode="json"),
    )

    await db.commit()
    await db.refresh(template)
    return _template_to_response(template)


@router.get("/{template_id}", response_model=FormTemplateResponse)
async def get_form_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single form template by ID."""
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")
    return _template_to_response(template)


@router.put("/{template_id}", response_model=FormTemplateResponse)
async def update_form_template(
    template_id: str,
    body: FormTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a form template."""
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "form_type" in update_data:
        _validate_form_type(update_data["form_type"])

    old_values = {}
    for field in update_data:
        val = getattr(template, field, None)
        if hasattr(val, "value"):
            val = val.value
        old_values[field] = val

    for field, value in update_data.items():
        setattr(template, field, value)
    template.updated_at = datetime.now(timezone.utc)

    await _audit(
        db,
        entity_type="form_template",
        entity_id=template.id,
        action="updated",
        actor=current_user.email,
        old_value=old_values,
        new_value=update_data,
    )

    await db.commit()
    await db.refresh(template)
    return _template_to_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
async def delete_form_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a form template. Fails with 409 if linked to any active events."""
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")

    # Check if linked to any active events
    link_result = await db.execute(
        select(func.count(EventFormLink.id))
        .join(Event, EventFormLink.event_id == Event.id)
        .where(
            EventFormLink.form_template_id == template_id,
            Event.status.in_([EventStatus.active.value, EventStatus.draft.value]),
        )
    )
    active_link_count = link_result.scalar() or 0
    if active_link_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete: form template is linked to {active_link_count} active/draft event(s). "
            "Remove all event links before deleting.",
        )

    await _audit(
        db,
        entity_type="form_template",
        entity_id=template.id,
        action="deleted",
        actor=current_user.email,
        old_value={"name": template.name, "form_type": str(template.form_type)},
    )

    await db.delete(template)
    await db.commit()
    return {"detail": "Form template deleted", "id": template_id}


@router.post(
    "/{template_id}/duplicate",
    response_model=FormTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_form_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duplicate a form template with a new name."""
    result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == template_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Form template not found")

    new_template = FormTemplate(
        name=f"Copy of {source.name}",
        description=source.description,
        form_type=source.form_type,
        fields=source.fields,
        is_default=False,  # duplicates are never default
        created_by=current_user.id,
    )
    db.add(new_template)

    await _audit(
        db,
        entity_type="form_template",
        entity_id=new_template.id,
        action="duplicated",
        actor=current_user.email,
        old_value={"source_template_id": str(template_id)},
        new_value={"new_template_id": str(new_template.id)},
    )

    await db.commit()
    await db.refresh(new_template)
    return _template_to_response(new_template)


# --------------------------------------------------------------------------- #
# Event → Form Link Endpoints                                                   #
# --------------------------------------------------------------------------- #

event_forms_router = APIRouter(prefix="/events/{event_id}/forms", tags=["event-forms"])


@event_forms_router.get("", response_model=list[EventFormLinkResponse])
async def list_event_forms(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List form templates attached to an event, ordered by sort_order."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(EventFormLink)
        .where(EventFormLink.event_id == event_id)
        .order_by(EventFormLink.sort_order)
    )
    links = result.scalars().all()

    out = []
    for link in links:
        ft_result = await db.execute(
            select(FormTemplate).where(FormTemplate.id == link.form_template_id)
        )
        ft = ft_result.scalar_one_or_none()
        out.append(
            EventFormLinkResponse(
                id=link.id,
                event_id=link.event_id,
                form_template_id=link.form_template_id,
                is_waiver=link.is_waiver,
                sort_order=link.sort_order,
                form_template=_template_to_response(ft) if ft else None,
            )
        )
    return out


@event_forms_router.post(
    "", response_model=EventFormLinkResponse, status_code=status.HTTP_201_CREATED
)
async def attach_form_to_event(
    event_id: str,
    body: EventFormLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a form template to an event."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    ft_result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == body.form_template_id)
    )
    ft = ft_result.scalar_one_or_none()
    if not ft:
        raise HTTPException(status_code=404, detail="Form template not found")

    # Check for duplicate link
    dup = await db.execute(
        select(EventFormLink).where(
            EventFormLink.event_id == event_id,
            EventFormLink.form_template_id == body.form_template_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Form template is already attached to this event",
        )

    link = EventFormLink(
        event_id=event_id,
        form_template_id=body.form_template_id,
        is_waiver=body.is_waiver,
        sort_order=body.sort_order,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    return EventFormLinkResponse(
        id=link.id,
        event_id=link.event_id,
        form_template_id=link.form_template_id,
        is_waiver=link.is_waiver,
        sort_order=link.sort_order,
        form_template=_template_to_response(ft),
    )


@event_forms_router.delete("/{link_id}", status_code=status.HTTP_200_OK)
async def detach_form_from_event(
    event_id: str,
    link_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detach a form template from an event."""
    result = await db.execute(
        select(EventFormLink).where(
            EventFormLink.id == link_id,
            EventFormLink.event_id == event_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Event form link not found")

    await db.delete(link)
    await db.commit()
    return {"detail": "Form template detached", "link_id": link_id}
