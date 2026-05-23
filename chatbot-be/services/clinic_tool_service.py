"""
Local DB service functions for clinic appointment tools.
Mirrors the MCP clinic tools so the LangChain tools in clinic_tools.py
can work without an MCP round-trip.
"""

from __future__ import annotations

from datetime import datetime, timedelta, time, timezone, date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import json
import random

from db.models import Appointment, Availability, Doctor, Customer

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _resolve_doctor(
    db: AsyncSession,
    *,
    doctor_name: str | None,
    doctor_id: int | None,
    tenant_id: int,
    specialty: str | None = None,
) -> Doctor | None:
    query = select(Doctor).where(
        Doctor.tenant_id == tenant_id,
    )
    if doctor_id is not None:
        query = query.where(Doctor.id == doctor_id)
    if doctor_name is not None:
        query = query.where(func.lower(Doctor.name) == func.lower(doctor_name.strip()))
    if specialty:
        query = query.where(
            func.lower(Doctor.specialty) == func.lower(specialty.strip())
        )
    result = await db.execute(query.limit(1))
    return result.scalars().first()


async def _doctors_by_specialty(
    db: AsyncSession,
    *,
    specialty: str,
    tenant_id: int,
    limit: int,
) -> list[Doctor]:
    result = await db.execute(
        select(Doctor)
        .where(
            func.lower(Doctor.specialty) == func.lower(specialty.strip()),
            Doctor.tenant_id == tenant_id,
        )
        .order_by(func.rand())
        .limit(limit)
    )
    return result.scalars().all()


async def _availabilities(
    db: AsyncSession,
    *,
    doctor_id: int,
    day_of_week: str | None = None,
    from_time: time | None = None,
) -> list[Availability]:
    query = (
        select(Availability)
        .where(
            Availability.doctor_id == doctor_id,
        )
        .order_by(Availability.start_time)
    )
    if day_of_week:
        query = query.where(
            func.lower(Availability.day_of_week) == func.lower(day_of_week.strip())
        )
    if from_time:
        query = query.where(Availability.start_time >= from_time)
    result = await db.execute(query)
    return result.scalars().all()


async def _appointments_on_date(
    db: AsyncSession,
    *,
    doctor_id: int,
    tenant_id: int,
    target_date: date | None = None,
) -> list[Appointment]:
    query = select(Appointment).where(
        Appointment.doctor_id == doctor_id,
        Appointment.tenant_id == tenant_id,
        Appointment.status != "cancelled",
        Appointment.appointment_date.between(
            datetime.now(timezone.utc).date(),
            datetime.now(timezone.utc).date() + timedelta(days=30),
        ),
    )

    result = await db.execute(query)
    return result.scalars().all()


async def _find_customer(
    db: AsyncSession,
    *,
    phone_number: str,
    tenant_id: int,
) -> Customer | None:
    result = await db.execute(
        select(Customer)
        .where(
            Customer.phone_number == phone_number.strip(),
            Customer.tenant_id == tenant_id,
        )
        .limit(1)
    )
    return result.scalars().first()


async def _find_or_create_customer(
    db: AsyncSession,
    *,
    phone_number: str,
    customer_name: str | None,
    tenant_id: int,
) -> Customer:
    customer = await _find_customer(db, phone_number=phone_number, tenant_id=tenant_id)
    if customer is None:
        customer = Customer(
            phone_number=phone_number.strip(),
            tenant_id=tenant_id,
            name=(customer_name.strip() if customer_name else None),
        )
        db.add(customer)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            customer = await _find_customer(
                db, phone_number=phone_number, tenant_id=tenant_id
            )
    elif customer_name and not (customer.name and customer.name.strip()):
        customer.name = customer_name.strip()
        await db.flush()
    return customer


