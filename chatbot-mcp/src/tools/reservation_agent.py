from fastmcp import FastMCP, Context
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from sqlalchemy import select

from src.db.db import get_db
from src.db.models import RestaurantTable, Reservation, Patient
from src.services import patient_service
from src.services import reservation_service


DEFAULT_RESERVATION_DURATION_MINUTES = 90


def register_tools(mcp: FastMCP):
    @mcp.tool(tags=["restaurant"])
    async def reserve_table(
        customer_name: str,
        reservation_datetime: str,
        ctx: Context,
        party_size: int = 2,
        location: Optional[str] = None,
        special_request: Optional[str] = None,
        duration_minutes: int = DEFAULT_RESERVATION_DURATION_MINUTES,
    ) -> str:
        """
        Create a table reservation for a customer.

        - `reservation_datetime` must be an ISO format datetime string.
        """
        try:
            dt = datetime.fromisoformat(reservation_datetime)
        except ValueError:
            return "Invalid date and time passed"

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if dt <= now:
            return "Reservation datetime must be in the future"

        duration = timedelta(minutes=duration_minutes)

        async with get_db() as db:
            customer = await patient_service.find_or_create(
                phone_number=ctx.get_state("patient_number"),
                db=db,
                tenant_id=ctx.get_state("tenant_id"),
            )
            if not customer.name:
                customer.name = customer_name
                customer = await patient_service.update(patient=customer, db=db)

            tables = await reservation_service.find_available_tables(
                reservation_datetime=dt,
                party_size=party_size,
                db=db,
                duration=duration,
                location=location,
                tenant_id=ctx.get_state("tenant_id"),
            )
            if not tables:
                return "No available tables for the requested time and party size"
            table = tables[0]

            try:
                reservation = await reservation_service.create_reservation(
                    customer=customer,
                    reservation_datetime=dt,
                    party_size=party_size,
                    db=db,
                    table_id=table.id,
                    status="confirmed",
                    special_request=special_request,
                    tenant_id=ctx.get_state("tenant_id"),
                )
                return (
                    f"Reservation confirmed for {customer_name} on {dt.strftime('%A, %B %d, %Y at %I:%M %p')} "
                    f"at table {table.table_number}."
                )
            except Exception as e:
                await db.rollback()
                print(f"Error while creating reservation: {e}")
                return "Something went wrong while creating your reservation."

    @mcp.tool(tags=["restaurant"])
    async def cancel_reservation(reservation_datetime: str, ctx: Context):
        """Cancel an existing reservation. `reservation_datetime` must be ISO datetime."""
        try:
            dt = datetime.fromisoformat(reservation_datetime)
        except ValueError:
            return "Invalid date and time passed"
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if dt <= now:
            return "Reservation datetime must be in the future"

        async with get_db() as db:
            reservation = (
                await reservation_service.find_by_customer_number_and_datetime(
                    phone_number=ctx.get_state("patient_number"),
                    reservation_datetime=dt,
                    db=db,
                    tenant_id=ctx.get_state("tenant_id"),
                )
            )
            if not reservation:
                return f"No reservation scheduled at {dt.strftime('%A, %B %d, %Y at %I:%M %p')}"
            if reservation.status == "cancelled":
                return "Reservation already cancelled"
            reservation.status = "cancelled"
            reservation.cancelled_at = datetime.now(timezone.utc)
            await db.commit()
            return f"Reservation on {dt.strftime('%A, %B %d, %Y at %I:%M %p')} has been cancelled successfully."

    @mcp.tool(tags=["restaurant"])
    async def reschedule_reservation(
        current_datetime: str,
        new_datetime: str,
        ctx: Context,
        duration_minutes: int = DEFAULT_RESERVATION_DURATION_MINUTES,
    ):
        """Reschedule an existing reservation to a new datetime."""
        try:
            current_dt = datetime.fromisoformat(current_datetime)
            new_dt = datetime.fromisoformat(new_datetime)
        except ValueError:
            return "Invalid date and time passed"
        if new_dt.tzinfo is None:
            new_dt = new_dt.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if new_dt <= now:
            return "Reservation datetime must be in the future"

        duration = timedelta(minutes=duration_minutes)

        async with get_db() as db:
            reservation = (
                await reservation_service.find_by_customer_number_and_datetime(
                    phone_number=ctx.get_state("patient_number"),
                    reservation_datetime=current_dt,
                    db=db,
                    tenant_id=ctx.get_state("tenant_id"),
                )
            )
            if not reservation or reservation.status != "confirmed":
                return f"No reservation scheduled at {current_dt.strftime('%A, %B %d, %Y at %I:%M %p')}"

            # Check if table is available at new time
            tables = await reservation_service.find_available_tables(
                reservation_datetime=new_dt,
                party_size=reservation.party_size,
                db=db,
                duration=duration,
                tenant_id=ctx.get_state("tenant_id"),
            )
            chosen_table_id = None
            if reservation.table_id and any(
                t.id == reservation.table_id for t in tables
            ):
                chosen_table_id = reservation.table_id
            elif tables:
                chosen_table_id = tables[0].id
            else:
                return "No available tables at the requested new time"

            try:
                reservation.reservation_date = new_dt
                reservation.table_id = chosen_table_id
                await db.commit()
                return f"Reservation rescheduled to {new_dt.strftime('%A, %B %d, %Y at %I:%M %p')}"
            except Exception as e:
                await db.rollback()
                print(f"Error while rescheduling reservation: {e}")
                return "Something went wrong while rescheduling your reservation."

    @mcp.tool(tags=["restaurant"])
    async def find_available_tables(
        preferred_date: str,
        start_time: str,
        ctx: Context,
        party_size: int = 2,
        max_tables: int = 5,
    ) -> List[dict[str, Any]] | str:
        """Find available tables for a given date and time.

        `preferred_date` should be YYYY-MM-DD and `start_time` HH:MM.
        """
        try:
            target_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
        except ValueError:
            return "Invalid date format. Use YYYY-MM-DD"
        try:
            t = datetime.strptime(start_time, "%H:%M").time()
        except ValueError:
            return "Invalid time format. Use HH:MM"

        target_dt = datetime.combine(target_date, t).replace(tzinfo=timezone.utc)
        duration = timedelta(minutes=DEFAULT_RESERVATION_DURATION_MINUTES)

        async with get_db() as db:
            tables = await reservation_service.find_available_tables(
                reservation_datetime=target_dt,
                party_size=party_size,
                db=db,
                duration=duration,
                tenant_id=ctx.get_state("tenant_id"),
            )
            if not tables:
                return "No available tables found."
            results = []
            for table in tables[:max_tables]:
                results.append(
                    {
                        "id": table.id,
                        "table_number": table.table_number,
                        "capacity": table.capacity,
                        "location": table.location,
                    }
                )
            return results
