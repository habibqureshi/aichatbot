from sqlalchemy import delete, func
from db.models import Knowledge, ActiveKnowledge
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from schemas.knowledge import Knowledge as KnowledgeSchema
from schemas.common import PaginatedResponse


async def create(name: str, blob_name: str, db: AsyncSession):
    knowledge = Knowledge(name=name, blob_name=blob_name)
    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)
    return knowledge


async def get(
    db: AsyncSession, page: int = 1, limit: int = 10
) -> PaginatedResponse[KnowledgeSchema]:
    result = await db.execute(
        select(Knowledge, (ActiveKnowledge.id.isnot(None)).label("is_active"))
        .outerjoin(ActiveKnowledge, Knowledge.id == ActiveKnowledge.knowledge_id)
        .order_by(Knowledge.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    total_result = await db.scalar(
        select(func.count(Knowledge.id)).select_from(Knowledge)
    )
    knowledges_with_status = result.all()
    knowledges = [
        KnowledgeSchema.model_validate(result).model_copy(
            update={"is_active": is_active}
        )
        for result, is_active in knowledges_with_status
    ]

    return PaginatedResponse.create(
        data=knowledges, total=total_result, page=page, limit=limit
    )


async def activate_knowledge(db: AsyncSession, knowledge_id: int):
    active = (await db.execute(select(ActiveKnowledge))).scalar_one_or_none()
    if not active:
        active = ActiveKnowledge(knowledge_id=knowledge_id)
        db.add(active)
    else:
        active.knowledge_id = knowledge_id
    await db.commit()
    await db.refresh(active)
    return active


async def get_active_knowledge(db: AsyncSession) -> Knowledge | None:
    active = (
        await db.execute(
            select(Knowledge)
            .join(ActiveKnowledge)
            .where(ActiveKnowledge.knowledge_id == Knowledge.id)
        )
    ).first()
    if not active:
        return None
    return active
