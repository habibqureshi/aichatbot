from __future__ import annotations

from datetime import datetime, time
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict

from schemas.common import TimezoneMixin

DayOfWeekLiteral = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


class AvailabilitySlotCreate(BaseModel):
    start_time: time
    end_time: time
    day_of_week: DayOfWeekLiteral

    model_config = ConfigDict(from_attributes=True)


class Availability(TimezoneMixin, BaseModel):
    id: int
    doctor_id: int
    start_time: time
    end_time: time
    day_of_week: DayOfWeekLiteral
    created_at: datetime

    _timezone_fields: ClassVar[list[str]] = ["start_time", "end_time", "created_at"]

    model_config = ConfigDict(from_attributes=True)
