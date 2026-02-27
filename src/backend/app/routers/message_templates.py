"""Message template CRUD router."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog
from app.models.message_template import MessageTemplate, TemplateCategory, TemplateChannel
from app.models.user import User
from app.schemas.message_templates import (
    MessageTemplateCreate,
    MessageTemplateResponse,
    MessageTemplateUpdate,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
)
from app.services.auth_service import get_current_user
from app.utils import render_template_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/message-templates", tags=["message-templates"])


def _to_response(t: MessageTemplate) -> MessageTemplateResponse:
    return MessageTemplateResponse(
        id=t.id,
        name=t.name,
        category=t.category.value if hasattr(t.category, "value") else t.category,
        channel=t.channel.value if hasattr(t.channel, "value") else t.channel,
        subject=t.subject,
        body=t.body,
        variables=t.variables or [],
        is_default=t.is_default,
        created_by=t.created_by,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def render_template(text: str, variables: dict[str, str]) -> str:
    """Replace {{variable}} placeholders with values.

    Delegates to shared utility for consistency.
    """
    return render_template_text(text, variables)


@router.get("", response_model=list[MessageTemplateResponse])
async def list_message_templates(
    category: str | None = Query(None),
    channel: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all message templates, optionally filtered by category and channel."""
    query = select(MessageTemplate).order_by(MessageTemplate.name)

    if category:
        try:
            cat = TemplateCategory(category)
            query = query.where(MessageTemplate.category == cat)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid category")

    if channel:
        try:
            ch = TemplateChannel(channel)
            query = query.where(MessageTemplate.channel == ch)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid channel")

    result = await db.execute(query)
    templates = result.scalars().all()
    return [_to_response(t) for t in templates]


@router.post("", response_model=MessageTemplateResponse, status_code=201)
async def create_message_template(
    data: MessageTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new message template."""
    try:
        category = TemplateCategory(data.category)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid category")

    try:
        channel = TemplateChannel(data.channel)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid channel")

    template = MessageTemplate(
        name=data.name,
        category=category,
        channel=channel,
        subject=data.subject,
        body=data.body,
        variables=data.variables,
        is_default=data.is_default,
        created_by=current_user.id,
    )
    db.add(template)
    await db.flush()

    db.add(AuditLog(
        entity_type="message_template",
        entity_id=template.id,
        action="created",
        actor=current_user.email,
        new_value=data.model_dump(mode="json"),
    ))
    await db.flush()

    return _to_response(template)


@router.put("/{template_id}", response_model=MessageTemplateResponse)
async def update_message_template(
    template_id: UUID,
    data: MessageTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a message template."""
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    old_values = {}
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        old_values[key] = getattr(template, key)
        if hasattr(old_values[key], "value"):
            old_values[key] = old_values[key].value

        if key == "category" and value is not None:
            try:
                value = TemplateCategory(value)
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid category")
        elif key == "channel" and value is not None:
            try:
                value = TemplateChannel(value)
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid channel")

        setattr(template, key, value)

    db.add(AuditLog(
        entity_type="message_template",
        entity_id=template.id,
        action="updated",
        actor=current_user.email,
        old_value=old_values,
        new_value=update_data,
    ))
    await db.flush()

    return _to_response(template)


@router.delete("/{template_id}", status_code=204)
async def delete_message_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a message template."""
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.add(AuditLog(
        entity_type="message_template",
        entity_id=template.id,
        action="deleted",
        actor=current_user.email,
        old_value={"name": template.name},
    ))

    await db.delete(template)
    await db.flush()


@router.post("/{template_id}/preview", response_model=TemplatePreviewResponse)
async def preview_message_template(
    template_id: UUID,
    data: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Render a template with sample data."""
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Default sample data for preview
    sample = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@example.com",
        "phone": "+14045551234",
        "event_name": "Emerging from Winter Retreat",
        "event_date": "March 15, 2026",
        "event_time": "2:00 PM",
        "meeting_point": "Main gate parking area",
        "cancel_url": "https://justloveforest-events.vercel.app/register/example/cancel?reg=abc123",
    }
    sample.update(data.sample_data)

    rendered_body = render_template(template.body, sample)
    rendered_subject = render_template(template.subject, sample) if template.subject else None

    return TemplatePreviewResponse(
        rendered_subject=rendered_subject,
        rendered_body=rendered_body,
    )
