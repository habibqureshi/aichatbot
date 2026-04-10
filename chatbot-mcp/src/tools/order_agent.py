from typing import Optional

from fastmcp import FastMCP, Context

from src.db.db import get_db
from src.services import order_service


def register_tools(mcp: FastMCP):
    def _tenant_id_from_ctx(ctx: Context) -> int:
        tenant_id = ctx.get_state("tenant_id")
        try:
            return int(tenant_id)
        except (TypeError, ValueError):
            return 1

    @mcp.tool(tags=["restaurant"])
    async def create_order(
        ctx: Context,
        customer_name: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """
        Create a new draft order for the caller.

        Args:
            customer_name: Optional display name; defaults to caller phone from context if omitted.
            notes: Optional free-text notes for the order.
        """
        phone = ctx.get_state("patient_number")
        name = customer_name or (phone if phone and phone != "invalid" else None)
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            order = await order_service.create_order_db(
                db=db,
                customer_name=name,
                notes=notes,
                call_sid=ctx.get_state("call_sid"),
                tenant_id=tenant_id,
            )
            return f"Order #{order.id} created as draft. What would you like to add?"

    @mcp.tool(tags=["restaurant"])
    async def add_order_item(
        order_id: int,
        menu_item_id: int,
        quantity: int,
        ctx: Context,
    ) -> str:
        """
        Add a menu item line to an existing order.

        Args:
            order_id: Target order id.
            menu_item_id: Menu row id (from list_menu).
            quantity: Number of units (>= 1).
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        if quantity < 1:
            return "Quantity must be at least 1."
        async with get_db() as db:
            return await order_service.add_order_item_db(
                db=db,
                order_id=order_id,
                menu_item_id=menu_item_id,
                quantity=quantity,
                tenant_id=tenant_id,
            )

    @mcp.tool(tags=["restaurant"])
    async def update_order_item(
        order_id: int,
        line_item_id: int,
        quantity: int,
        ctx: Context,
    ) -> str:
        """
        Change the quantity on an existing order line.

        Args:
            order_id: Order id.
            line_item_id: Line item id.
            quantity: New quantity (>= 1).
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.update_order_item_db(
                db=db,
                order_id=order_id,
                line_item_id=line_item_id,
                quantity=quantity,
                tenant_id=tenant_id,
            )

    @mcp.tool(tags=["restaurant"])
    async def remove_order_item(
        order_id: int,
        line_item_id: int,
        ctx: Context,
    ) -> str:
        """
        Remove one line item from an order.

        Args:
            order_id: Order id.
            line_item_id: Order line id (see get_order).
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.remove_order_item_db(
                db=db, order_id=order_id, line_item_id=line_item_id, tenant_id=tenant_id
            )

    @mcp.tool(tags=["restaurant"])
    async def cancel_order(
        order_id: int,
        ctx: Context,
        reason: Optional[str] = None,
    ) -> str:
        """
        Cancel an order.

        Args:
            order_id: Order id to cancel.
            reason: Optional cancellation reason.
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.cancel_order_db(
                db=db, order_id=order_id, reason=reason, tenant_id=tenant_id
            )

    @mcp.tool(tags=["restaurant"])
    async def confirm_order(order_id: int, ctx: Context) -> str:
        """
        Finalize an order (sets status to confirmed).

        Args:
            order_id: Order id to confirm.
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.confirm_order_db(
                db=db, order_id=order_id, tenant_id=tenant_id
            )

    @mcp.tool(tags=["restaurant"])
    async def get_order(order_id: int, ctx: Context) -> str:
        """
        Return order status, total, and line items.

        Args:
            order_id: Order id.
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.get_order_summary_db(
                db=db, order_id=order_id, tenant_id=tenant_id
            )

    @mcp.tool(tags=["restaurant"])
    async def price_order(order_id: int, ctx: Context) -> str:
        """
        Return current total for an order.

        Args:
            order_id: Order id.
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.price_order_db(
                db=db, order_id=order_id, tenant_id=tenant_id
            )

    @mcp.tool(tags=["restaurant"])
    async def list_menu(
        ctx: Context,
        category: Optional[str] = None,
        limit: int = 20,
    ) -> str:
        """
        List available menu items (id, name, price).

        Args:
            category: Optional category filter.
            limit: Max rows to return.
        """
        tenant_id = _tenant_id_from_ctx(ctx)
        async with get_db() as db:
            return await order_service.list_menu_db(
                db=db, category=category, limit=limit, tenant_id=tenant_id
            )
