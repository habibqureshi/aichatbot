from db.models import Conversation, Patient
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.twilio import TwilioIncoming
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from sqlalchemy.future import select
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from schemas.common import PaginatedResponse
from sqlalchemy import func
from pydantic import HttpUrl
from schemas.conversation import Conversation as ConversationSchema


async def find_or_create(
    data: TwilioIncoming, patient: Patient, db: AsyncSession
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(Conversation.call_sid == data.CallSid)
    )
    conversation = result.scalars().first()
    if conversation:
        return conversation
    conversation = Conversation(
        call_sid=data.CallSid,
        patient_id=patient.id,
    )
    db.add(conversation)
    try:

        await db.commit()
        await db.refresh(conversation)
        return conversation
    except IntegrityError:
        result = await db.execute(
            select(Conversation).where(Conversation.call_sid == data.CallSid)
        )
        return result.scalars().first()


async def find_by_call_sid(call_sid: str, db: AsyncSession) -> Conversation:
    result = await db.execute(
        select(Conversation).where(Conversation.call_sid == call_sid)
    )
    return result.scalar_one_or_none()


async def end(conversation: Conversation, db: AsyncSession) -> Conversation:
    conversation.status = "ended"
    conversation.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def get_all_conversations(
    db: AsyncSession,
    limit: int = 10,
    page: int = 1,
    user_timezone: str = "UTC",
    status: str = None,
) -> PaginatedResponse[ConversationSchema]:
    offset = (page - 1) * limit
    query = (
        select(Conversation)
        .options(joinedload(Conversation.patient))
        .order_by(Conversation.started_at.desc())
    )
    if status is not None and status != "all":
        query = query.where(Conversation.status == status)
    result = await db.execute(query.limit(limit).offset(offset))
    conversations = [
        ConversationSchema.model_validate(c, context={"timezone": user_timezone})
        for c in result.scalars().all()
    ]

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    return PaginatedResponse.create(
        data=conversations,
        total=total,
        page=page,
        limit=limit,
    )


async def update_recording_url(
    call_sid: str, recording_link: HttpUrl, db: AsyncSession
):
    conversation = await find_by_call_sid(call_sid, db)
    if conversation is None:
        raise HTTPException(status_code=400, detail={"message": "Call not found"})

    conversation.recording_link = recording_link
    await db.commit()


async def find_by_id(id: int, db: AsyncSession) -> Conversation | None:
    result = await db.execute(select(Conversation).where(Conversation.id == id))
    return result.scalar_one_or_none()


async def needs_human(conversation: Conversation, db: AsyncSession):
    conversation.status = "follow_up_needed"
    conversation.ended_at = datetime.now(timezone.utc)
    conversation.resolved_status = "unsatisfied"
    await db.commit()
    await db.refresh(conversation)
    return conversation
