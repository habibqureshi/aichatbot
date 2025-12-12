from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

# from db.models import Specialty
from schemas.common import PaginatedResponse
from schemas.speciality import (
    Speciality as SpecialitySchema,
)


async def list_specialities(
    db: AsyncSession,
    page: int,
    limit: int,
    user_timezone: str,
):
    # query = select(Specialty).order_by(Specialty.created_at.desc())
    # result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    # specialities = [
    #     SpecialitySchema.model_validate(speciality, context={"timezone": user_timezone})
    #     for speciality in result.scalars().all()
    # ]

    # total = await db.scalar(select(func.count(Specialty.id)))
    specialities = [
        "Cardiology",
        " Neurology",
        " Dermatology",
        " Gastroenterology",
        " Orthopedic Surgery",
        " Pediatrics",
        " Obstetrics & Gynecology (OB/GYN)",
        " Endocrinology",
        " Pulmonology",
        " Nephrology",
        " Psychiatry",
        " Rheumatology",
        " Oncology",
        " Urology",
        " Radiology",
        " Emergency Medicine",
        " Family Medicine",
        " General Surgery",
        " Ophthalmology",
        " Otolaryngology (ENT)",
        " Infectious Disease",
        " Hematology",
        " Plastic & Reconstructive Surgery",
        " Anesthesiology",
        " Geriatrics",
    ]

    return {"data": specialities}


# async def get_speciality(db: AsyncSession, speciality_id: int) -> Specialty | None:
#     result = await db.execute(select(Specialty).where(Specialty.id == speciality_id))
#     return result.scalar_one_or_none()


# async def create_speciality(
#     db: AsyncSession,
#     payload: SpecialityCreate,
# ) -> Specialty:
#     speciality = Specialty(name=payload.name, description=payload.description)
#     db.add(speciality)

#     try:
#         await db.commit()
#     except IntegrityError as exc:
#         await db.rollback()
#         raise HTTPException(
#             status_code=409, detail="Speciality with the given name already exists"
#         ) from exc

#     await db.refresh(speciality)
#     return speciality


# async def update_speciality(
#     db: AsyncSession,
#     speciality: Specialty,
#     payload: SpecialityUpdate,
# ) -> Specialty:
#     update_data = payload.model_dump(exclude_unset=True)

#     for field, value in update_data.items():
#         setattr(speciality, field, value)

#     try:
#         await db.commit()
#     except IntegrityError as exc:
#         await db.rollback()
#         raise HTTPException(
#             status_code=409, detail="Speciality with the given name already exists"
#         ) from exc

#     await db.refresh(speciality)
#     return speciality


# async def delete_speciality(db: AsyncSession, speciality: Specialty) -> None:
#     await db.delete(speciality)
#     await db.commit()
