from sqlalchemy import delete, func
from db.models import Knowledge, ActiveKnowledge
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from schemas.knowledge import Knowledge as KnowledgeSchema
from schemas.common import PaginatedResponse
from rag.indexing.store import collection
from fastapi import HTTPException


async def create(name: str, blob_name: str, db: AsyncSession, tenant_id: int):
    knowledge = Knowledge(name=name, blob_name=blob_name, tenant_id=tenant_id)
    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)
    return knowledge


async def get(
    db: AsyncSession, tenant_id: int, page: int = 1, limit: int = 10
) -> PaginatedResponse[KnowledgeSchema]:
    result = await db.execute(
        select(Knowledge)
        .where(Knowledge.tenant_id == tenant_id)
        .order_by(Knowledge.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    total_result = await db.scalar(
        select(func.count(Knowledge.id))
        .select_from(Knowledge)
        .where(Knowledge.tenant_id == tenant_id)
    )
    knowledges_with_status = result.scalars().all()
    knowledges = [
        KnowledgeSchema.model_validate(result) for result in knowledges_with_status
    ]

    return PaginatedResponse.create(
        data=knowledges, total=total_result, page=page, limit=limit
    )


async def delete_knowledge(knowledge_id: int, db: AsyncSession):
    knowledge = await db.get(Knowledge, knowledge_id)
    if not knowledge:
        raise HTTPException(status_code=400, detail="Knowledge not found.")
    collection.delete(where={"source": knowledge.blob_name})
    await db.delete(knowledge)
    await db.commit()
    return {"message": "Deleted successfully!"}
