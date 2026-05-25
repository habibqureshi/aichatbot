from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from db.models import Appointment as AppointmentModel
from schemas.appointment import (
    Appointment as AppointmentSchema,
)
from schemas.common import PaginatedResponse


async def list_appointments(
    db: AsyncSession,
    page: int,
    limit: int,
    tenant_id: int,
    user_timezone: str,
    doctor_id: int | None = None,
    patient_id: int | None = None,
    status: str | None = None,
) -> PaginatedResponse[AppointmentSchema]:
    query = (
        select(AppointmentModel)
        .options(
            joinedload(AppointmentModel.customer),
            joinedload(AppointmentModel.doctor),
        )
        .where(AppointmentModel.tenant_id == tenant_id)
        .order_by(AppointmentModel.appointment_date.desc())
    )
    count_query = select(func.count(AppointmentModel.id)).where(
        AppointmentModel.tenant_id == tenant_id
    )

    if doctor_id is not None:
        query = query.where(AppointmentModel.doctor_id == doctor_id)
        count_query = count_query.where(AppointmentModel.doctor_id == doctor_id)

    if patient_id is not None:
        query = query.where(AppointmentModel.customer_id == patient_id)
        count_query = count_query.where(AppointmentModel.customer_id == patient_id)

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
