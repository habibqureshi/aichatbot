from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.common import PaginatedResponse
from schemas.restaurant import (
    RestaurantTable,
    RestaurantTableCreate,
    RestaurantTableUpdate,
    Reservation,
    RestaurantSetting,
    RestaurantSettingCreate,
)
from services import restaurant_service, auth_service

router = APIRouter(prefix="/api/v1/restaurant", tags=["restaurant"])


@router.get("/tables", response_model=PaginatedResponse[RestaurantTable])
async def list_tables(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    return await restaurant_service.list_tables(db=db, page=page, limit=limit)


@router.post(
    "/tables", response_model=RestaurantTable, status_code=status.HTTP_201_CREATED
)
async def create_table(
    payload: RestaurantTableCreate,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    table = await restaurant_service.create_table(db=db, payload=payload)
    return RestaurantTable.model_validate(table, context={"timezone": user_timezone})


@router.get("/tables/{table_id}", response_model=RestaurantTable)
async def get_table(
    table_id: int, db: AsyncSession = Depends(get_db), user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    table = await restaurant_service.get_table(db=db, table_id=table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return RestaurantTable.model_validate(table, context={"timezone": user_timezone})


@router.put("/tables/{table_id}", response_model=RestaurantTable)
async def update_table(
    table_id: int,
    payload: RestaurantTableUpdate,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    table = await restaurant_service.get_table(db=db, table_id=table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    table = await restaurant_service.update_table(db=db, table=table, payload=payload)
    return RestaurantTable.model_validate(table, context={"timezone": user_timezone})


@router.delete("/tables/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),) -> Response:
    table = await restaurant_service.get_table(db=db, table_id=table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    await restaurant_service.delete_table(db=db, table=table)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/reservations", response_model=PaginatedResponse[Reservation])
async def list_reservations(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    customer_id: int | None = Query(None),
    status: str | None = Query(None),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    return await restaurant_service.list_reservations(
        db=db, page=page, limit=limit, customer_id=customer_id, status=status
    )


@router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
    current_user=Depends(auth_service.get_current_user),
):
    reservation = await restaurant_service.get_reservation(
        db=db, reservation_id=reservation_id
    )
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return Reservation.model_validate(reservation, context={"timezone": user_timezone})


@router.get("/settings", response_model=list[RestaurantSetting])
async def list_settings(db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),) -> list[RestaurantSetting]:
    return await restaurant_service.list_settings(db=db)


@router.get("/settings/{key}", response_model=RestaurantSetting)
async def get_setting(
    key: str, db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
) -> RestaurantSetting:
    setting = await restaurant_service.get_setting_by_key(db=db, key=key)
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return RestaurantSetting.model_validate(setting)


@router.post(
    "/settings", response_model=RestaurantSetting, status_code=status.HTTP_201_CREATED
)
async def create_setting(
    payload: RestaurantSettingCreate, db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
) -> RestaurantSetting:
    setting = await restaurant_service.create_or_update_setting(db=db, payload=payload)
    return RestaurantSetting.model_validate(setting)
