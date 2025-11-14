from pydantic import BaseModel, ConfigDict
from typing import ClassVar
from datetime import datetime
from schemas.common import TimezoneMixin
from schemas.patient import Patient


class Conversation(TimezoneMixin, BaseModel):
    id: int
    started_at: datetime
    ended_at: datetime | None
    status: str
    call_sid: str
    patient: Patient
    summary: str | None
    _timezone_fields: ClassVar[list[str]] = ["started_at", "ended_at"]

    model_config = ConfigDict(from_attributes=True)
