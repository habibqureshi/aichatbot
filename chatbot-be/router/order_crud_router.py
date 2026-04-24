from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from schemas.auth import TokenPayload
from schemas.common import PaginatedResponse
from schemas.order import Order
from services import auth_service, order_crud_service

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

class OrderStatusUpdate(BaseModel):
    status: str


@router.get("/", response_model=PaginatedResponse[Order])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_timezone: str = Query("UTC"),
    status_filter: str | None = Query(None, alias="status"),
    name: str | None = Query(None),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> PaginatedResponse[Order]:
    return await order_crud_service.list_orders(
        db=db,
        page=page,
        limit=limit,
        user_timezone=user_timezone,
        status=status_filter,
        name=name,
        tenant_id=current_user.tenant_id,
    )


@router.get("/{order_id}", response_model=Order)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> Order:
    order = await order_crud_service.get_order_by_id(
        db=db,
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        user_timezone=user_timezone,
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user_timezone: str = Query("UTC"),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
) -> Order:
    try:
        order = await order_crud_service.update_order_status(
            db=db,
            order_id=order_id,
            tenant_id=current_user.tenant_id,
            status=payload.status,
            user_timezone=user_timezone,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
