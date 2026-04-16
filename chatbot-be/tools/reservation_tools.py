"""
LangChain tools for table reservation management.
"""
from __future__ import annotations

from datetime import datetime
from logging import Logger
from typing import Any, Optional

from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:  # pragma: no cover
    _get_stream_writer = None  # type: ignore[misc, assignment]

from services import reservation_tool_service


def _emit(payload: dict[str, Any], log: Logger) -> None:
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
        "RESERVATION_TOOL_PROGRESS | tool=%s phase=%s stream_writer=%s",
        payload.get("tool"),
        payload.get("phase"),
        sw_status,
    )


def build_reservation_tools(
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    customer_phone: str | None = None,
    customer_name: str | None = None,
) -> list:
    @tool
    async def check_table_availability(
        reservation_date: Optional[datetime] = None,
        party_size: Optional[int] = None,
        location: Optional[str] = None,
    ) -> str:
        """Get table information, optionally filtered by date/time, size, or location.

        Args:
            reservation_date: Optional requested reservation date-time in ISO format.
            party_size: Optional number of guests.
            location: Optional location filter (e.g., patio/window/inside).
        """
        _emit({"tool": "check_table_availability", "phase": "start"}, log)
        try:
            result = await reservation_tool_service.check_table_availability(
                db=db,
                reservation_date=reservation_date,
                party_size=party_size,
                location=location,
                tenant_id=tenant_id,
            )
            _emit({"tool": "check_table_availability", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("check_table_availability tool failed: %s", e)
            _emit(
                {"tool": "check_table_availability", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def reserve_table(
        reservation_date: datetime,
        party_size: int,
        location_preference: Optional[str] = None,
        customer_name_input: Optional[str] = None,
        phone_number_input: Optional[str] = None,
        special_request: Optional[str] = None,
    ) -> str:
        """Create a table reservation for the caller.

        Args:
            reservation_date: Requested reservation date-time in ISO format.
            party_size: Number of guests.
            location_preference: Optional seating preference like rooftop, indoor, patio.
            customer_name_input: Optional customer name override.
            phone_number_input: Optional phone number override.
            special_request: Optional special notes for the reservation.
        """
        _emit({"tool": "reserve_table", "phase": "start"}, log)
        try:
            result = await reservation_tool_service.reserve_table(
                db=db,
                reservation_date=reservation_date,
                party_size=party_size,
                tenant_id=tenant_id,
                location_preference=location_preference,
                customer_name=(
                    customer_name_input
                    if customer_name_input and customer_name_input.strip()
                    else customer_name
                ),
                phone_number=(
                    phone_number_input
                    if phone_number_input and phone_number_input.strip()
                    else customer_phone
                ),
                special_request=special_request,
            )
            _emit({"tool": "reserve_table", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("reserve_table tool failed: %s", e)
            _emit({"tool": "reserve_table", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def update_reservation(
        reservation_id: int,
        reservation_date: Optional[datetime] = None,
        party_size: Optional[int] = None,
        location_preference: Optional[str] = None,
        special_request: Optional[str] = None,
    ) -> str:
        """Update an existing reservation.

        Args:
            reservation_id: Reservation id to update.
            reservation_date: Optional updated date-time in ISO format.
            party_size: Optional updated party size.
            location_preference: Optional updated seating preference like rooftop, indoor, patio.
            special_request: Optional updated special notes.
        """
        _emit({"tool": "update_reservation", "phase": "start"}, log)
        try:
            result = await reservation_tool_service.update_reservation(
                db=db,
                reservation_id=reservation_id,
                reservation_date=reservation_date,
                party_size=party_size,
                location_preference=location_preference,
                special_request=special_request,
                tenant_id=tenant_id,
            )
            _emit({"tool": "update_reservation", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("update_reservation tool failed: %s", e)
            _emit({"tool": "update_reservation", "phase": "error", "error": str(e)}, log)
            raise

    @tool
    async def cancel_reservation(reservation_id: int) -> str:
        """Cancel an existing reservation.

        Args:
            reservation_id: Reservation id to cancel.
        """
        _emit({"tool": "cancel_reservation", "phase": "start"}, log)
        try:
            result = await reservation_tool_service.cancel_reservation(
                db=db,
                reservation_id=reservation_id,
                tenant_id=tenant_id,
            )
            _emit({"tool": "cancel_reservation", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("cancel_reservation tool failed: %s", e)
            _emit({"tool": "cancel_reservation", "phase": "error", "error": str(e)}, log)
            raise

    return [
        reserve_table,
        update_reservation,
        cancel_reservation,
        check_table_availability,
    ]
