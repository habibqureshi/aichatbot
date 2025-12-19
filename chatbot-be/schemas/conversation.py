from pydantic import BaseModel, ConfigDict, computed_field, Field
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
    recording_link: str | None = Field(None, exclude=True)
    _timezone_fields: ClassVar[list[str]] = ["started_at", "ended_at"]

    @computed_field
    @property
    def recording_available(self) -> bool:
        return bool(self.recording_link)

    model_config = ConfigDict(from_attributes=True)