async def _find_customer_appointment(
    db: AsyncSession,
    *,
    customer_phone: str,
    appointment_date: Any,
    start_time: time,
    tenant_id: int,
) -> Appointment | None:
    customer = await _find_customer(
        db, phone_number=customer_phone, tenant_id=tenant_id
    )
    if customer is None:
        return None
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.doctor))
        .where(
            Appointment.customer_id == customer.id,
            Appointment.appointment_date == appointment_date,
            Appointment.start_time == start_time,
            Appointment.tenant_id == tenant_id,
        )
        .limit(1)
    )
    return result.scalars().first()


def _parse_iso(value: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _slot_list(
    *,
    doctor: Doctor,
    availabilities: list[Availability],
    booked: list[Appointment],
    target_date: Any | None = None,
    from_time: time | None = None,
    max_slots: int,
) -> list[dict[str, str]]:
    duration = timedelta(minutes=doctor.duration or 30)
    # if target_date is None:
    #     target_date = datetime.now(timezone.utc).date()
    slots: list[dict[str, str]] = []
    random_slot = False
    current_target: date = target_date
    for av in availabilities:
        if target_date is None:
            random_slot = True
            # If no specific date, just use the next occurrence of the availability's day
            current_target = _get_date_from_day_name(av.day_of_week)
        if current_target.strftime("%A").lower() != av.day_of_week.lower():
            continue
        if from_time and from_time >= av.end_time:
            continue

        slot_start = max(from_time, av.start_time) if from_time else av.start_time

        current = datetime.combine(current_target, slot_start)
        end = datetime.combine(current_target, av.end_time)
        while current + duration <= end:
            s, e = current.time(), (current + duration).time()
            if not any(a.start_time == s for a in booked):
                slots.append(
                    {
                        "date": current_target.strftime("%A %B %-d"),
                        "start_time": s.strftime("%I:%M %p"),
                        "end_time": e.strftime("%I:%M %p"),
                    }
                )
            current += duration
            if not random_slot and len(slots) >= max_slots:
                return slots
    random.shuffle(slots)  # randomize slots
    return slots[:max_slots]


# ---------------------------------------------------------------------------
# Public service functions (called by clinic_tools.py)
# ---------------------------------------------------------------------------


async def get_doctors_by_specialty(
    db: AsyncSession,
    *,
    doctor_name: str | None,
    specialty: str | None = None,
    experience: int | None = None,
    tenant_id: int,
    limit: int = 3,
) -> str:
    query = (
        select(Doctor)
        .where(Doctor.tenant_id == tenant_id)
        .order_by(func.rand())
        .limit(limit)
    )

    if doctor_name:
        query = query.where(func.lower(Doctor.name) == doctor_name.strip().lower())

    if specialty:
        query = query.where(func.lower(Doctor.specialty) == specialty.strip().lower())
    if experience:
        query = query.where(Doctor.experience >= experience)

    result = await db.execute(query)
    doctors = result.scalars().all()

    instructions = ""

    if specialty and not doctors:
        specialties = await db.execute(
            select(Doctor.specialty).where(Doctor.tenant_id == tenant_id).distinct()
        )
        specialties = specialties.scalars().all()
        instructions = (
            f"The requested specialty '{specialty}' was not found in our system. "
            f"Available specialties are: {', '.join([s for s in specialties])}. "
            "Follow these rules strictly: "
            "1. If the user's specialty appears to be a spelling mistake or very close match "
            "to one of the available specialties (for example 'ANT' instead of 'ENT'), "
            "ask a clarification question such as 'Did you mean ENT?'. "
            "2. If the specialty name is spelled correctly or understandable, but that specialty "
            "does not exist in our database, politely apologize and say that this specialty "
            "is currently not available. Do NOT suggest unrelated specialties or doctors. "
            "3. Do not guess unrelated specialties. "
            "Only suggest a correction when the similarity is clearly obvious. "
            "4. If uncertain whether it is a typo or a different specialty, ask for clarification "
            "instead of assuming."
        )
        return json.dumps({"instructions": instructions})

    # fallback if no exact match
    if not doctors:
        fallback_query = (
            select(Doctor).where(Doctor.tenant_id == tenant_id).order_by(func.rand())
        )

        fallback_result = await db.execute(fallback_query)
        doctors = fallback_result.scalars().all()

        missing_parts = []

        if doctor_name:
            missing_parts.append(f'doctor name "{doctor_name}"')

        # if specialty:
        #     missing_parts.append(f'specialty "{specialty}"')
        if experience:
            missing_parts.append(f"experience of {experience}+ years")

        missing_text = " and ".join(missing_parts)

        instructions = (
            f"No exact match found for {missing_text}. ",
            "Politely suggest the closest available doctors conversationally.",
            "Do not use numbered lists, bullets, or markdown.",
        )

    else:
        instructions = (
            "Mention doctors conversationally. "
            "Do not use numbered lists, bullets, markdown, or prefixes like "
            "'1.', '2.', 'first', or 'second'."
        )

    return json.dumps(
        {
            "instructions": instructions,
            "doctors": [
                {
                    "id": d.id,
                    "name": d.name,
                    "experience_years": d.experience,
                    "specialty": d.specialty,
                    "spoken_summary": (
                        f"{d.name} has {d.experience} years of experience "
                        f"in {d.specialty}."
                    ),
                }
                for d in doctors
            ],
        }
    )


async def get_doctor_weekly_schedule(
    db: AsyncSession,
    *,
    doctor_name: str | None,
    doctor_id: int | None,
    tenant_id: int,
    specialty: str | None = None,
) -> str:
    doctor = await _resolve_doctor(
        db,
        doctor_name=doctor_name,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        specialty=specialty,
    )
    if not doctor:
        return f"Doctor '{doctor_name}' not found."

    avs = await _availabilities(db, doctor_id=doctor.id)
    if not avs:
        return f"Dr. {doctor.name} has no schedule set up."

    day_order = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]
    by_day: dict[str, list[Availability]] = {d: [] for d in day_order}
    for av in avs:
        by_day[av.day_of_week.lower()].append(av)

    schedule: list[dict] = []
    for day in day_order:
        slots = by_day[day]
        if not slots:
            continue
        slots.sort(key=lambda a: a.start_time)
        schedule.append(
            {
                "day": day.capitalize(),
                "hours": [
                    f"{s.start_time.strftime('%I:%M %p')} – {s.end_time.strftime('%I:%M %p')}"
                    for s in slots
                ],
            }
        )

    return json.dumps(
        {
            "doctor": doctor.name,
            "specialty": doctor.specialty,
            "slot_duration_minutes": doctor.duration or 30,
            "weekly_schedule": schedule,
            "instructions": (
                "Do not use numbers, list, bullets. mention weekly schedules conversationally"
            ),
        }
    )


