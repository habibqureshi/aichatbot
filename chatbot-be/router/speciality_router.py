from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.common import PaginatedResponse
from schemas.speciality import Speciality, SpecialityCreate, SpecialityUpdate
from services import speciality_service, auth_service

router = APIRouter(prefix="/api/v1/specialities", tags=["specialities"])


@router.get("/")
async def list_specialities(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    return await speciality_service.list_specialities(
        db=db, page=page, limit=limit, user_timezone=user_timezone
    )
