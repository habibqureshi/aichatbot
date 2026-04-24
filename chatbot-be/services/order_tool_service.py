"""
Local DB service functions for order tools (replaces MCP order_service).
Mirrors the logic from chatbot-mcp/src/services/order_service.py so the
LangChain tools in chatbot-be can work without an MCP round-trip.
"""

from __future__ import annotations

from datetime import datetime
from collections import defaultdict

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
    delivery_address: str | None = None,
) -> Customer:
    phone = (
        phone_number.strip()
        if phone_number and str(phone_number).strip() and phone_number != "invalid"
        else None
    )
    name = display_name.strip() if display_name and str(display_name).strip() else None
    address = (
        delivery_address.strip()
        if delivery_address and str(delivery_address).strip()
        else None
    )

    if phone:
        existing = await db.execute(
            select(Customer)
            .where(Customer.tenant_id == tenant_id, Customer.phone_number == phone)
            .limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            changed = False
            if name and not (customer.name and str(customer.name).strip()):
                customer.name = name
                changed = True
            if address and not (
                customer.delivery_address and str(customer.delivery_address).strip()
            ):
                customer.delivery_address = address
                changed = True
            if changed:
                await db.flush()
            return customer
        customer = Customer(
            tenant_id=tenant_id,
            phone_number=phone,
            name=name,
            delivery_address=address,
        )
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
        customer = Customer(
            tenant_id=tenant_id,
            phone_number=None,
            name=name,
            delivery_address=address,
        )
        db.add(customer)
        await db.flush()
        return customer

    customer = Customer(
        tenant_id=tenant_id,
        phone_number=None,
        name=None,
        delivery_address=address,
    )
    db.add(customer)
    await db.flush()
    return customer


async def create_order(
    db: AsyncSession,
    *,
    phone_number: str | None,
    customer_name: str | None,
    delivery_address: str | None,
    notes: str | None,
    call_sid: str | None,
    tenant_id: int,
) -> str:
    customer = await get_or_create_customer(
        db,
        tenant_id=tenant_id,
        phone_number=phone_number,
        display_name=customer_name,
        delivery_address=delivery_address,
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
    if not (customer.name and str(customer.name).strip()):
        return (
            f"Order #{order.id} created as draft. Before we continue, may I have your name "
            "for this order?"
        )
    if not (customer.delivery_address and str(customer.delivery_address).strip()):
        return (
            f"Order #{order.id} created as draft. I don't have your delivery address yet. "
            "Please share the full address."
        )
    return f"Order #{order.id} created as draft. What would you like to add?"


async def get_customer_profile(
    db: AsyncSession,
    *,
    tenant_id: int,
    phone_number: str | None,
) -> str:
    if not phone_number or not str(phone_number).strip():
        return "No caller phone number is available for this session."
    result = await db.execute(
        select(Customer)
        .where(
            Customer.tenant_id == tenant_id,
            Customer.phone_number == phone_number.strip(),
        )
        .limit(1)
    )
    customer = result.scalars().first()
    if not customer:
        return "No customer profile exists for this caller yet."
    name = (
        customer.name.strip() if customer.name and customer.name.strip() else "missing"
    )
    address = (
        customer.delivery_address.strip()
        if customer.delivery_address and customer.delivery_address.strip()
        else "missing"
    )
    return (
        f"Customer profile: id={customer.id}, name={name}, delivery_address={address}."
    )


async def update_customer_profile(
    db: AsyncSession,
    *,
    tenant_id: int,
    phone_number: str | None,
    customer_name: str | None = None,
    delivery_address: str | None = None,
) -> str:
    if not phone_number or not str(phone_number).strip():
        return "Cannot update customer profile because caller phone is unavailable."
    customer = await get_or_create_customer(
        db,
        tenant_id=tenant_id,
        phone_number=phone_number,
        display_name=None,
        delivery_address=None,
    )
    changed = False
    if customer_name and customer_name.strip():
        normalized_name = customer_name.strip()
        if customer.name != normalized_name:
            customer.name = normalized_name
            changed = True
    if delivery_address and delivery_address.strip():
        normalized_address = delivery_address.strip()
        if customer.delivery_address != normalized_address:
            customer.delivery_address = normalized_address
            changed = True
    if changed:
        await db.commit()
        await db.refresh(customer)
    name = (
        customer.name.strip() if customer.name and customer.name.strip() else "missing"
    )
    address = (
        customer.delivery_address.strip()
        if customer.delivery_address and customer.delivery_address.strip()
        else "missing"
    )
    return f"Customer profile updated: name={name}, delivery_address={address}."


async def add_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    caller_phone_number: str | None,
    tenant_id: int,
    items: dict[str, str | int] | list[dict[str, str | int]] | None = None,
) -> str:
    normalized_items: list[tuple[str, int]] = []
    compact_payload: list[dict[str, str | int]]
    if isinstance(items, dict):
        compact_payload = [items]
    elif isinstance(items, list):
        compact_payload = items
    else:
        return "Provide items as {n,q}, [{n,q}] or [{name,quantity}]."

    if not compact_payload:
        return "items array cannot be empty."
    for idx, raw in enumerate(compact_payload):
        raw_name = str(raw.get("n") or raw.get("name") or "").strip()
        raw_quantity = raw.get("q", raw.get("quantity", 0))
        try:
            parsed_quantity = int(raw_quantity)
        except (TypeError, ValueError):
            return (
                f"Quantity at index {idx} for item "
                f"'{raw_name or 'unknown'}' must be a whole number."
            )
        if not raw_name:
            return f"items[{idx}] name must be non-empty."
        if parsed_quantity < 1:
            return (
                f"Quantity for item '{raw_name}' at index {idx} "
                "must be at least 1."
            )
        normalized_items.append((raw_name, parsed_quantity))

    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."

    lock_result = await db.execute(
        select(Order)
        .where(
            Order.id == order_id,
            Order.tenant_id == tenant_id,
            Order.customer_id == caller_customer_id,
        )
        .with_for_update()
        .limit(1)
    )
    order = lock_result.scalars().first()
    if not order:
        return f"Order #{order_id} was not found for this caller."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    resolved_items: list[tuple[Menu, int]] = []
    for selected_name, selected_qty in normalized_items:
        menu_query = select(Menu).where(
            Menu.name == selected_name,
            Menu.tenant_id == tenant_id,
        )
        menu_result = await db.execute(menu_query.limit(1))
        menu = menu_result.scalars().first()
        if not menu:
            return f"Menu item {selected_name} not found."
        if not menu.available:
            return f"Menu item '{menu.name}' is not available."
        resolved_items.append((menu, selected_qty))

    added_summary: list[str] = []
    batch_total = 0.0
    for menu, selected_qty in resolved_items:
        unit_price = float(menu.price)
        normalized_name = (menu.name or "")[:100]
        line_total = unit_price * selected_qty
        existing_result = await db.execute(
            select(OrderItem).where(
                OrderItem.order_id == order.id,
                OrderItem.tenant_id == tenant_id,
                OrderItem.item_name == normalized_name,
            )
        )
        existing = None
        for row in existing_result.scalars().all():
            if abs(float(row.unit_price) - unit_price) < 1e-6:
                existing = row
                break

        if existing:
            existing.quantity = int(existing.quantity) + selected_qty
            existing.line_total = float(existing.unit_price) * int(existing.quantity)
        else:
            db.add(
                OrderItem(
                    tenant_id=order.tenant_id,
                    order_id=order.id,
                    item_name=normalized_name,
                    quantity=selected_qty,
                    unit_price=unit_price,
                    line_total=line_total,
                )
            )
        batch_total += line_total
        added_summary.append(f"{selected_qty} x {menu.name}")

    order.total_amount = float(order.total_amount or 0) + batch_total
    await db.commit()
    await db.refresh(order)
    if len(added_summary) == 1:
        return (
            f"Added {added_summary[0]} to order #{order.id}. "
            f"Current total is {float(order.total_amount or 0):.2f}."
        )
    return (
        f"Added items to order #{order.id}: {', '.join(added_summary)}. "
        f"Current total is {float(order.total_amount or 0):.2f}."
    )


async def update_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    items: dict[str, int] | list[dict[str, int]] | None,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    payloads: list[dict[str, int]]
    if isinstance(items, dict):
        payloads = [items]
    elif isinstance(items, list):
        payloads = items
    else:
        return "Provide items as {i,q}, [{i,q}] or [{line_item_id,quantity}]."
    if not payloads:
        return "items array cannot be empty."

    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    updated_summary: list[str] = []
    total_delta = 0.0
    for idx, raw in enumerate(payloads):
        raw_line_id = raw.get("i", raw.get("id", raw.get("line_item_id")))
        raw_qty = raw.get("q", raw.get("quantity"))
        try:
            line_item_id = int(raw_line_id)
        except (TypeError, ValueError):
            return f"Line item id at index {idx} must be a whole number."
        try:
            quantity = int(raw_qty)
        except (TypeError, ValueError):
            return f"Quantity at index {idx} for line item #{line_item_id} must be a whole number."
        if quantity < 1:
            return f"Quantity for line item #{line_item_id} must be at least 1."

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
        total_delta += float(item.line_total) - old_total
        updated_summary.append(f"line {line_item_id} -> qty {quantity}")

    order.total_amount = max(0.0, float(order.total_amount or 0) + total_delta)
    await db.commit()
    if len(updated_summary) == 1:
        return (
            f"Updated {updated_summary[0]} in order #{order_id}. "
            f"Order total is now {float(order.total_amount or 0):.2f}."
        )
    return (
        f"Updated items in order #{order_id}: {', '.join(updated_summary)}. "
        f"Order total is now {float(order.total_amount or 0):.2f}."
    )


async def remove_order_item(
    db: AsyncSession,
    *,
    order_id: int,
    items: dict[str, int] | list[dict[str, int]] | None,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    payloads: list[dict[str, int]]
    if isinstance(items, dict):
        payloads = [items]
    elif isinstance(items, list):
        payloads = items
    else:
        return "Provide items as {i}, [{i}] or [{line_item_id}]."
    if not payloads:
        return "items array cannot be empty."

    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    if order.status not in ("draft", "pending"):
        return f"Order #{order_id} cannot be modified in status '{order.status}'."

    removed_ids: list[int] = []
    removed_total = 0.0
    for idx, raw in enumerate(payloads):
        raw_line_id = raw.get("i", raw.get("id", raw.get("line_item_id")))
        try:
            line_item_id = int(raw_line_id)
        except (TypeError, ValueError):
            return f"Line item id at index {idx} must be a whole number."

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

        removed_total += float(item.line_total)
        removed_ids.append(line_item_id)
        await db.execute(delete(OrderItem).where(OrderItem.id == line_item_id))

    order.total_amount = max(0.0, float(order.total_amount or 0) - removed_total)
    await db.commit()
    if len(removed_ids) == 1:
        return f"Removed line item #{removed_ids[0]} from order #{order_id}."
    return f"Removed line items {', '.join(str(v) for v in removed_ids)} from order #{order_id}."


async def cancel_order(
    db: AsyncSession,
    *,
    order_id: int,
    reason: str | None,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    if order.status == "confirmed":
        order.status = "cancelled"
        await db.commit()
        return f"Order #{order_id} has been cancelled."
    return f"Order #{order_id} not in confirmed state, hence cannot be cancelled!"


async def confirm_order(
    db: AsyncSession,
    *,
    order_id: int,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    order.status = "confirmed"
    await db.commit()
    return f"Order #{order_id} confirmed. Total is {float(order.total_amount or 0):.2f}. Tell the order # to user"


async def get_latest_order_summary_for_caller(
    db: AsyncSession,
    *,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    """Most recently updated order for this tenant + caller phone (lines + total)."""
    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(
            Order.tenant_id == tenant_id,
            Order.customer_id == caller_customer_id,
        )
        .order_by(Order.updated_at.desc(), Order.id.desc())
        .limit(1)
    )
    order = result.scalars().first()
    if not order:
        return "No order on file for this caller yet."
    return "Latest order (by last update):\n" + _format_order_summary(order)


async def get_order_summary(
    db: AsyncSession,
    *,
    order_id: int,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    return _format_order_summary(order)


async def price_order(
    db: AsyncSession,
    *,
    order_id: int,
    caller_phone_number: str | None,
    tenant_id: int,
) -> str:
    caller_customer_id = await _get_caller_customer_id(
        db=db,
        tenant_id=tenant_id,
        caller_phone_number=caller_phone_number,
    )
    if caller_customer_id is None:
        return "Unable to verify caller identity for this order session."
    order = await _get_order_for_customer(
        db=db,
        order_id=order_id,
        tenant_id=tenant_id,
        caller_customer_id=caller_customer_id,
    )
    if not order:
        return f"Order #{order_id} was not found for this caller."
    return f"Order #{order_id} total is {float(order.total_amount or 0):.2f} (status {order.status})."


async def list_menu(
    db: AsyncSession,
    *,
    category: str | None,
    limit: int = 20,
    include_price: bool = False,
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
    if category:
        if include_price:
            parts = [f"{m.id}:{m.name} ({float(m.price):.2f})" for m in rows]
        else:
            parts = [f"{m.id}:{m.name}" for m in rows]
        return f"Available items in {category}: " + ", ".join(parts) + "."

    by_category: dict[str, list[Menu]] = defaultdict(list)
    uncategorized_label = "uncategorized"
    for menu in rows:
        label = (menu.category or "").strip() or uncategorized_label
        by_category[label].append(menu)
    category_parts = []
    for label in sorted(by_category.keys(), key=lambda v: v.lower()):
        names = ", ".join(m.name for m in by_category[label][:6] if m.name)
        extra = max(0, len(by_category[label]) - 6)
        suffix = f" (+{extra} more)" if extra else ""
        category_parts.append(f"{label}: {names}{suffix}")
    return (
        "Available menu categories and sample items: "
        + " | ".join(category_parts)
        + ". Ask for a category to hear more."
    )


# ── private helpers ──────────────────────────────────────────────────


async def _get_order(db: AsyncSession, order_id: int) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
        .limit(1)
    )
    return result.scalars().first()


async def _get_order_for_customer(
    db: AsyncSession,
    *,
    order_id: int,
    tenant_id: int,
    caller_customer_id: int,
) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(
            Order.id == order_id,
            Order.tenant_id == tenant_id,
            Order.customer_id == caller_customer_id,
        )
        .limit(1)
    )
    return result.scalars().first()


async def _get_caller_customer_id(
    db: AsyncSession,
    *,
    tenant_id: int,
    caller_phone_number: str | None,
) -> int | None:
    phone = (
        caller_phone_number.strip()
        if caller_phone_number and str(caller_phone_number).strip()
        else None
    )
    if not phone:
        return None
    result = await db.execute(
        select(Customer.id)
        .where(Customer.tenant_id == tenant_id, Customer.phone_number == phone)
        .limit(1)
    )
    return result.scalar_one_or_none()


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


async def get_menu_context_for_prompt(
    db: AsyncSession,
    *,
    tenant_id: int,
    max_items_per_category: int = 4,
) -> str:
    rows = await _get_cached_available_menu(db=db, tenant_id=tenant_id)
    if not rows:
        return "empty"

    lines = ["category,name,price,description"]
    for m in rows:
        category = (m.category or "").strip() or "uncategorized"
        name = m.name or ""
        price = float(m.price) if m.price is not None else ""
        desc = (m.description or "").replace(",", " ").strip()

        lines.append(f"{category},{name},{price},{desc}")

    # grouped = {}

    # for m in rows:
    #     cat = (m.category or "").strip() or "uncategorized"
    #     grouped.setdefault(cat, []).append(f"{m.name}~{float(m.price)}")

    # out = []

    # for cat in sorted(grouped.keys(), key=str.lower):
    #     items = grouped[cat][:max_items_per_category]
    #     extra = len(grouped[cat]) - len(items)

    #     line = f"{cat}:{', '.join(items)}"
    #     if extra > 0:
    #         line += f" +{extra} more"

    #     out.append(line)

    return "\n".join(lines)
