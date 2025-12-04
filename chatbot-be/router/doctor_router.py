from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.common import PaginatedResponse
from schemas.doctor import Doctor, DoctorCreate, DoctorUpdate
from services import doctor_service

router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])


@router.get("/", response_model=PaginatedResponse[Doctor])
async def list_doctors(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_timezone: str = Query("UTC"),
    specialty_id: int | None = Query(None),
    name_filter: str | None = Query(None, alias="name"),
) -> PaginatedResponse[Doctor]:
    return await doctor_service.list_doctors(
        db=db,
        page=page,
        limit=limit,
        user_timezone=user_timezone,
        specialty_id=specialty_id,
        name_filter=name_filter,
    )


@router.post("/", response_model=Doctor, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    payload: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
) -> Doctor:
    doctor = await doctor_service.create_doctor(db=db, payload=payload)
    return Doctor.model_validate(doctor, context={"timezone": user_timezone})


@router.get("/{doctor_id}", response_model=Doctor)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
) -> Doctor:
    doctor = await doctor_service.get_doctor(db=db, doctor_id=doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return Doctor.model_validate(doctor, context={"timezone": user_timezone})


@router.put("/{doctor_id}", response_model=Doctor)
async def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
) -> Doctor:
    doctor = await doctor_service.get_doctor(db=db, doctor_id=doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor = await doctor_service.update_doctor(db=db, doctor=doctor, payload=payload)
    return Doctor.model_validate(doctor, context={"timezone": user_timezone})


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    doctor = await doctor_service.get_doctor(db=db, doctor_id=doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    await doctor_service.delete_doctor(db=db, doctor=doctor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
