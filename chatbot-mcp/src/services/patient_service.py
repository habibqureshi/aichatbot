from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Patient
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError


async def find_or_create(phone_number: str, db: AsyncSession) -> Patient:
    result = await db.execute(
        select(Patient).where(Patient.phone_number == phone_number)
    )
    patient = result.scalars().first()
    if patient:
        return patient
    patient = Patient(phone_number=phone_number)
    db.add(patient)
    try:
        await db.commit()
        return await db.refresh(patient)
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(Patient).where(Patient.phone_number == phone_number)
        )
        return result.scalars().first()


async def update(patient: Patient, db: AsyncSession):
    await db.commit()
    await db.refresh(patient)
    return patient
