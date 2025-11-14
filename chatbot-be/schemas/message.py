from datetime import datetime
from pydantic import BaseModel, ConfigDict
from schemas.common import TimezoneMixin


class Message(TimezoneMixin, BaseModel):
    id: int
    content: str
    role: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
    _timezone_fields = ["timestamp"]
