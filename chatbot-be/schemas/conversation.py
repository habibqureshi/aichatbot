from pydantic import BaseModel, ConfigDict, field_validator
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
    recording_available: bool = False
    _timezone_fields: ClassVar[list[str]] = ["started_at", "ended_at"]

    @field_validator("recording_available", mode="before")
    @classmethod
    def set_recording_available(cls, v, info):
        # Check if recording_link exists in the data
        data = info.data if hasattr(info, "data") else {}
        recording_link = data.get("recording_link")
        return bool(recording_link)

    model_config = ConfigDict(from_attributes=True)
