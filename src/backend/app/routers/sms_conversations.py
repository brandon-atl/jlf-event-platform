"""SMS conversations router — list threaded conversations, send replies."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.attendee import Attendee
from app.models.registration import Registration
from app.models.sms_conversation import SmsConversation, SmsDirection
from app.models.user import User
from app.schemas.sms_conversations import (
    SMSConversationEntry,
    SMSConversationSummary,
    SMSConversationThread,
    SMSReplyRequest,
    SMSReplyResponse,
)
from app.services.auth_service import get_current_user
from app.services.sms_service import send_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms/conversations", tags=["sms-conversations"])


@router.get("", response_model=list[SMSConversationSummary])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List conversations grouped by phone, most recent first."""
    # Get the latest message per phone number
    subq = (
        select(
            SmsConversation.attendee_phone,
            func.max(SmsConversation.created_at).label("last_message_at"),
            func.count(SmsConversation.id).label("message_count"),
        )
        .group_by(SmsConversation.attendee_phone)
        .subquery()
    )

    # Join to get the latest message body
    result = await db.execute(
        select(SmsConversation, subq.c.message_count)
        .join(
            subq,
            (SmsConversation.attendee_phone == subq.c.attendee_phone)
            & (SmsConversation.created_at == subq.c.last_message_at),
        )
        .order_by(subq.c.last_message_at.desc())
    )
    rows = result.all()

    # Batch-resolve attendee names to avoid N+1 queries
    phones = [row[0].attendee_phone for row in rows]
    phone_to_name: dict[str, str] = {}
    if phones:
        attendee_result = await db.execute(
            select(Attendee.phone, Attendee.first_name, Attendee.last_name)
            .where(Attendee.phone.in_(phones))
        )
        for att in attendee_result:
            phone_to_name[att.phone] = f"{att.first_name} {att.last_name}"

    summaries = []
    for row in rows:
        conv = row[0]
        count = row[1]

        summaries.append(SMSConversationSummary(
            attendee_phone=conv.attendee_phone,
            attendee_name=phone_to_name.get(conv.attendee_phone),
            last_message=conv.body,
            last_message_at=conv.created_at,
            message_count=count,
        ))

    return summaries


@router.get("/{phone}", response_model=SMSConversationThread)
async def get_conversation(
    phone: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get threaded conversation for a specific phone number."""
    result = await db.execute(
        select(SmsConversation)
        .where(SmsConversation.attendee_phone == phone)
        .order_by(SmsConversation.created_at.asc())
    )
    messages = result.scalars().all()

    if not messages:
        raise HTTPException(status_code=404, detail="No conversation found for this phone number")

    # Try to find attendee name
    attendee_result = await db.execute(
        select(Attendee).where(Attendee.phone == phone).limit(1)
    )
    attendee = attendee_result.scalar_one_or_none()
    name = f"{attendee.first_name} {attendee.last_name}" if attendee else None

    entries = [
        SMSConversationEntry(
            id=m.id,
            registration_id=m.registration_id,
            attendee_phone=m.attendee_phone,
            direction=m.direction.value if hasattr(m.direction, "value") else m.direction,
            body=m.body,
            twilio_sid=m.twilio_sid,
            sent_by=m.sent_by,
            created_at=m.created_at,
        )
        for m in messages
    ]

    return SMSConversationThread(
        attendee_phone=phone,
        attendee_name=name,
        messages=entries,
        last_message_at=messages[-1].created_at,
    )


@router.post("/{phone}/reply", response_model=SMSReplyResponse)
async def reply_to_conversation(
    phone: str,
    data: SMSReplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send an SMS reply to an attendee and store in conversation history."""
    success = await send_sms(phone, data.message)

    # Store outbound message in conversation
    conversation = SmsConversation(
        attendee_phone=phone,
        direction=SmsDirection.outbound,
        body=data.message,
        sent_by=current_user.id,
    )

    # Try to link to most recent registration for this phone
    attendee_result = await db.execute(
        select(Attendee).where(Attendee.phone == phone).limit(1)
    )
    attendee = attendee_result.scalar_one_or_none()
    if attendee:
        reg_result = await db.execute(
            select(Registration)
            .where(Registration.attendee_id == attendee.id)
            .order_by(Registration.created_at.desc())
            .limit(1)
        )
        reg = reg_result.scalar_one_or_none()
        if reg:
            conversation.registration_id = reg.id

    db.add(conversation)
    await db.flush()

    if not success:
        logger.warning("Failed to send SMS reply to %s", phone)

    return SMSReplyResponse(
        success=success,
        message_id=conversation.id,
    )
