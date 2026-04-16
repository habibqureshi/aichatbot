"""
Local DB service functions for order tools (replaces MCP order_service).
Mirrors the logic from chatbot-mcp/src/services/order_service.py so the
LangChain tools in chatbot-be can work without an MCP round-trip.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import Customer, Menu, Order, OrderItem

MENU_CACHE_TTL_SECONDS = 300
_MENU_CACHE: dict[int, tuple[datetime, list[Menu]]] = {}


async def get_or_create_customer(
    db: AsyncSession,
    *,
    tenant_id: int,
    phone_number: str | None,
    display_name: str | None,
) -> Customer:
    phone = (
        phone_number.strip()
        if phone_number and str(phone_number).strip() and phone_number != "invalid"
        else None
    )
    name = display_name.strip() if display_name and str(display_name).strip() else None

    if phone:
        existing = await db.execute(
            select(Customer)
            .where(Customer.tenant_id == tenant_id, Customer.phone_number == phone)
            .limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            if name and not (customer.name and str(customer.name).strip()):
                customer.name = name
                await db.flush()
            return customer
        customer = Customer(tenant_id=tenant_id, phone_number=phone, name=name)
        db.add(customer)
        await db.flush()
        return customer

    if name:
        existing = await db.execute(
            select(Customer)
            .where(
                Customer.tenant_id == tenant_id,
                Customer.name == name,
                Customer.phone_number.is_(None),
            )
            .limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            return customer
        customer = Customer(tenant_id=tenant_id, phone_number=None, name=name)
        db.add(customer)
        await db.flush()
        return customer

    customer = Customer(tenant_id=tenant_id, phone_number=None, name=None)
    db.add(customer)
    await db.flush()
    return customer


async def create_order(
    db: AsyncSession,
    *,
    phone_number: str | None,
    customer_name: str | None,
    notes: str | None,
    call_sid: str | None,
    tenant_id: int,
) -> str:
    customer = await get_or_create_customer(
        db,
        tenant_id=tenant_id,
        phone_number=phone_number,
        display_name=customer_name,
    )
    order = Order(
        tenant_id=tenant_id,
        customer_id=customer.id,
        status="draft",
        total_amount=0,
    )
    db.add(order)
    await db.flush()
    await db.commit()
    await db.refresh(order)
    return f"Order #{order.id} created as draft. What would you like to add?"


async def add_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    menu_item_id: int,
    quantity: int,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    menu_query = select(Menu).where(Menu.id == menu_item_id, Menu.tenant_id == tenant_id)
    menu_result = await db.execute(menu_query.limit(1))
    menu = menu_result.scalars().first()
    if not menu:
        return f"Menu item #{menu_item_id} not found."
    if not menu.available:
        return f"Menu item '{menu.name}' is not available."

    line_total = float(menu.price) * quantity
    item_name = (menu.name or "")[:100]
    item = OrderItem(
        tenant_id=order.tenant_id,
        order_id=order.id,
        item_name=item_name,
        quantity=quantity,
        unit_price=float(menu.price),
        line_total=line_total,
    )
    db.add(item)
    order.total_amount = float(order.total_amount or 0) + line_total
    await db.commit()
    await db.refresh(order)
    return (
        f"Added {quantity} x {menu.name} to order #{order.id}. "
        f"Current total is {float(order.total_amount or 0):.2f}."
    )


async def update_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    line_item_id: int,
    quantity: int,
    tenant_id: int,
) -> str:
    if quantity < 1:
        return "Quantity must be at least 1."
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == line_item_id,
            OrderItem.order_id == order_id,
            OrderItem.tenant_id == tenant_id,
        )
    )
    item = result.scalars().first()
    if not item:
        return f"Line item #{line_item_id} not found in order #{order_id}."

    old_total = float(item.line_total)
    item.quantity = quantity
    item.line_total = float(item.unit_price) * quantity
    delta = float(item.line_total) - old_total
    order.total_amount = max(0.0, float(order.total_amount or 0) + delta)
    await db.commit()
    return (
        f"Updated line {line_item_id} to quantity {quantity}. "
        f"Order total is now {float(order.total_amount or 0):.2f}."
    )


async def remove_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    line_item_id: int,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == line_item_id,
            OrderItem.order_id == order_id,
            OrderItem.tenant_id == tenant_id,
        )
    )
    item = result.scalars().first()
    if not item:
        return f"Line item #{line_item_id} not found in order #{order_id}."

    order.total_amount = max(0.0, float(order.total_amount or 0) - float(item.line_total))
    await db.execute(delete(OrderItem).where(OrderItem.id == line_item_id))
    await db.commit()
    return f"Removed line item #{line_item_id} from order #{order_id}."


async def cancel_order(
    db: AsyncSession,
    *,
    order_id: int,
    reason: str | None,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    order.status = "cancelled"
    await db.commit()
    return f"Order #{order_id} has been cancelled."


async def confirm_order(
    db: AsyncSession,
    *,
    order_id: int,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    order.status = "confirmed"
    await db.commit()
    return f"Order #{order_id} confirmed. Total is {float(order.total_amount or 0):.2f}."


async def get_order_summary(
    db: AsyncSession,
    *,
    order_id: int,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    return _format_order_summary(order)


async def price_order(
    db: AsyncSession,
    *,
    order_id: int,
    tenant_id: int,
) -> str:
    order = await _get_order(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    return f"Order #{order_id} total is {float(order.total_amount or 0):.2f} (status {order.status})."


async def list_menu(
    db: AsyncSession,
    *,
    category: str | None,
    limit: int = 20,
    tenant_id: int,
) -> str:
    all_available = await _get_cached_available_menu(db=db, tenant_id=tenant_id)
    rows = all_available
    if category:
        normalized = category.strip().lower()
        rows = [m for m in rows if (m.category or "").strip().lower() == normalized]
    rows = sorted(rows, key=lambda m: (m.name or "").lower())[:limit]
    if not rows:
        return "No menu items available right now."
    parts = [f"{m.id}:{m.name} ({float(m.price):.2f})" for m in rows]
    return "Available items: " + ", ".join(parts) + "."


# ── private helpers ──────────────────────────────────────────────────

async def _get_order(db: AsyncSession, order_id: int) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
        .limit(1)
    )
    return result.scalars().first()


def _format_order_summary(order: Order) -> str:
    customer_name = order.customer.name if order.customer else "Unknown customer"
    lines = [
        f"Order #{order.id} customer={customer_name} "
        f"status={order.status} total={float(order.total_amount or 0):.2f}.",
    ]
    for it in order.items:
        lines.append(
            f"  line {it.id}: item={it.item_name!r} qty={it.quantity} "
            f"line_total={float(it.line_total):.2f}"
        )
    return "\n".join(lines)


async def _get_cached_available_menu(
    db: AsyncSession,
    *,
    tenant_id: int,
) -> list[Menu]:
    now = datetime.utcnow()
    cached = _MENU_CACHE.get(tenant_id)
    if cached is not None:
        cached_at, menu_rows = cached
        if (now - cached_at).total_seconds() < MENU_CACHE_TTL_SECONDS:
            return menu_rows

    q = (
        select(Menu)
        .where(Menu.available == 1, Menu.tenant_id == tenant_id)
        .order_by(Menu.name.asc())
    )
    result = await db.execute(q)
    menu_rows = list(result.scalars().all())
    _MENU_CACHE[tenant_id] = (now, menu_rows)
    return menu_rows
