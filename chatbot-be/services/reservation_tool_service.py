"""
Local DB service functions for reservation tools.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Customer, Reservation, RestaurantTable


DEFAULT_RESERVATION_DURATION_MINUTES = 120
TABLE_CACHE_TTL_SECONDS = 300
_TABLE_CACHE: dict[int, tuple[datetime, list[RestaurantTable]]] = {}


async def check_table_availability(
    db: AsyncSession,
    *,
    reservation_date: datetime | None,
    party_size: int | None,
    location: str | None,
    tenant_id: int,
    duration_minutes: int = DEFAULT_RESERVATION_DURATION_MINUTES,
) -> str:
    if party_size is not None and party_size < 1:
        return "Party size must be at least 1."

    if reservation_date is None:
        all_tables = await _get_cached_active_tables(db=db, tenant_id=tenant_id)
        filtered_tables = _filter_tables(
            tables=all_tables,
            party_size=party_size,
            location=location,
        )
        if not filtered_tables:
            return "No active tables found for the requested filters."
        return "Active tables: " + _format_table_list(filtered_tables) + "."

    effective_party_size = party_size or 1
    free_tables = await _find_available_tables_for_filters(
        db=db,
        reservation_date=reservation_date,
        party_size=effective_party_size,
        location=location,
        tenant_id=tenant_id,
        duration_minutes=duration_minutes,
        exclude_reservation_id=None,
    )
    if not free_tables:
        return (
            f"No tables are currently available for party size {effective_party_size} at "
            f"{reservation_date.isoformat()}."
        )

    table_list = _format_table_list(free_tables)
    return (
        f"Available tables for {reservation_date.isoformat()} (party size {effective_party_size}): "
        f"{table_list}."
    )


async def reserve_table(
    db: AsyncSession,
    *,
    reservation_date: datetime,
    party_size: int,
    tenant_id: int,
    customer_name: str | None,
    phone_number: str | None,
    location_preference: str | None = None,
    special_request: str | None = None,
    duration_minutes: int = DEFAULT_RESERVATION_DURATION_MINUTES,
) -> str:
    if party_size < 1:
        return "Party size must be at least 1."

    customer = await _get_or_create_customer(
        db=db,
        tenant_id=tenant_id,
        customer_name=customer_name,
        phone_number=phone_number,
    )

    effective_location = await _resolve_location_preference(
        db=db,
        tenant_id=tenant_id,
        location_preference=location_preference,
        special_request=special_request,
    )

    free_tables = await _find_available_tables_for_filters(
        db=db,
        reservation_date=reservation_date,
        party_size=party_size,
        location=effective_location,
        tenant_id=tenant_id,
        duration_minutes=duration_minutes,
        exclude_reservation_id=None,
    )
    if not free_tables:
        return (
            f"Sorry, no table is available for party size {party_size} at "
            f"{reservation_date.isoformat()}"
            + (
                f" with location '{effective_location}'."
                if effective_location
                else "."
            )
        )

    selected_table = free_tables[0]
    reservation = Reservation(
        tenant_id=tenant_id,
        customer_id=customer.id,
        table_id=selected_table.id,
        reservation_date=reservation_date,
        party_size=party_size,
        status="confirmed",
        special_request=special_request,
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return (
        f"Reservation #{reservation.id} confirmed for {reservation_date.isoformat()} "
        f"on table {selected_table.table_number}"
        f"{f' ({selected_table.location})' if selected_table.location else ''} "
        f"for {party_size} guests."
    )


async def update_reservation(
    db: AsyncSession,
    *,
    reservation_id: int,
    tenant_id: int,
    reservation_date: datetime | None = None,
    party_size: int | None = None,
    location_preference: str | None = None,
    special_request: str | None = None,
    duration_minutes: int = DEFAULT_RESERVATION_DURATION_MINUTES,
) -> str:
    reservation = await _get_reservation(db=db, reservation_id=reservation_id, tenant_id=tenant_id)
    if not reservation:
        return f"Reservation #{reservation_id} not found."
    if reservation.status in ("cancelled", "completed", "no_show"):
        return (
            f"Reservation #{reservation_id} cannot be updated in status "
            f"'{reservation.status}'."
        )

    new_date = reservation_date or reservation.reservation_date
    new_party_size = party_size if party_size is not None else reservation.party_size
    effective_location = await _resolve_location_preference(
        db=db,
        tenant_id=tenant_id,
        location_preference=location_preference,
        special_request=special_request,
    )
    if new_party_size < 1:
        return "Party size must be at least 1."

    if (
        new_date != reservation.reservation_date
        or new_party_size != reservation.party_size
        or effective_location is not None
    ):
        free_tables = await _find_available_tables_for_filters(
            db=db,
            reservation_date=new_date,
            party_size=new_party_size,
            location=effective_location,
            tenant_id=tenant_id,
            duration_minutes=duration_minutes,
            exclude_reservation_id=reservation.id,
        )
        if not free_tables:
            return (
                f"Could not update reservation #{reservation_id}: no table available for "
                f"{new_party_size} guests at {new_date.isoformat()}"
                + (
                    f" with location '{effective_location}'."
                    if effective_location
                    else "."
                )
            )
        reservation.table_id = free_tables[0].id

    reservation.reservation_date = new_date
    reservation.party_size = new_party_size
    if special_request is not None:
        reservation.special_request = special_request

    await db.commit()
    await db.refresh(reservation)
    return (
        f"Reservation #{reservation.id} updated to {reservation.reservation_date.isoformat()} "
        f"for {reservation.party_size} guests."
    )


async def cancel_reservation(
    db: AsyncSession,
    *,
    reservation_id: int,
    tenant_id: int,
) -> str:
    reservation = await _get_reservation(db=db, reservation_id=reservation_id, tenant_id=tenant_id)
    if not reservation:
        return f"Reservation #{reservation_id} not found."
    if reservation.status == "cancelled":
        return f"Reservation #{reservation_id} is already cancelled."

    reservation.status = "cancelled"
    reservation.cancelled_at = datetime.utcnow()
    await db.commit()
    return f"Reservation #{reservation_id} has been cancelled."


async def _get_or_create_customer(
    db: AsyncSession,
    *,
    tenant_id: int,
    customer_name: str | None,
    phone_number: str | None,
) -> Customer:
    clean_name = customer_name.strip() if customer_name and customer_name.strip() else None
    clean_phone = phone_number.strip() if phone_number and phone_number.strip() else None

    if clean_phone:
        existing = await db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.phone_number == clean_phone,
            ).limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            if clean_name and not (customer.name and str(customer.name).strip()):
                customer.name = clean_name
                await db.flush()
            return customer

    if clean_name and not clean_phone:
        existing = await db.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.name == clean_name,
                Customer.phone_number.is_(None),
            ).limit(1)
        )
        customer = existing.scalars().first()
        if customer:
            return customer

    customer = Customer(
        tenant_id=tenant_id,
        name=clean_name,
        phone_number=clean_phone,
    )
    db.add(customer)
    await db.flush()
    return customer


async def _get_reservation(
    db: AsyncSession,
    *,
    reservation_id: int,
    tenant_id: int,
) -> Reservation | None:
    result = await db.execute(
        select(Reservation).where(
            Reservation.id == reservation_id,
            Reservation.tenant_id == tenant_id,
        ).limit(1)
    )
    return result.scalars().first()


async def _find_available_tables(
    db: AsyncSession,
    *,
    reservation_date: datetime,
    party_size: int,
    tenant_id: int,
    duration_minutes: int,
    exclude_reservation_id: int | None,
) -> list[RestaurantTable]:
    return await _find_available_tables_for_filters(
        db=db,
        reservation_date=reservation_date,
        party_size=party_size,
        location=None,
        tenant_id=tenant_id,
        duration_minutes=duration_minutes,
        exclude_reservation_id=exclude_reservation_id,
    )


async def _find_available_tables_for_filters(
    db: AsyncSession,
    *,
    reservation_date: datetime,
    party_size: int,
    location: str | None,
    tenant_id: int,
    duration_minutes: int,
    exclude_reservation_id: int | None,
) -> list[RestaurantTable]:
    all_tables = await _get_cached_active_tables(db=db, tenant_id=tenant_id)
    candidates = _filter_tables(
        tables=all_tables,
        party_size=party_size,
        location=location,
    )
    if not candidates:
        return []

    start = reservation_date
    end = reservation_date + timedelta(minutes=duration_minutes)
    table_ids = [t.id for t in candidates]

    overlap_query = (
        select(Reservation)
        .where(
            Reservation.tenant_id == tenant_id,
            Reservation.table_id.in_(table_ids),
            Reservation.status.in_(["pending", "confirmed"]),
            Reservation.reservation_date < end,
            Reservation.reservation_date > (start - timedelta(minutes=duration_minutes)),
        )
    )
    if exclude_reservation_id is not None:
        overlap_query = overlap_query.where(Reservation.id != exclude_reservation_id)

    overlap_result = await db.execute(overlap_query)
    overlapping = list(overlap_result.scalars().all())
    blocked_table_ids = {r.table_id for r in overlapping}
    return [table for table in candidates if table.id not in blocked_table_ids]


def _filter_tables(
    *,
    tables: list[RestaurantTable],
    party_size: int | None,
    location: str | None,
) -> list[RestaurantTable]:
    normalized_location = location.strip().lower() if location and location.strip() else None
    filtered = tables
    if party_size is not None:
        filtered = [t for t in filtered if t.capacity >= party_size]
    if normalized_location is not None:
        filtered = [
            t for t in filtered if t.location and normalized_location in t.location.lower()
        ]
    return sorted(filtered, key=lambda t: (t.capacity, t.id))


async def _get_cached_active_tables(
    db: AsyncSession,
    *,
    tenant_id: int,
) -> list[RestaurantTable]:
    now = datetime.utcnow()
    cached = _TABLE_CACHE.get(tenant_id)
    if cached is not None:
        cached_at, tables = cached
        if (now - cached_at).total_seconds() < TABLE_CACHE_TTL_SECONDS:
            return tables

    result = await db.execute(
        select(RestaurantTable)
        .where(
            RestaurantTable.tenant_id == tenant_id,
            RestaurantTable.is_active == True,  # noqa: E712
        )
        .order_by(RestaurantTable.capacity.asc(), RestaurantTable.id.asc())
    )
    tables = list(result.scalars().all())
    _TABLE_CACHE[tenant_id] = (now, tables)
    return tables


def _format_table_list(tables: list[RestaurantTable]) -> str:
    return ", ".join(
        f"id={t.id}/table={t.table_number}/cap={t.capacity}/location={t.location or 'unspecified'}"
        for t in tables
    )


async def _resolve_location_preference(
    db: AsyncSession,
    *,
    tenant_id: int,
    location_preference: str | None,
    special_request: str | None,
) -> str | None:
    if location_preference and location_preference.strip():
        return location_preference.strip()

    if not special_request or not special_request.strip():
        return None

    text = special_request.strip().lower()
    tables = await _get_cached_active_tables(db=db, tenant_id=tenant_id)
    known_locations = {
        str(table.location).strip()
        for table in tables
        if table.location and str(table.location).strip()
    }
    for location in sorted(known_locations, key=len, reverse=True):
        if location.lower() in text:
            return location
    return None
