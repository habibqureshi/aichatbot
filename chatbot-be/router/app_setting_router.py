from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.auth import TokenPayload
from schemas.common import PaginatedResponse
from schemas.app_setting import AppSetting, AppSettingCreate, AppSettingUpdate
from services import app_setting_service, auth_service
from utils.tenant_context import TenantContext, get_tenant_context

router = APIRouter(prefix="/api/v1/app-settings", tags=["app-settings"])


@router.get("/", response_model=PaginatedResponse[AppSetting])
async def list_app_settings(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> PaginatedResponse[AppSetting]:
    return await app_setting_service.list_app_settings(
        db=db, page=page, limit=limit, tenant_id=current_user.tenant_id
    )


@router.post("/", response_model=AppSetting, status_code=status.HTTP_201_CREATED)
async def create_app_setting(
    payload: AppSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> AppSetting:
    app_setting = await app_setting_service.create_app_setting(
        db=db, payload=payload, tenant_id=current_user.tenant_id
    )
    return AppSetting.model_validate(app_setting)


@router.get("/{setting_id}", response_model=AppSetting)
async def get_app_setting(
    setting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> AppSetting:
    app_setting = await app_setting_service.get_app_setting(
        db=db, setting_id=setting_id, tenant_id=current_user.tenant_id
    )
    if app_setting is None:
        raise HTTPException(status_code=404, detail="App setting not found")
    return AppSetting.model_validate(app_setting)


@router.get("/key/{key}", response_model=AppSetting)
async def get_app_setting_by_key(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> AppSetting:
    app_setting = await app_setting_service.get_app_setting_by_key(
        db=db, key=key, tenant_id=current_user.tenant_id
    )
    if app_setting is None:
        raise HTTPException(
            status_code=404, detail="App setting with given key not found"
        )
    return AppSetting.model_validate(app_setting)


@router.put("/{setting_id}", response_model=AppSetting)
async def update_app_setting(
    setting_id: int,
    payload: AppSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> AppSetting:
    app_setting = await app_setting_service.get_app_setting(
        db=db, setting_id=setting_id, tenant_id=current_user.tenant_id
    )
    if app_setting is None:
        raise HTTPException(status_code=404, detail="App setting not found")

    app_setting = await app_setting_service.update_app_setting(
        db=db, app_setting=app_setting, payload=payload
    )
    return AppSetting.model_validate(app_setting)


@router.delete("/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app_setting(
    setting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> Response:
    app_setting = await app_setting_service.get_app_setting(
        db=db, setting_id=setting_id, tenant_id=current_user.tenant_id
    )
    if app_setting is None:
        raise HTTPException(status_code=404, detail="App setting not found")

    await app_setting_service.delete_app_setting(db=db, app_setting=app_setting)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
