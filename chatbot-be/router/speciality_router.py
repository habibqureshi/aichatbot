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


# @router.post("/", response_model=Speciality, status_code=status.HTTP_201_CREATED)
# async def create_speciality(
#     payload: SpecialityCreate,
#     db: AsyncSession = Depends(get_db),
#     user_timezone: str = Query("UTC"),
# ) -> Speciality:
#     speciality = await speciality_service.create_speciality(db=db, payload=payload)
#     return Speciality.model_validate(speciality, context={"timezone": user_timezone})


# @router.get("/{speciality_id}", response_model=Speciality)
# async def get_speciality(
#     speciality_id: int,
#     db: AsyncSession = Depends(get_db),
#     user_timezone: str = Query("UTC"),
# ) -> Speciality:
#     speciality = await speciality_service.get_speciality(
#         db=db, speciality_id=speciality_id
#     )
#     if speciality is None:
#         raise HTTPException(status_code=404, detail="Speciality not found")
#     return Speciality.model_validate(speciality, context={"timezone": user_timezone})


# @router.put("/{speciality_id}", response_model=Speciality)
# async def update_speciality(
#     speciality_id: int,
#     payload: SpecialityUpdate,
#     db: AsyncSession = Depends(get_db),
#     user_timezone: str = Query("UTC"),
# ) -> Speciality:
#     speciality = await speciality_service.get_speciality(
#         db=db, speciality_id=speciality_id
#     )
#     if speciality is None:
#         raise HTTPException(status_code=404, detail="Speciality not found")

#     speciality = await speciality_service.update_speciality(
#         db=db, speciality=speciality, payload=payload
#     )
#     return Speciality.model_validate(speciality, context={"timezone": user_timezone})


# @router.delete("/{speciality_id}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_speciality(
#     speciality_id: int,
#     db: AsyncSession = Depends(get_db),
# ) -> Response:
#     speciality = await speciality_service.get_speciality(
#         db=db, speciality_id=speciality_id
#     )
#     if speciality is None:
#         raise HTTPException(status_code=404, detail="Speciality not found")

#     await speciality_service.delete_speciality(db=db, speciality=speciality)
#     return Response(status_code=status.HTTP_204_NO_CONTENT)
