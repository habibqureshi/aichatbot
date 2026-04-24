from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from db.models import Customer as CustomerModel
from db.models import Order as OrderModel
from schemas.common import PaginatedResponse
from schemas.order import Order as OrderSchema


async def list_orders(
    db: AsyncSession,
    page: int,
    limit: int,
    tenant_id: int,
    user_timezone: str,
    status: str | None = None,
    name: str | None = None,
) -> PaginatedResponse[OrderSchema]:
    query = (
        select(OrderModel)
        .options(
            joinedload(OrderModel.customer),
            selectinload(OrderModel.items),
        )
        .where(OrderModel.tenant_id == tenant_id)
        .order_by(OrderModel.created_at.desc(), OrderModel.id.desc())
    )
    count_query = select(func.count(OrderModel.id)).where(OrderModel.tenant_id == tenant_id)

    if status and status.strip():
        normalized_status = status.strip()
        query = query.where(OrderModel.status == normalized_status)
        count_query = count_query.where(OrderModel.status == normalized_status)

    if name and name.strip():
        term = f"%{name.strip()}%"
        query = query.join(CustomerModel, CustomerModel.id == OrderModel.customer_id)
        count_query = count_query.join(CustomerModel, CustomerModel.id == OrderModel.customer_id)
        query = query.where(
            or_(
                CustomerModel.name.ilike(term),
                CustomerModel.phone_number.ilike(term),
            )
        )
        count_query = count_query.where(
            or_(
                CustomerModel.name.ilike(term),
                CustomerModel.phone_number.ilike(term),
            )
        )

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    orders = [
        OrderSchema.model_validate(order, context={"timezone": user_timezone})
        for order in result.scalars().unique().all()
    ]

    total = await db.scalar(count_query)
    return PaginatedResponse[OrderSchema].create(
        data=orders,
        total=total or 0,
        page=page,
        limit=limit,
    )


async def get_order_by_id(
    db: AsyncSession,
    *,
    order_id: int,
    tenant_id: int,
    user_timezone: str,
) -> OrderSchema | None:
    result = await db.execute(
        select(OrderModel)
        .options(
            joinedload(OrderModel.customer),
            selectinload(OrderModel.items),
        )
        .where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id,
        )
        .limit(1)
    )
    order = result.scalars().unique().first()
    if not order:
        return None
    return OrderSchema.model_validate(order, context={"timezone": user_timezone})