async def get_doctor_available_slots(
    db: AsyncSession,
    *,
    doctor_name: str | None,
    doctor_id: int | None,
    preferred_date: str | None = None,
    tenant_id: int,
    specialty: str | None = None,
    start_time: str | None = None,
    max_slots: int = 1,
) -> str:
    doctor = await _resolve_doctor(
        db,
        doctor_name=doctor_name,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        specialty=specialty,
    )
    if not doctor:
        return f"Doctor '{doctor_name}' not found."
    target_date: date | None = None
    if preferred_date:
        try:
            target_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
        except ValueError:
            return "Invalid date format. Use YYYY-MM-DD."

        if target_date < datetime.now(timezone.utc).date():
            return "Preferred date must be today or in the future."

    from_time: time | None = None
    if start_time:
        try:
            from_time = datetime.strptime(start_time, "%H:%M").time()
        except ValueError:
            return "Invalid start_time format. Use HH:MM."
    # else:
    #     from_time = datetime.now(timezone.utc).time()

    # day_name = target_date.strftime("%A").lower()
    avs = await _availabilities(
        db,
        doctor_id=doctor.id,
    )
    if not avs:
        return f"Dr. {doctor.name} has no availability."

    booked = await _appointments_on_date(
        db, doctor_id=doctor.id, target_date=target_date, tenant_id=tenant_id
    )

    slots = _slot_list(
        doctor=doctor,
        availabilities=avs,
        booked=booked,
        target_date=target_date,
        from_time=from_time,
        max_slots=max_slots,
    )
    if not slots:
        slots = _slot_list(
            doctor=doctor, availabilities=avs, booked=booked, max_slots=max_slots
        )

    return json.dumps(
        {
            "doctor": doctor.name,
            "open_slots": slots,
            "instructions": (
                "No open slots for requested date or time. However"
                if preferred_date or from_time
                else ""
                "These are open slots."
                "If the user asks for another date or preferred time, "
                "call this tool again with the updated preference."
            ),
        }
    )


