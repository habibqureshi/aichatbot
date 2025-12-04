from sqlalchemy import desc, func
from db.models import Conversation, Message
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy.future import select
from schemas.common import PaginatedResponse
from schemas.message import Message as MessageSchema


async def create(
    conversation: Conversation, content: str, role: str, db: AsyncSession
) -> Message:
    message = Message(conversation_id=conversation.id, role=role, content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def load_messages_by_conversation(
    conversation: Conversation, db: AsyncSession
) -> List[Message]:
    result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.timestamp)
    )
    return result.scalars().all()


async def get_messages_by_conversation_id(
    conversation_id: int, db: AsyncSession, limit: int = 10, page: int = 1
) -> PaginatedResponse[MessageSchema]:
    result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation_id)
        .offset((page - 1) * limit)
        .limit(limit)
        .order_by(desc(Message.timestamp))
    )
    messages = result.scalars().all()
    total = await db.scalar(
        select(func.count()).filter(Message.conversation_id == conversation_id)
    )
    return PaginatedResponse.create(
        data=[MessageSchema.model_validate(msg) for msg in messages],
        total=total,
        page=page,
        limit=limit,
    )
