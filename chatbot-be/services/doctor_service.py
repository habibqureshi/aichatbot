from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from db.models import Availability as AvailabilityModel, Doctor
from schemas.availability import AvailabilitySlotCreate
from schemas.common import PaginatedResponse
from schemas.doctor import Doctor as DoctorSchema, DoctorCreate, DoctorUpdate


def _validate_time_range(slot: AvailabilitySlotCreate) -> None:
    if slot.start_time >= slot.end_time:
        raise HTTPException(
            status_code=400, detail="start_time must be earlier than end_time"
        )


async def _apply_availabilities(
    db: AsyncSession,
    doctor_id: int,
    slots: list[AvailabilitySlotCreate],
    tenant_id: int,
) -> None:
    print(slots)
    await db.execute(
        delete(AvailabilityModel).where(
            AvailabilityModel.doctor_id == doctor_id,
        )
    )
    availabilities = []
    for slot in slots:
        _validate_time_range(slot)
        availabilities.append(
            AvailabilityModel(
                doctor_id=doctor_id,
                start_time=slot.start_time,
                end_time=slot.end_time,
                day_of_week=slot.day_of_week,
            )
        )
    if availabilities:
        db.add_all(availabilities)


async def list_doctors(
    db: AsyncSession,
    page: int,
    limit: int,
    user_timezone: str,
    tenant_id: int,
    specialty: str | None = None,
    name_filter: str | None = None,
) -> PaginatedResponse[DoctorSchema]:
    query = (
        select(Doctor)
        .where(Doctor.tenant_id == tenant_id)
        .options(joinedload(Doctor.availabilities))
        .order_by(Doctor.created_at.desc())
    )
    count_query = select(func.count(Doctor.id)).where(Doctor.tenant_id == tenant_id)
    if specialty is not None:
        query = query.where(Doctor.specialty == specialty)
        count_query = count_query.where(Doctor.specialty == specialty)
    if name_filter is not None:
        query = query.where(Doctor.name.ilike(f"%{name_filter}%"))
        count_query = count_query.where(Doctor.name.ilike(f"%{name_filter}%"))
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    doctors = [
        DoctorSchema.model_validate(doctor, context={"timezone": user_timezone})
        for doctor in result.scalars().unique().all()
    ]

    total = await db.scalar(count_query)

    return PaginatedResponse[DoctorSchema].create(
        data=doctors,
        total=total or 0,
        page=page,
        limit=limit,
    )


async def get_doctor(db: AsyncSession, doctor_id: int, tenant_id: int) -> Doctor | None:
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.availabilities))
        .where(Doctor.id == doctor_id, Doctor.tenant_id == tenant_id)
    )
    return result.unique().scalar_one_or_none()


async def create_doctor(
    db: AsyncSession, payload: DoctorCreate, tenant_id: int
) -> Doctor:
    doctor = Doctor(
        name=payload.name,
        specialty=payload.specialty,
        phone_number=payload.phone_number,
        tenant_id=tenant_id,
    )
    db.add(doctor)

    try:
        await db.flush()
        if payload.availabilities:
            await _apply_availabilities(
                db, doctor.id, payload.availabilities, tenant_id
            )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Doctor with the given phone number already exists"
        ) from exc

    return await get_doctor(db, doctor.id)


async def update_doctor(
    db: AsyncSession,
    doctor: Doctor,
    payload: DoctorUpdate,
) -> Doctor:
    update_data = payload.model_dump(exclude_unset=True)
    availabilities = update_data.pop("availabilities", None)

    # no foreign-key validation required; specialty is a simple string

    for field, value in update_data.items():
        setattr(doctor, field, value)

    try:
        await db.flush()
        if availabilities is not None:
            await _apply_availabilities(db, doctor.id, payload.availabilities)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Doctor with the given phone number already exists"
        ) from exc

    return await get_doctor(db, doctor.id)


async def delete_doctor(db: AsyncSession, doctor: Doctor) -> None:
    await db.execute(
        delete(AvailabilityModel).where(AvailabilityModel.doctor_id == doctor.id)
    )
    await db.delete(doctor)
    await db.commit()
