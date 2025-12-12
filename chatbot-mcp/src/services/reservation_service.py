from typing import List, Optional
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from src.db.models import Reservation, RestaurantTable, Patient


DEFAULT_RESERVATION_DURATION = timedelta(minutes=90)


async def create_reservation(
    customer: Patient,
    reservation_datetime: datetime,
    party_size: int,
    db: AsyncSession,
    table_id: int,
    status: str = "pending",
    special_request: Optional[str] = None,
):
    reservation = Reservation(
        customer_id=customer.id,
        table_id=table_id,
        reservation_date=reservation_datetime,
        party_size=party_size,
        status=status,
        special_request=special_request,
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


async def find_by_customer_number_and_datetime(
    phone_number: str, reservation_datetime: datetime, db: AsyncSession
) -> Optional[Reservation]:
    result = await db.execute(
        select(Reservation)
        .join(Patient)
        .where(
            Patient.phone_number == phone_number,
            Reservation.reservation_date == reservation_datetime,
        )
        .limit(1)
    )
    return result.scalars().first()


async def find_available_tables(
    reservation_datetime: datetime,
    party_size: int,
    db: AsyncSession,
    duration: timedelta = DEFAULT_RESERVATION_DURATION,
    location: Optional[str] = None,
) -> List[RestaurantTable]:
    """
    Return list of `RestaurantTable` objects that are available for the requested
    datetime and party size.

    Strategy:
    - Load reservations for the same date (to keep the query simple/portable),
      compute overlapping reservations in Python and exclude their table ids.
    - Return active tables with sufficient capacity and not in reserved set.
    """

    if reservation_datetime.tzinfo is None:
        reservation_datetime = reservation_datetime.replace(tzinfo=timezone.utc)

    start_dt = reservation_datetime
    end_dt = reservation_datetime + duration

    # fetch reservations for the same calendar date (status != cancelled)
    overlapping_reservations = (
        select(Reservation.table_id)
        .where(
            Reservation.status != "cancelled",
            Reservation.table_id.isnot(None),
            Reservation.reservation_date < end_dt,
            # Assuming reservation end time is reservation_date + duration
            Reservation.reservation_date > start_dt - duration,
        )
        .distinct()
    )
    filters = [
        RestaurantTable.is_active == True,
        RestaurantTable.capacity >= party_size,
    ]
    if (
        overlapping_reservations is not None
        and len(
            (
                reserved_table_ids := (await db.execute(overlapping_reservations))
                .scalars()
                .all()
            )
        )
        > 0
    ):
        filters.append(RestaurantTable.id.notin_(reserved_table_ids))
    if location:
        filters.append(RestaurantTable.location == location)
    tables_q = await db.execute(select(RestaurantTable).where(*filters))
    return tables_q.scalars().all()
