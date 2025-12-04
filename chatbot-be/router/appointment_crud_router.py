from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.appointment import Appointment, AppointmentCreate, AppointmentUpdate
from schemas.common import PaginatedResponse
from services import appointment_crud_service

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


@router.get("/", response_model=PaginatedResponse[Appointment])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_timezone: str = Query("UTC"),
    doctor_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
) -> PaginatedResponse[Appointment]:
    return await appointment_crud_service.list_appointments(
        db=db,
        page=page,
        limit=limit,
        user_timezone=user_timezone,
        doctor_id=doctor_id,
        status=status_filter,
    )
