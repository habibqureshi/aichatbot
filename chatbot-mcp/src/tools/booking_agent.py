from fastmcp import FastMCP, Context
from datetime import datetime, timedelta, timezone, date as date_cls
from typing import Any, Dict, List, Tuple
from datetime import date, timedelta, time
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from twilio.rest import Client

from src.db.db import get_db
from src.db.models import Appointment, Availability, Doctor, Patient
from src.services import appointment_service, patient_service
from src.configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


async def _get_random_doctors_by_specialty(
    speciality: str, limit: int, db
) -> List[Doctor]:
    result = await db.execute(
        select(Doctor)
        .where(func.lower(Doctor.specialty) == func.lower(speciality))
        .order_by(func.rand())
        .limit(limit)
    )
    return result.scalars().all()


async def _resolve_doctor_by_name(
    db, doctor_name: str, speciality: str | None = None
) -> Doctor | None:
    query = select(Doctor).where(func.lower(Doctor.name) == func.lower(doctor_name))
    if speciality:
        query = query.where(func.lower(Doctor.specialty) == func.lower(speciality))
    result = await db.execute(query.limit(1))
    return result.scalars().first()


async def _load_future_availabilities(
    db, doctor_id: int, day_of_week: str, start_time: time | None = None
) -> List[Availability]:
    query = (
        select(Availability)
        .where(
            Availability.doctor_id == doctor_id, Availability.day_of_week == day_of_week
        )
        .order_by(Availability.start_time)
    )
    if start_time:
        query = query.where(Availability.start_time >= start_time)
    result = await db.execute(query)
    return result.scalars().all()


async def _load_future_appointments(
    db, doctor_id: int, target_date: date
) -> List[Appointment]:
    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == target_date,
            Appointment.status != "cancelled",
        )
        .order_by(Appointment.appointment_date.asc())
    )
    return result.scalars().all()


