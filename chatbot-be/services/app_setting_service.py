from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AppSetting
from schemas.common import PaginatedResponse
from schemas.app_setting import (
    AppSetting as AppSettingSchema,
    AppSettingCreate,
    AppSettingUpdate,
)


async def list_app_settings(
    db: AsyncSession,
    page: int,
    limit: int,
    tenant_id: int,
) -> PaginatedResponse[AppSettingSchema]:
    query = (
        select(AppSetting)
        .where(AppSetting.tenant_id == tenant_id)
        .order_by(AppSetting.id.desc())
    )
    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    app_settings = [
        AppSettingSchema.model_validate(setting) for setting in result.scalars().all()
    ]

    total = await db.scalar(
        select(func.count(AppSetting.id)).where(AppSetting.tenant_id == tenant_id)
    )

    return PaginatedResponse[AppSettingSchema].create(
        data=app_settings,
        total=total or 0,
        page=page,
        limit=limit,
    )


async def get_app_setting(
    db: AsyncSession, setting_id: int, tenant_id: int
) -> AppSetting | None:
    result = await db.execute(
        select(AppSetting).where(
            AppSetting.id == setting_id, AppSetting.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def get_app_setting_by_key(
    db: AsyncSession, key: str, tenant_id: int
) -> AppSetting | None:
    result = await db.execute(
        select(AppSetting).where(
            AppSetting.key == key, AppSetting.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def get_app_setting_by_key_value(
    db: AsyncSession, key: str, tenant_id: int
) -> str | None:
    result = await db.execute(
        select(AppSetting).where(
            AppSetting.key == key, AppSetting.tenant_id == tenant_id
        )
    )
    data = result.scalar_one_or_none()
    if data:
        return data.value
    else:
        return None


async def create_app_setting(
    db: AsyncSession,
    payload: AppSettingCreate,
    tenant_id: int,
) -> AppSetting:
    app_setting = AppSetting(key=payload.key, value=payload.value, tenant_id=tenant_id)
    db.add(app_setting)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="App setting with the given key already exists"
        ) from exc

    await db.refresh(app_setting)
    return app_setting


async def update_app_setting(
    db: AsyncSession,
    app_setting: AppSetting,
    payload: AppSettingUpdate,
) -> AppSetting:
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(app_setting, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="App setting with the given key already exists"
        ) from exc

    await db.refresh(app_setting)
    return app_setting


async def delete_app_setting(db: AsyncSession, app_setting: AppSetting) -> None:
    await db.delete(app_setting)
    await db.commit()