days_map = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def _get_date_from_day_name(day_name):
    today = datetime.now(timezone.utc)
    current_day_idx = today.weekday()
    target_day_idx = days_map.get(day_name.lower())
    if target_day_idx is None:
        raise ValueError("Invalid day name")

    days_ahead = (target_day_idx - current_day_idx + 7) % 7
    return today.date() + timedelta(days=days_ahead)


async def book_appointment(
    db: AsyncSession,
    *,
    customer_phone: str,
    customer_name: str | None,
    preferred_datetime_iso: str,
    doctor_name: str | None,
    doctor_id: int | None,
    call_sid: str | None,
    tenant_id: int,
    specialty: str | None = None,
    notes: str | None = None,
) -> str:
    dt = _parse_iso(preferred_datetime_iso)
    if dt is None:
        return "Invalid date/time format. Use ISO 8601, e.g. '2025-06-15T10:00:00'."
    if dt <= datetime.now(timezone.utc):
        return "Appointment date must be in the future."

    doctor = await _resolve_doctor(
        db,
        doctor_name=doctor_name,
        doctor_id=doctor_id,
        tenant_id=tenant_id,
        specialty=specialty,
    )
    if not doctor:
        if specialty:
            fallback = await _doctors_by_specialty(
                db, specialty=specialty, tenant_id=tenant_id, limit=1
            )
            if fallback:
                doctor = fallback[0]
        if not doctor:
            return f"Doctor '{doctor_name}' not found."

    duration = timedelta(minutes=doctor.duration or 30)
    day_name = dt.date().strftime("%A").lower()
    avs = await db.execute(
        select(Availability).where(
            Availability.doctor_id == doctor.id,
            Availability.day_of_week == day_name,
            Availability.start_time <= dt.time(),
            Availability.end_time >= (dt + duration).time(),
        )
    )
    if not avs.scalars().all():
        return (
            f"Dr. {doctor.name} is not available on "
            f"{dt.strftime('%A')}s at {dt.strftime('%H:%M')}."
        )

    customer = await _find_or_create_customer(
        db,
        phone_number=customer_phone,
        customer_name=customer_name,
        tenant_id=tenant_id,
    )

    appt = Appointment(
        tenant_id=tenant_id,
        customer_id=customer.id,
        doctor_id=doctor.id,
        appointment_date=dt.date(),
        start_time=dt.time(),
        end_time=(dt + duration).time(),
        call_sid=call_sid,
        status="scheduled",
        notes=notes,
    )
    db.add(appt)
    try:
        await db.commit()
        await db.refresh(appt)
    except IntegrityError:
        await db.rollback()
        return "That slot is already taken. Please choose a different time."
    except Exception as e:
        await db.rollback()
        raise RuntimeError(f"Could not book appointment: {e}") from e

    return (
        f"Appointment booked. ID: {appt.id}. "
        f"{doctor.name} on {dt.strftime('%A, %B %d, at %I:%M %p')}. "
        "A confirmation SMS will be sent."
    )


