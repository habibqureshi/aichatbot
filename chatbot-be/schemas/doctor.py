from schemas.common import TimezoneMixin
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import ClassVar
from schemas.speciality import SpecialityBase
from schemas.availability import AvailabilitySlotCreate


class DoctorBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    specialty: SpecialityBase | None
    phone_number: str | None
    created_at: datetime
    duration: int | None


class Doctor(TimezoneMixin, DoctorBase):
    availabilities: list[AvailabilitySlotCreate]
    _timezone_fields: ClassVar[list[str]] = ["created_at"]


class DoctorCreate(BaseModel):
    name: str
    specialty_id: int | None
    phone_number: str | None
    availabilities: list[AvailabilitySlotCreate]
    duration: int | None
    model_config = ConfigDict(from_attributes=True)


class DoctorUpdate(BaseModel):
    name: str | None = None
    specialty_id: int | None = None
    phone_number: str | None = None
    availabilities: list[AvailabilitySlotCreate] | None = None
    model_config = ConfigDict(from_attributes=True)
