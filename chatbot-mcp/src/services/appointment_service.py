from src.db.models import Appointment, Patient
from datetime import date, time, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload


async def create_appointment(
    patient: Patient,
    appointment_date: date,
    start_time: time,
    end_time: time,
    call_sid: str,
    db: AsyncSession,
    tenant_id: int,
    doctor_id: int | None = None,
    status: str = "scheduled",
    notes: str | None = None,
):
    appointment = Appointment(
        call_sid=call_sid,
        appointment_date=appointment_date,
        start_time=start_time,
        end_time=end_time,
        patient_id=patient.id,
        doctor_id=doctor_id,
        status=status,
        notes=notes,
        tenant_id=tenant_id,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def find_by_patient_number_and_date(
    patient_number: str,
    appointment_date: date,
    start_time: time,
    duration: timedelta,
    db: AsyncSession,
    tenant_id: int,
) -> Appointment:
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.doctor))
        .join(Patient)
        .filter(
            Patient.phone_number == patient_number,
            Appointment.appointment_date == appointment_date,
            Appointment.start_time == start_time,
            Appointment.end_time == (start_time + duration),
            Appointment.tenant_id == tenant_id,
        )
        .limit(1)
    )
    return result.scalars().first()
