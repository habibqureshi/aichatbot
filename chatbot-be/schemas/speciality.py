from datetime import datetime
from typing import ClassVar
from pydantic import BaseModel, ConfigDict
from schemas.common import TimezoneMixin


class SpecialityBase(TimezoneMixin, BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class Speciality(SpecialityBase):
    description: str | None
    created_at: datetime
    _timezone_fields: ClassVar[list[str]] = ["created_at"]
    model_config = ConfigDict(from_attributes=True)


class SpecialityCreate(BaseModel):
    name: str
    description: str | None
    model_config = ConfigDict(from_attributes=True)


class SpecialityUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)