async def cancel_appointment(
    db: AsyncSession,
    *,
    customer_phone: str,
    appointment_datetime_iso: str,
    tenant_id: int,
) -> str:
    dt = _parse_iso(appointment_datetime_iso)
    if dt is None:
        return "Invalid date/time format. Use ISO 8601."
    if dt <= datetime.now(timezone.utc):
        return "Appointment date must be in the future."

    appt = await _find_customer_appointment(
        db,
        customer_phone=customer_phone,
        appointment_date=dt.date(),
        start_time=dt.time(),
        tenant_id=tenant_id,
    )
    if not appt:
        return f"No appointment found at {dt.strftime('%A, %B %d, at %I:%M %p')}."
    if appt.status == "cancelled":
        return "That appointment is already cancelled."

    appt.status = "cancelled"
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise RuntimeError(f"Could not cancel appointment: {e}") from e

    return (
        f"Appointment on {dt.strftime('%A, %B %d, at %I:%M %p')} cancelled. "
        "A confirmation SMS will be sent."
    )


async def reschedule_appointment(
    db: AsyncSession,
    *,
    customer_phone: str,
    current_datetime_iso: str,
    new_datetime_iso: str,
    tenant_id: int,
) -> str:
    current_dt = _parse_iso(current_datetime_iso)
    new_dt = _parse_iso(new_datetime_iso)
    if current_dt is None or new_dt is None:
        return "Invalid date/time format. Use ISO 8601."
    if new_dt <= datetime.now(timezone.utc):
        return "New appointment date must be in the future."

    appt = await _find_customer_appointment(
        db,
        customer_phone=customer_phone,
        appointment_date=current_dt.date(),
        start_time=current_dt.time(),
        tenant_id=tenant_id,
    )
    if not appt or appt.status != "scheduled":
        return (
            f"No active appointment at "
            f"{current_dt.strftime('%A, %B %d, at %I:%M %p')}."
        )

    doctor = appt.doctor
    duration = timedelta(minutes=doctor.duration or 30)
    day_name = new_dt.date().strftime("%A").lower()
    avs = await db.execute(
        select(Availability).where(
            Availability.doctor_id == doctor.id,
            Availability.day_of_week == day_name,
            Availability.start_time <= new_dt.time(),
            Availability.end_time >= (new_dt + duration).time(),
        )
    )
    if not avs.scalars().all():
        return (
            f"Dr. {doctor.name} is not available on "
            f"{new_dt.strftime('%A')}s at {new_dt.strftime('%H:%M')}."
        )

    appt.appointment_date = new_dt.date()
    appt.start_time = new_dt.time()
    appt.end_time = (new_dt + duration).time()
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return "That slot is already taken. Please choose a different time."
    except Exception as e:
        await db.rollback()
        raise RuntimeError(f"Could not reschedule appointment: {e}") from e

    return (
        f"Appointment rescheduled from "
        f"{current_dt.strftime('%A, %B %d, at %I:%M %p')} to "
        f"{new_dt.strftime('%A, %B %d, at %I:%M %p')}. "
        "A confirmation SMS will be sent."
    )


async def get_upcoming_appointments(
    db: AsyncSession,
    *,
    customer_phone: str,
    tenant_id: int,
    limit: int = 5,
) -> str:
    customer = await _find_customer(
        db, phone_number=customer_phone, tenant_id=tenant_id
    )
    if not customer:
        return "No customer profile found for this caller."

    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.doctor))
        .where(
            Appointment.customer_id == customer.id,
            Appointment.tenant_id == tenant_id,
            Appointment.appointment_date >= today,
            Appointment.status == "scheduled",
        )
        .order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc())
        .limit(max(1, min(int(limit), 10)))
    )
    appointments = result.scalars().all()
    if not appointments:
        return "No upcoming appointments found."

    lines = [
        f"- ID {a.id}: Dr. {a.doctor.name} on "
        f"{a.appointment_date.strftime('%A, %B %d,')} "
        f"at {a.start_time.strftime('%I:%M %p')}" + (f" — {a.notes}" if a.notes else "")
        for a in appointments
    ]
    return "Upcoming appointments:\n" + "\n".join(lines)
