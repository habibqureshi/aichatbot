from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from db.db import get_db
from schemas.auth import TokenPayload
from services import conversation_service, message_service, auth_service
from schemas.common import PaginatedResponse
from schemas.conversation import Conversation
from schemas.message import Message

router = APIRouter(
    prefix="/api/v1/conversation",  # Prefix for all conversation-related routes
    tags=["conversation_management"],  # Tag for grouping these routes in the docs
)


@router.get("/", response_model=PaginatedResponse[Conversation])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    limit: int = Query(10, le=100),
    user_timezone: str = Query("UTC"),
    status: Literal["all", "active", "ended", "follow_up_needed"] = Query(
        None, description="Filter by conversation status"
    ),
    q: str | None = Query(None, description="Search query to filter conversations"),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> PaginatedResponse[Conversation]:
    return await conversation_service.get_all_conversations(
        db=db,
        limit=limit,
        page=page,
        status=status,
        q=q,
        tenant_id=current_user.tenant_id,
    )


@router.get("/{conversation_id}/messages", response_model=PaginatedResponse[Message])
async def get_conversation(
    conversation_id: int,
    limit: int = Query(10, le=100),
    page: int = Query(1),
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
):
    return await message_service.get_messages_by_conversation_id(
        db=db,
        conversation_id=conversation_id,
        limit=limit,
        page=page,
        tenant_id=current_user.tenant_id,
    )
