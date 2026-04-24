"""
LangChain tools for order management – run directly against the local DB
(no MCP round-trip).  Each tool uses ``get_stream_writer()`` to emit
meaningful progress messages that ``order_service.stream_llm`` consumes
via ``astream_events  →  on_custom_event``.
"""

from __future__ import annotations

from typing import Any, Optional
from logging import Logger

from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:  # pragma: no cover
    _get_stream_writer = None  # type: ignore[misc, assignment]

from services import order_tool_service, reservation_tool_service


def _emit(payload: dict[str, Any], log: Logger) -> None:
    """Write a custom stream chunk and log it unconditionally."""
    sw_status = "skipped"
    if _get_stream_writer is not None:
        try:
            writer = _get_stream_writer()
            if writer is not None:
                writer({"type": "order_mcp_tool", **payload})
                sw_status = "ok"
            else:
                sw_status = "no_op_writer"
        except Exception as e:
            sw_status = f"exc:{type(e).__name__}"
    else:
        sw_status = "import_missing"
    log.info(
        "ORDER_TOOL_PROGRESS | tool=%s phase=%s stream_writer=%s",
        payload.get("tool"),
        payload.get("phase"),
        sw_status,
    )


def build_order_tools(
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    customer_phone: str | None = None,
    customer_name: str | None = None,
    call_sid: str | None = None,
) -> list:
    """Return a list of LangChain tools bound to the given DB session / tenant."""

    @tool
    async def create_order(
        customer_name: Optional[str] = None,
        delivery_address: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """Create a new draft order for the caller.

        Args:
            customer_name: Optional display name for the customer (not the phone number).
            delivery_address: Optional delivery address to save for this caller.
            notes: Optional free-text notes for the order.
        """
        _emit({"tool": "create_order", "phase": "start"}, log)
        try:
            phone = customer_phone
            display = (
                customer_name.strip()
                if customer_name and str(customer_name).strip()
                else None
            )
            if phone and display and display.strip() == phone.strip():
                display = None

            result = await order_tool_service.create_order(
                db,
                phone_number=phone,
                customer_name=display,
                delivery_address=delivery_address,
                notes=notes,
                call_sid=call_sid,
                tenant_id=tenant_id,
            )
            _emit({"tool": "create_order", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("create_order tool failed: %s", e)
            _emit({"tool": "create_order", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def add_order_item(
        order_id: int,
        items: dict[str, Any] | list[dict[str, Any]] | None = None,
        user_confirmation: bool = False,
    ) -> str:
        """Add one or multiple menu item lines to an existing order.

        Args:
            order_id: Target order id.
            items: Compact batch payload:
                {"n": "...", "q": 2}
                [{"n": "...", "q": 2}, ...]
                Also accepts {"name": "...", "quantity": 2}
                or [{"name": "...", "quantity": 2}, ...]
                n is exact name of the item and q is quantity
            user_confirmation: if user confirmed or not
        """
        if items is None:
            return "items is required. Use {n,q} or [{n,q}, ...]."
        if not user_confirmation:
            raise Exception("Ask user explicit if he want to add items to the order")
        _emit({"tool": "add_order_item", "phase": "start"}, log)
        try:
            result = await order_tool_service.add_order_item(
                db,
                order_id=order_id,
                items=items,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "add_order_item", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("add_order_item tool failed: %s", e)
            _emit({"tool": "add_order_item", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def update_order_item(
        order_id: int,
        items: dict[str, Any] | list[dict[str, Any]] | None = None,
    ) -> str:
        """Change quantity for one or multiple order lines.

        Args:
            order_id: Order id.
            items: Compact payload:
                {"i": 12, "q": 3}
                [{"i": 12, "q": 3}, ...]
                Also accepts {"line_item_id": 12, "quantity": 3}.
        """
        if items is None:
            return "items is required. Use {i,q} or [{i,q}, ...]."
        _emit({"tool": "update_order_item", "phase": "start"}, log)
        try:
            result = await order_tool_service.update_order_item(
                db,
                order_id=order_id,
                items=items,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "update_order_item", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("update_order_item tool failed: %s", e)
            _emit({"tool": "update_order_item", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def remove_order_item(
        order_id: int,
        items: dict[str, Any] | list[dict[str, Any]] | None = None,
    ) -> str:
        """Remove one or multiple line items from an order.

        Args:
            order_id: Order id.
            items: Compact payload:
                {"i": 12}
                [{"i": 12}, {"i": 15}]
                Also accepts {"line_item_id": 12}.
        """
        if items is None:
            return "items is required. Use {i} or [{i}, ...]."
        _emit({"tool": "remove_order_item", "phase": "start"}, log)
        try:
            result = await order_tool_service.remove_order_item(
                db,
                order_id=order_id,
                items=items,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "remove_order_item", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("remove_order_item tool failed: %s", e)
            _emit({"tool": "remove_order_item", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def cancel_order(
        order_id: int, reason: Optional[str] = None, user_confirmation: bool = False
    ) -> str:
        """Cancel an order.

        Args:
            order_id: Order id to cancel.
            reason: Optional cancellation reason.
        """
        if not user_confirmation:
            raise Exception(
                f"Ask user explicitly if he wants to cancel order #{order_id}"
            )
        _emit({"tool": "cancel_order", "phase": "start"}, log)
        try:
            result = await order_tool_service.cancel_order(
                db,
                order_id=order_id,
                reason=reason,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "cancel_order", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("cancel_order tool failed: %s", e)
            _emit({"tool": "cancel_order", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def confirm_order(order_id: int, user_confirmation: bool = False) -> str:
        """Confirm and place the order after user explicitly said order is completed

        Args:
            order_id: Order id to confirm.
            user_confirmation: if user confirmed or not
        """
        if not user_confirmation:
            raise Exception("Ask user explicit if he wants to confirm place the order")
        _emit({"tool": "confirm_order", "phase": "start"}, log)
        try:
            result = await order_tool_service.confirm_order(
                db,
                order_id=order_id,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "confirm_order", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("confirm_order tool failed: %s", e)
            _emit({"tool": "confirm_order", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def get_my_latest_order_and_reservations(max_reservations: int = 5) -> str:
        """Fetch this caller's latest order (by last update) and most recent reservations.

        Use when the caller asks what they ordered, their last order, or their
        reservations without giving an order or reservation id.

        Args:
            max_reservations: How many recent reservations to include (1–10). Default 5.
        """
        _emit({"tool": "get_my_latest_order_and_reservations", "phase": "start"}, log)
        try:
            lim = int(max_reservations)
            if lim < 1:
                lim = 1
            elif lim > 10:
                lim = 10
            order_part = await order_tool_service.get_latest_order_summary_for_caller(
                db,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            res_part = await reservation_tool_service.get_latest_reservations_summary_for_caller(
                db,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
                limit=lim,
            )
            result = f"{order_part}\n\n{res_part}"
            _emit(
                {"tool": "get_my_latest_order_and_reservations", "phase": "done"}, log
            )
            return result
        except Exception as e:
            log.exception("get_my_latest_order_and_reservations tool failed: %s", e)
            _emit(
                {
                    "tool": "get_my_latest_order_and_reservations",
                    "phase": "error",
                    "error": str(e),
                },
                log,
            )
            raise

    @tool
    async def get_order(order_id: int) -> str:
        """Return order status, total, and line items.

        Args:
            order_id: Order id.
        """
        _emit({"tool": "get_order", "phase": "start"}, log)
        try:
            result = await order_tool_service.get_order_summary(
                db,
                order_id=order_id,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "get_order", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("get_order tool failed: %s", e)
            _emit({"tool": "get_order", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def price_order(order_id: int) -> str:
        """Return current total for an order.

        Args:
            order_id: Order id.
        """
        _emit({"tool": "price_order", "phase": "start"}, log)
        try:
            result = await order_tool_service.price_order(
                db,
                order_id=order_id,
                caller_phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "price_order", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("price_order tool failed: %s", e)
            _emit({"tool": "price_order", "phase": "error", "error": str(e)}, log)
            raise

    # @tool
    # async def list_menu(
    #     category: Optional[str] = None,
    #     limit: int = 20,
    #     include_price: bool = False,
    # ) -> str:
    #     """List available menu items (id, name, price).

    #     Args:
    #         category: Optional category filter.
    #         limit: Max rows to return.
    #         include_price: Set True only when caller asks for prices.
    #     """
    #     _emit({"tool": "list_menu", "phase": "start"}, log)
    #     try:
    #         result = await order_tool_service.list_menu(
    #             db,
    #             category=category,
    #             limit=int(limit),
    #             include_price=include_price,
    #             tenant_id=tenant_id,
    #         )
    #         _emit({"tool": "list_menu", "phase": "done"}, log)
    #         return result
    #     except Exception as e:
    #         log.exception("list_menu tool failed: %s", e)
    #         _emit({"tool": "list_menu", "phase": "error", "error": str(e)}, log)
    #         raise

    @tool
    async def get_customer_profile() -> str:
        """Get known caller profile values (name and saved delivery address)."""
        _emit({"tool": "get_customer_profile", "phase": "start"}, log)
        try:
            result = await order_tool_service.get_customer_profile(
                db,
                phone_number=customer_phone,
                tenant_id=tenant_id,
            )
            _emit({"tool": "get_customer_profile", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("get_customer_profile tool failed: %s", e)
            _emit(
                {"tool": "get_customer_profile", "phase": "error", "error": str(e)}, log
            )
            raise

    @tool
    async def update_customer_profile(
        customer_name: Optional[str] = None,
        delivery_address: Optional[str] = None,
    ) -> str:
        """Update caller profile values and save to customer table.

        Args:
            customer_name: Caller name to save.
            delivery_address: Delivery address to save. It must contain house/flat number, street/area name and city name.
        """
        _emit({"tool": "update_customer_profile", "phase": "start"}, log)
        try:
            result = await order_tool_service.update_customer_profile(
                db,
                phone_number=customer_phone,
                customer_name=customer_name,
                delivery_address=delivery_address,
                tenant_id=tenant_id,
            )
            _emit({"tool": "update_customer_profile", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("update_customer_profile tool failed: %s", e)
            _emit(
                {"tool": "update_customer_profile", "phase": "error", "error": str(e)},
                log,
            )
            raise

    return [
        get_customer_profile,
        update_customer_profile,
        get_my_latest_order_and_reservations,
        create_order,
        add_order_item,
        update_order_item,
        remove_order_item,
        cancel_order,
        confirm_order,
        get_order,
        price_order,
    ]
