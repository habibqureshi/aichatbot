from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from db.models import Appointment as AppointmentModel, Doctor, Patient
from schemas.appointment import (
    Appointment as AppointmentSchema,
    AppointmentCreate,
    AppointmentUpdate,
)
from schemas.common import PaginatedResponse


async def list_appointments(
    db: AsyncSession,
    page: int,
    limit: int,
    user_timezone: str,
    doctor_id: int | None = None,
    patient_id: int | None = None,
    status: str | None = None,
) -> PaginatedResponse[AppointmentSchema]:
    query = (
        select(AppointmentModel)
        .options(
            joinedload(AppointmentModel.patient),
            joinedload(AppointmentModel.doctor),
        )
        .order_by(AppointmentModel.appointment_date.desc())
    )
    count_query = select(func.count(AppointmentModel.id))

    if doctor_id is not None:
        query = query.where(AppointmentModel.doctor_id == doctor_id)
        count_query = count_query.where(AppointmentModel.doctor_id == doctor_id)

    if patient_id is not None:
        query = query.where(AppointmentModel.patient_id == patient_id)
        count_query = count_query.where(AppointmentModel.patient_id == patient_id)

    if status is not None:
        query = query.where(AppointmentModel.status == status)
        count_query = count_query.where(AppointmentModel.status == status)

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    appointments = [
        AppointmentSchema.model_validate(
            appointment, context={"timezone": user_timezone}
        )
        for appointment in result.scalars().all()
    ]

    total = await db.scalar(count_query)

    return PaginatedResponse[AppointmentSchema].create(
        data=appointments,
        total=total or 0,
        page=page,
        limit=limit,
    )
