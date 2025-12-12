from schemas.common import TimezoneMixin
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import ClassVar
from schemas.availability import AvailabilitySlotCreate


class DoctorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    # specialty stored as string (name or code)
    specialty: str | None
    phone_number: str | None
    created_at: datetime
    duration: int | None


class Doctor(TimezoneMixin, DoctorBase):
    availabilities: list[AvailabilitySlotCreate]
    _timezone_fields: ClassVar[list[str]] = ["created_at"]


class DoctorCreate(BaseModel):
    name: str
    specialty: str | None
    phone_number: str | None
    availabilities: list[AvailabilitySlotCreate]
    duration: int | None
    model_config = ConfigDict(from_attributes=True)


class DoctorUpdate(BaseModel):
    name: str | None = None
    specialty: str | None = None
    phone_number: str | None = None
    availabilities: list[AvailabilitySlotCreate] | None = None
    model_config = ConfigDict(from_attributes=True)
