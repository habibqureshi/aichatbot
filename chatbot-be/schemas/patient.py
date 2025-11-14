from datetime import datetime
from typing import ClassVar
from pydantic import BaseModel, ConfigDict
from schemas.common import TimezoneMixin


class Patient(TimezoneMixin, BaseModel):
    id: int
    phone_number: str
    name: str | None
    created_at: datetime
    _timezone_fields: ClassVar[list[str]] = ["created_at"]

    model_config = ConfigDict(from_attributes=True)
