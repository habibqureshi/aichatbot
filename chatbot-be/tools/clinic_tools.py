"""
LangChain tools for clinic appointment management.
Runs directly against the local DB (no MCP round-trip).
Each tool uses get_stream_writer() to emit progress events consumed by
the order_service stream pipeline.
"""

from __future__ import annotations

from typing import Any, Optional
from logging import Logger

from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:
    _get_stream_writer = None  # type: ignore[misc, assignment]

from services import clinic_tool_service


def _emit(payload: dict[str, Any], log: Logger) -> None:
    sw_status = "skipped"
    if _get_stream_writer is not None:
        try:
            writer = _get_stream_writer()
            if writer is not None:
                writer({"type": "clinic_tool", **payload})
                sw_status = "ok"
            else:
                sw_status = "no_op_writer"
        except Exception as e:
            sw_status = f"exc:{type(e).__name__}"
    else:
        sw_status = "import_missing"
    log.info(
        "CLINIC_TOOL_PROGRESS | tool=%s phase=%s stream_writer=%s",
        payload.get("tool"),
        payload.get("phase"),
        sw_status,
    )


def build_clinic_tools(
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    customer_phone: str | None = None,
    customer_name: str | None = None,
    call_sid: str | None = None,
) -> list:
    """Return LangChain tools bound to the given DB session / tenant."""

    @tool
    async def find_doctors(
        doctor_name: str | None = None,
        specialty: str | None = None,
        experience: int | None = None,
        limit: int = 3,
    ) -> str:
        """Find available doctors for a given specialty.

        Call this when the caller hasn't mentioned a specific doctor, or to
        confirm doctor options before booking.

        Args:
            specialty: optional Medical specialty, e.g. 'cardiology', 'general', 'dermatology'.
            doctor_name: Optional exact name of the doctor to find.
            experience: Optional minimum years of experience.
            limit: How many doctors to return (1–5). Default 3.
        """
        _emit({"tool": "find_doctors", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.get_doctors_by_specialty(
                db,
                doctor_name=doctor_name,
                experience=experience,
                specialty=specialty,
                tenant_id=tenant_id,
                limit=max(1, min(int(limit), 5)),
            )
            log.info("find_doctors result: %s", result)
            _emit({"tool": "find_doctors", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("find_doctors tool failed: %s", e)
            _emit(
                {
                    "tool": "find_doctors",
                    "phase": "error",
                    "error": str(e),
                },
                log,
            )
            raise

    @tool
    async def find_available_slots(
        preferred_date: str | None = None,
        doctor_id: Optional[int] = None,
        doctor_name: str | None = None,
        specialty: Optional[str] = None,
        start_time: Optional[str] = None,
        max_slots: int = 1,
    ) -> str:
        """Find open appointment slots for a doctor on a given date.

        Call this before booking to show the caller available times, and to confirm the doctor has openings on the requested date.

        Args:
            doctor_id: ID of the doctor to check availability for. Optional if doctor_name is provided.
            doctor_name: Full name of the doctor. Optional if doctor_id is provided.
            preferred_date: Optional date to check in YYYY-MM-DD format
            specialty: Optional specialty to disambiguate doctors with the same name.
            start_time: Optional earliest time to show slots from, in HH:MM format.
            max_slots: Maximum number of slots to return (1–2). Default 1.
        """
        _emit({"tool": "find_available_slots", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.get_doctor_available_slots(
                db,
                doctor_name=doctor_name,
                doctor_id=doctor_id,
                preferred_date=preferred_date,
                tenant_id=tenant_id,
                specialty=specialty,
                start_time=start_time,
                max_slots=max_slots,
            )
            log.info("find_available_slots result: %s", result)
            _emit({"tool": "find_available_slots", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("find_available_slots tool failed: %s", e)
            _emit(
                {"tool": "find_available_slots", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def book_appointment(
        appointment_datetime: str,
        doctor_name: str | None,
        doctor_id: Optional[int] = None,
        user_confirmation: bool = False,
        specialty: Optional[str] = None,
        notes: Optional[str] = None,
        caller_name: Optional[str] = None,
    ) -> str:
        """Book a new appointment for the caller.

        Always call find_available_slots first so the caller picks a confirmed
        free slot. Require explicit confirmation before calling this tool.

        Args:
            doctor_name: Full name of the doctor.
            appointment_datetime: ISO 8601 date+time, e.g. '2025-06-15T10:00:00'.
            user_confirmation: Must be True — caller explicitly confirmed the booking.
            specialty: Optional specialty to disambiguate doctors.
            notes: Optional reason for visit or extra notes.
            caller_name: Patient's name if not already on file.
        """
        if not user_confirmation:
            raise Exception(
                "Ask the caller to confirm the appointment details before booking."
            )
        _emit({"tool": "book_appointment", "phase": "start"}, log)
        try:
            name = caller_name or customer_name
            result = await clinic_tool_service.book_appointment(
                db,
                customer_phone=customer_phone or "",
                customer_name=name,
                preferred_datetime_iso=appointment_datetime,
                doctor_name=doctor_name,
                doctor_id=doctor_id,
                call_sid=call_sid,
                tenant_id=tenant_id,
                specialty=specialty,
                notes=notes,
            )
            _emit({"tool": "book_appointment", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("book_appointment tool failed: %s", e)
            _emit(
                {"tool": "book_appointment", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def cancel_appointment(
        appointment_datetime: str,
        user_confirmation: bool = False,
    ) -> str:
        """Cancel an existing scheduled appointment for the caller.

        Args:
            appointment_datetime: ISO 8601 date+time of the appointment to cancel,
                e.g. '2025-06-15T10:00:00'.
            user_confirmation: Must be True — caller explicitly confirmed cancellation.
        """
        if not user_confirmation:
            raise Exception(
                f"Ask the caller to confirm they want to cancel the appointment at "
                f"{appointment_datetime}."
            )
        _emit({"tool": "cancel_appointment", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.cancel_appointment(
                db,
                customer_phone=customer_phone or "",
                appointment_datetime_iso=appointment_datetime,
                tenant_id=tenant_id,
            )
            _emit({"tool": "cancel_appointment", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("cancel_appointment tool failed: %s", e)
            _emit(
                {"tool": "cancel_appointment", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def reschedule_appointment(
        current_appointment_datetime: str,
        new_appointment_datetime: str,
        user_confirmation: bool = False,
    ) -> str:
        """Reschedule an existing appointment to a new date and time.

        Always call find_available_slots for the new date first to confirm
        the slot is free. Require explicit confirmation before calling.

        Args:
            current_appointment_datetime: ISO 8601 date+time of the existing
                appointment, e.g. '2025-06-15T10:00:00'.
            new_appointment_datetime: ISO 8601 date+time for the new slot,
                e.g. '2025-06-20T14:00:00'.
            user_confirmation: Must be True — caller explicitly confirmed the change.
        """
        if not user_confirmation:
            raise Exception(
                "Ask the caller to confirm the reschedule before making the change."
            )
        _emit({"tool": "reschedule_appointment", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.reschedule_appointment(
                db,
                customer_phone=customer_phone or "",
                current_datetime_iso=current_appointment_datetime,
                new_datetime_iso=new_appointment_datetime,
                tenant_id=tenant_id,
            )
            _emit({"tool": "reschedule_appointment", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("reschedule_appointment tool failed: %s", e)
            _emit(
                {"tool": "reschedule_appointment", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def get_my_appointments(limit: int = 5) -> str:
        """Fetch the caller's upcoming scheduled appointments.

        Use when the caller asks 'what are my appointments', 'do I have
        anything booked', or 'when is my next appointment'.

        Args:
            limit: How many upcoming appointments to return (1–10). Default 5.
        """
        _emit({"tool": "get_my_appointments", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.get_upcoming_appointments(
                db,
                customer_phone=customer_phone or "",
                tenant_id=tenant_id,
                limit=limit,
            )
            _emit({"tool": "get_my_appointments", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("get_my_appointments tool failed: %s", e)
            _emit(
                {"tool": "get_my_appointments", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def get_doctor_weekly_schedule(
        doctor_name: str | None = None,
        doctor_id: Optional[int] = None,
        specialty: Optional[str] = None,
    ) -> str:
        """Get a doctor's weekly recurring schedule (which days and hours they work).

        Use when the caller asks when a doctor is available in general,
        what days they work, or what their clinic hours are.

        Args:
            doctor_name: Full name of the doctor.
            doctor_id: Doctor ID if known.
            specialty: Optional specialty to disambiguate.
        """
        _emit({"tool": "get_doctor_weekly_schedule", "phase": "start"}, log)
        try:
            result = await clinic_tool_service.get_doctor_weekly_schedule(
                db,
                doctor_name=doctor_name,
                doctor_id=doctor_id,
                tenant_id=tenant_id,
                specialty=specialty,
            )
            log.info("get_doctor_weekly_schedule result: %s", result)
            _emit({"tool": "get_doctor_weekly_schedule", "phase": "done"}, log)
            return result
        except Exception as e:
            log.exception("get_doctor_weekly_schedule tool failed: %s", e)
            _emit(
                {
                    "tool": "get_doctor_weekly_schedule",
                    "phase": "error",
                    "error": str(e),
                },
                log,
            )
            raise

    return [
        find_doctors,
        find_available_slots,
        get_doctor_weekly_schedule,
        book_appointment,
        cancel_appointment,
        reschedule_appointment,
        get_my_appointments,
    ]
