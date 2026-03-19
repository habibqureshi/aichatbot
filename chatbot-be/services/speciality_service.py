from sqlalchemy.ext.asyncio import AsyncSession


async def list_specialities(
    db: AsyncSession,
    page: int,
    limit: int,
    user_timezone: str,
):
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
