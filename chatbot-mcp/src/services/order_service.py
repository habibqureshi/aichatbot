from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from src.db.models import Customer, Menu, Order, OrderItem


DEFAULT_TENANT_ID = 1


async def get_or_create_customer_db(
    db,
    *,
    tenant_id: int,
    customer_name: str | None,
) -> Customer:
    # Prefer a stable lookup by name when available; otherwise create an anonymous customer.
    if customer_name:
        existing = await db.execute(
            select(Customer)
            .where(
                Customer.tenant_id == tenant_id,
                Customer.name == customer_name,
            )
            .limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            return customer

    customer = Customer(
        tenant_id=tenant_id,
        name=customer_name,
    )
    db.add(customer)
    await db.flush()
    return customer


async def create_order_db(
    db,
    customer_name: str | None,
    notes: str | None,
    call_sid: str | None,
    tenant_id: int = DEFAULT_TENANT_ID,
) -> Order:
    customer = await get_or_create_customer_db(
        db,
        tenant_id=tenant_id,
        customer_name=customer_name,
    )
    order = Order(
        tenant_id=tenant_id,
        customer_id=customer.id,
        status="draft",
        total_amount=0,
    )
    db.add(order)
    await db.flush()
    _ = notes
    _ = call_sid
    await db.commit()
    await db.refresh(order)
    return order


async def get_order_db(db, order_id: int) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
        .limit(1)
    )
    return result.scalars().first()


async def add_order_item_db(
    db,
    order_id: int,
    menu_item_id: int,
    quantity: int,
    tenant_id: int | None = None,
) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    menu_query = select(Menu).where(Menu.id == menu_item_id)
    if tenant_id is not None:
        menu_query = menu_query.where(Menu.tenant_id == tenant_id)
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


async def update_order_item_db(
    db,
    order_id: int,
    line_item_id: int,
    quantity: int,
    tenant_id: int | None = None,
) -> str:
    if quantity < 1:
        return "Quantity must be at least 1."
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == line_item_id,
            OrderItem.order_id == order_id,
            *( [OrderItem.tenant_id == tenant_id] if tenant_id is not None else [] ),
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


async def remove_order_item_db(
    db, order_id: int, line_item_id: int, tenant_id: int | None = None
) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    result = await db.execute(
        select(OrderItem).where(
            OrderItem.id == line_item_id,
            OrderItem.order_id == order_id,
            *( [OrderItem.tenant_id == tenant_id] if tenant_id is not None else [] ),
        )
    )
    item = result.scalars().first()
    if not item:
        return f"Line item #{line_item_id} not found in order #{order_id}."

    order.total_amount = max(0.0, float(order.total_amount or 0) - float(item.line_total))
    await db.execute(delete(OrderItem).where(OrderItem.id == line_item_id))
    await db.commit()
    return f"Removed line item #{line_item_id} from order #{order_id}."


async def cancel_order_db(
    db, order_id: int, reason: str | None, tenant_id: int | None = None
) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if tenant_id is not None and order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    order.status = "cancelled"
    _ = reason
    await db.commit()
    return f"Order #{order_id} has been cancelled."


async def confirm_order_db(db, order_id: int, tenant_id: int | None = None) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if tenant_id is not None and order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    order.status = "confirmed"
    await db.commit()
    return (
        f"Order #{order_id} confirmed. Total is {float(order.total_amount or 0):.2f}."
    )


async def get_order_summary_db(db, order_id: int, tenant_id: int | None = None) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if tenant_id is not None and order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    return format_order_summary(order)


async def price_order_db(db, order_id: int, tenant_id: int | None = None) -> str:
    order = await get_order_db(db, order_id)
    if not order:
        return f"Order #{order_id} not found."
    if tenant_id is not None and order.tenant_id != tenant_id:
        return f"Order #{order_id} not found."
    return f"Order #{order_id} total is {float(order.total_amount or 0):.2f} (status {order.status})."


async def list_menu_db(
    db, category: str | None, limit: int = 20, tenant_id: int | None = None
) -> str:
    q = select(Menu).where(Menu.available == 1)
    if tenant_id is not None:
        q = q.where(Menu.tenant_id == tenant_id)
    if category:
        q = q.where(Menu.category == category)
    q = q.order_by(Menu.name.asc()).limit(limit)
    result = await db.execute(q)
    rows = list(result.scalars().all())
    if not rows:
        return "No menu items available right now."
    parts = [f"{m.id}:{m.name} ({float(m.price):.2f})" for m in rows]
    return "Available items: " + ", ".join(parts) + "."


def format_order_summary(order: Order) -> str:
    customer_name = order.customer.name if order.customer else "Unknown customer"
    lines = [
        (
            f"Order #{order.id} customer={customer_name} "
            f"status={order.status} total={float(order.total_amount or 0):.2f}."
        ),
    ]
    for it in order.items:
        lines.append(
            f"  line {it.id}: item={it.item_name!r} qty={it.quantity} "
            f"line_total={float(it.line_total):.2f}"
        )
    return "\n".join(lines)
