from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    RestaurantTable as RestaurantTableModel,
    Reservation as ReservationModel,
    RestaurantSetting as RestaurantSettingModel,
    Patient as PatientModel,
)
from schemas.common import PaginatedResponse
from schemas.restaurant import (
    RestaurantTable as RestaurantTableSchema,
    RestaurantTableCreate,
    RestaurantTableUpdate,
    Reservation as ReservationSchema,
    ReservationCreate,
    ReservationUpdate,
    RestaurantSetting as RestaurantSettingSchema,
    RestaurantSettingCreate,
    RestaurantSettingUpdate,
)


async def list_tables(db: AsyncSession, page: int, limit: int, tenant_id: int):
    query = (
        select(RestaurantTableModel)
        .where(RestaurantTableModel.tenant_id == tenant_id)
        .order_by(RestaurantTableModel.created_at.desc())
    )
    count_query = select(func.count(RestaurantTableModel.id)).where(
        RestaurantTableModel.tenant_id == tenant_id
    )

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    tables = [
        RestaurantTableSchema.model_validate(t) for t in result.scalars().unique().all()
    ]

    total = await db.scalar(count_query)

    return PaginatedResponse[RestaurantTableSchema].create(
        data=tables, total=total or 0, page=page, limit=limit
    )


async def get_table(
    db: AsyncSession, table_id: int, tenant_id: int
) -> RestaurantTableModel | None:
    result = await db.execute(
        select(RestaurantTableModel).where(
            RestaurantTableModel.id == table_id,
            RestaurantTableModel.tenant_id == tenant_id,
        )
    )
    return result.unique().scalar_one_or_none()


async def create_table(
    db: AsyncSession, payload: RestaurantTableCreate, tenant_id: int
) -> RestaurantTableModel:
    table = RestaurantTableModel(
        capacity=payload.capacity,
        table_number=payload.table_number,
        location=payload.location,
        is_active=payload.is_active,
        tenant_id=tenant_id,
    )
    db.add(table)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Table could not be created"
        ) from exc

    return await get_table(db, table.id)


async def update_table(
    db: AsyncSession, table: RestaurantTableModel, payload: RestaurantTableUpdate
) -> RestaurantTableModel:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(table, field, value)
    await db.flush()
    await db.commit()
    return await get_table(db, table.id)


async def delete_table(db: AsyncSession, table: RestaurantTableModel) -> None:
    await db.delete(table)
    await db.commit()


async def list_reservations(
    db: AsyncSession,
    page: int,
    limit: int,
    tenant_id: int,
    customer_id: int | None = None,
    status: str | None = None,
):
    query = (
        select(ReservationModel)
        .where(ReservationModel.tenant_id == tenant_id)
        .order_by(ReservationModel.created_at.desc())
    )
    count_query = select(func.count(ReservationModel.id)).where(
        ReservationModel.tenant_id == tenant_id
    )

    if customer_id is not None:
        query = query.where(ReservationModel.customer_id == customer_id)
        count_query = count_query.where(ReservationModel.customer_id == customer_id)
    if status is not None:
        query = query.where(ReservationModel.status == status)
        count_query = count_query.where(ReservationModel.status == status)

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    reservations = [
        ReservationSchema.model_validate(r) for r in result.scalars().unique().all()
    ]

    total = await db.scalar(count_query)

    return PaginatedResponse[ReservationSchema].create(
        data=reservations, total=total or 0, page=page, limit=limit
    )


async def get_reservation(
    db: AsyncSession, reservation_id: int
) -> ReservationModel | None:
    result = await db.execute(
        select(ReservationModel).where(ReservationModel.id == reservation_id)
    )
    return result.unique().scalar_one_or_none()


async def list_settings(db: AsyncSession, tenant_id: int):
    result = await db.execute(
        select(RestaurantSettingModel)
        .where(RestaurantSettingModel.tenant_id == tenant_id)
        .order_by(RestaurantSettingModel.id.asc())
    )
    return [RestaurantSettingSchema.model_validate(s) for s in result.scalars().all()]


async def get_setting_by_key(
    db: AsyncSession, key: str, tenant_id: int
) -> RestaurantSettingModel | None:
    result = await db.execute(
        select(RestaurantSettingModel).where(RestaurantSettingModel.key == key)
    )
    return result.unique().scalar_one_or_none()


async def create_or_update_setting(
    db: AsyncSession,
    payload: RestaurantSettingCreate | RestaurantSettingUpdate,
    tenant_id: int,
) -> RestaurantSettingModel:
    existing = (
        await get_setting_by_key(db, payload.key, tenant_id)
        if hasattr(payload, "key")
        else None
    )

    if existing:
        # update
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        await db.flush()
        await db.commit()
        return existing

    setting = RestaurantSettingModel(
        key=payload.key,
        value=payload.value,
        tenant_id=tenant_id,
        description=getattr(payload, "description", None),
    )
    db.add(setting)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Setting could not be created"
        ) from exc

    return setting
