from db.models import Conversation, Patient
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.twilio import TwilioIncoming
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from sqlalchemy.future import select
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from schemas.common import PaginatedResponse
from sqlalchemy import func, or_
from pydantic import HttpUrl
from schemas.conversation import Conversation as ConversationSchema


async def find_or_create(
    data: TwilioIncoming, patient: Patient, db: AsyncSession, tenant_id: int
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.call_sid == data.CallSid, Conversation.tenant_id == tenant_id
        )
    )
    conversation = result.scalars().first()
    if conversation:
        print(f"${data.CallSid} conversation found ${conversation.id}")
        return conversation
    conversation = Conversation(
        call_sid=data.CallSid,
        patient_id=patient.id,
        tenant_id=tenant_id,
    )
    print(f"${data.CallSid} new conversation")

    db.add(conversation)
    try:

        await db.commit()
        await db.refresh(conversation)
        return conversation
    except IntegrityError:
        result = await db.execute(
            select(Conversation).where(
                Conversation.call_sid == data.CallSid,
                Conversation.tenant_id == tenant_id,
            )
        )
        return result.scalars().first()


async def find_by_call_sid(
    call_sid: str, db: AsyncSession, tenant_id: int
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.call_sid == call_sid, Conversation.tenant_id == tenant_id
        )
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
    tenant_id: int,
    limit: int = 10,
    page: int = 1,
    status: str = None,
    q: str = None,
) -> PaginatedResponse[ConversationSchema]:
    offset = (page - 1) * limit
    query = (
        select(Conversation)
        .options(joinedload(Conversation.patient))
        .where(Conversation.tenant_id == tenant_id)
        .order_by(Conversation.started_at.desc())
    )
    if status is not None and status != "all":
        query = query.where(Conversation.status == status)
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(Patient.name.ilike(search), Patient.phone_number.ilike(search)),
        )
    result = await db.execute(query.limit(limit).offset(offset))
    conversations = [
        ConversationSchema.model_validate(c) for c in result.scalars().all()
    ]

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    return PaginatedResponse.create(
        data=conversations,
        total=total,
        page=page,
        limit=limit,
    )


async def update_recording_url(
    call_sid: str, recording_link: HttpUrl, db: AsyncSession, tenant_id: int
):
    conversation = await find_by_call_sid(call_sid, db, tenant_id=tenant_id)
    if conversation is None:
        raise HTTPException(status_code=400, detail={"message": "Call not found"})

    conversation.recording_link = recording_link
    await db.commit()


async def find_by_id(id: int, db: AsyncSession, tenant_id: int) -> Conversation | None:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == id, Conversation.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def needs_human(conversation: Conversation, db: AsyncSession):
    conversation.status = "follow_up_needed"
    conversation.ended_at = datetime.now(timezone.utc)
    conversation.resolved_status = "unsatisfied"
    await db.commit()
    await db.refresh(conversation)
    return conversation