def register_tools(mcp: FastMCP):
    @mcp.tool(tags=["clinic"])
    async def booking_appointment(
        patient_name: str,
        preferred_date: str,
        ctx: Context,
        doctor_name: str,
        speciality: str | None = None,
        notes: str | None = None,
    ):
        """
        Schedule a new appointment for a patient.

        Args:
            patient_name: Full name of the patient
            preferred_date: Preferred appointment date with time (e.g., "Monday", "Jan 15", "next week") must be in iso format
            doctor_name: doctor name to associate with the appointment
            speciality: speciality name to disambiguate doctor
            notes: Optional notes to attach to the appointment
        """
        try:
            date = datetime.fromisoformat(preferred_date)
        except ValueError:
            return "Invalid date and time passed"

        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if date <= now:
            return "Appointment date must be in the future"

        async with get_db() as db:

            patient = await patient_service.find_or_create(
                phone_number=ctx.get_state("patient_number"), db=db
            )
            if patient.name is None:
                patient.name = patient_name
                patient = await patient_service.update(patient=patient, db=db)

            doctor = await _resolve_doctor_by_name(db, doctor_name, speciality)
            if not doctor:
                if speciality:
                    doctor = await _get_random_doctors_by_specialty(
                        speciality=speciality, limit=1, db=db
                    )
                    if not doctor:
                        return f"Doctor '{doctor_name}' with specialty '{speciality}' not found"
                    else:
                        doctor = doctor[0]
                return "Doctor not found"

            availability = await db.execute(
                select(Availability).where(
                    Availability.doctor_id == doctor.id,
                    Availability.day_of_week == date.date().strftime("%A").lower(),
                    Availability.start_time <= date.time(),
                    Availability.end_time
                    >= (date + timedelta(minutes=doctor.duration or 30)).time(),
                )
            )
            availability = availability.scalars().all()
            if not availability:
                return (
                    f"Doctor {doctor.name} is not available on {date.strftime('%A')}s"
                )

            try:
                await appointment_service.create_appointment(
                    patient=patient,
                    db=db,
                    appointment_date=date.date(),
                    start_time=date.time(),
                    end_time=(date + timedelta(minutes=doctor.duration or 30)).time(),
                    call_sid=ctx.get_state("call_sid"),
                    doctor_id=doctor.id,
                    notes=notes,
                )
                return f"Appointment scheduled for {patient_name} on {date.strftime('%A, %B %d, %Y at %I:%M %p')}. Confirmation will be sent by sms."
            except IntegrityError:
                await db.rollback()
                return "Appointment slot is not available."
            except Exception as e:
                await db.rollback()
                print(f"Error while booking appointment: {e}")
                return "Something went wrong while booking your appointment."

    @mcp.tool(tags=["clinic"])
    async def cancel_appointment(appointment_date: str, duration: int, ctx: Context):
        """Cancel an existing appointment.

        Args:
            appointment_date: Date and time of the appointment to cancel must be in iso format
            duration: duration of appointment in minutes
        """
        try:
            date = datetime.fromisoformat(appointment_date)
        except ValueError:
            return "Invalid date and time passed"
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if date <= now:
            return "Appointment date must be in the future"
        async with get_db() as db:
            appointment = await appointment_service.find_by_patient_number_and_date(
                patient_number=ctx.get_state("patient_number"),
                appointment_date=date.date(),
                start_time=date.time(),
                duration=timedelta(minutes=duration),
                db=db,
            )
            if not appointment:
                return f"No appointment scheduled at  {date.strftime('%A, %B %d, %Y at %I:%M %p')}"
            if appointment.status == "cancelled":
                return "Appointment already cancelled"
            appointment.status = "cancelled"
            await db.commit()
            return f"Appointment on {date.strftime('%A, %B %d, %Y at %I:%M %p')} has been cancelled. Confirmation will be sent by sms."

    @mcp.tool(tags=["clinic"])
    async def reschedule_appointment(
        current_date: str, new_date: str, duration: int, ctx: Context
    ):
        """Reschedule an existing appointment to a new date and time.

        Args:
            current_date: Current appointment date must be in iso format
            new_date: New appointment date must be in iso format
            duration: duration of appointment in minutes
        """
        try:
            date = datetime.fromisoformat(current_date)
            new_appointment_date = datetime.fromisoformat(new_date)
        except ValueError:
            return "Invalid date and time passed"
        if new_appointment_date.tzinfo is None:
            new_appointment_date = new_appointment_date.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if new_appointment_date <= now:
            return "Appointment date must be in the future"

        async with get_db() as db:
            appointment = await appointment_service.find_by_patient_number_and_date(
                patient_number=ctx.get_state("patient_number"),
                db=db,
                appointment_date=date.date(),
                start_time=date.time(),
                duration=timedelta(minutes=duration),
            )
            if not appointment or appointment.status != "scheduled":
                return f"No appointment scheduled at {date.strftime('%A, %B %d, %Y at %I:%M %p')}"
            availability = await db.execute(
                select(Availability).where(
                    Availability.doctor_id == appointment.doctor.id,
                    Availability.day_of_week == date.date().strftime("%A").lower(),
                    Availability.start_time <= date.time(),
                    Availability.end_time
                    >= (
                        date + timedelta(minutes=appointment.doctor.duration or 30)
                    ).time(),
                )
            )
            availability = availability.scalars().all()
            if not availability:
                return f"Doctor {appointment.doctor.name} is not available on {date.strftime('%A')}s"
            try:
                appointment.appointment_date = new_appointment_date
                await db.commit()
                return f"Appointment rescheduled from {date.strftime('%A, %B %d, %Y at %I:%M %p')} to {new_appointment_date.strftime('%A, %B %d, %Y at %I:%M %p')}"
            except IntegrityError:
                await db.rollback()
                return "Appointment slot is not available."
            except Exception as e:
                await db.rollback()
                print(f"Error while booking appointment: {e}")
                return "Something went wrong while booking your appointment."

    @mcp.tool(tags=["clinic"])
    async def find_random_doctors_by_speciality(
        speciality: str, k: int = 3
    ) -> list[dict[str, Any]] | str:
        """If user did not mentioned any doctor then first call this tool to confirm doctor first then do booking."""

        async with get_db() as db:
            doctors = await _get_random_doctors_by_specialty(
                speciality=speciality, limit=k, db=db
            )
            if not doctors:
                return f"No doctors found for speciality '{speciality}'"
            return [
                {
                    "id": doctor.id,
                    "name": doctor.name,
                    "specialty": speciality,
                    "duration": doctor.duration,
                }
                for doctor in doctors
            ]

    @mcp.tool(tags=["clinic"])
    async def find_doctor_empty_slots(
        doctor_name: str,
        preferred_date: str,
        speciality: str | None = None,
        start_time: str | None = None,
        max_slots: int = 3,
    ) -> list[dict[str, str]] | str:
        """
        This tool helps to find empty slots for a given doctor. It mainly returns the booked slots and availabilities of the doctor. The agent can then use this information to suggest available slots to the user.
        Don't forget to mention slot duration.
        Args:
            doctor_name: Name of the doctor
            preferred_date: Preferred date to find slots (in YYYY-MM-DD format)
            speciality: Speciality to disambiguate doctor
            start_time: Optional start time to filter slots (in HH:MM format)
            max_slots: Maximum number of slots to return
        """
        async with get_db() as db:
            doctor = await _resolve_doctor_by_name(db, doctor_name, speciality)
            if not doctor:
                return "Doctor not found"
            try:
                target_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
            except ValueError:
                return "Invalid date and time passed"

            if start_time:
                try:
                    target_time = datetime.strptime(start_time, "%H:%M").time()
                except ValueError:
                    return "Invalid start time format. Use HH:MM format."

            day_name = target_date.strftime("%A").lower()
            date_today = datetime.now(timezone.utc).date()
            print(
                f"Target date: {target_date}, Today: {date_today}, Day name: {day_name}"
            )
            if target_date < date_today:
                return "Preferred date must be today or in the future"

            availabilities = await _load_future_availabilities(
                db, doctor.id, day_name, start_time
            )
            if len(availabilities) == 0:
                return f"No availabilities found for {doctor.name} on {day_name.capitalize()}s"

            appointments = await _load_future_appointments(db, doctor.id, target_date)
            slots = []
            duration = timedelta(minutes=doctor.duration or 30)
            for availability in availabilities:
                current_time = datetime.combine(
                    target_date, target_time or availability.start_time
                )
                end_time = datetime.combine(target_date, availability.end_time)
                while current_time + duration <= end_time:
                    slot_start = current_time.time()
                    slot_end = (current_time + duration).time()
                    is_booked = any(
                        appt.start_time == slot_start and appt.end_time == slot_end
                        for appt in appointments
                    )
                    if not is_booked:
                        slots.append(
                            {
                                "start_time": slot_start.strftime("%H:%M"),
                                "end_time": slot_end.strftime("%H:%M"),
                            }
                        )
                    current_time += duration
                    if len(slots) >= max_slots:
                        break
                if len(slots) >= max_slots:
                    break

            return slots if slots else "No available slots found."
