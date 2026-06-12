from sqlalchemy.ext.asyncio import AsyncSession

from services import app_setting_service
from services.voice.constants import DEFAULT_ORDER_GREETING, ORDER_GREETING_KEY

_ORDER_GREETING_CACHE: dict[int, str] = {}


async def get_cached_order_greeting(db: AsyncSession, tenant_id: int) -> str:
    cached = _ORDER_GREETING_CACHE.get(tenant_id)
    if cached is not None:
        return cached

    greeting_setting = await app_setting_service.get_app_setting_by_key(
        db=db,
        key=ORDER_GREETING_KEY,
        tenant_id=tenant_id,
    )
    greeting = (
        greeting_setting.value.strip()
        if greeting_setting
        and greeting_setting.value
        and greeting_setting.value.strip()
        else DEFAULT_ORDER_GREETING
    )
    _ORDER_GREETING_CACHE[tenant_id] = greeting
    return greeting


async def build_order_greeting_message(
    db: AsyncSession,
    tenant_id: int,
    customer_name: str | None,
) -> str:
    greeting = await get_cached_order_greeting(db=db, tenant_id=tenant_id)
    if customer_name and customer_name.strip():
        return f"Hi {customer_name.strip()}, {greeting}"
    return f"Hi, {greeting} Before we begin, may I have your name?"
