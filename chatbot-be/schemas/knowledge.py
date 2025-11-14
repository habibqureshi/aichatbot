from pydantic import BaseModel, ConfigDict
from datetime import datetime


class Knowledge(BaseModel):
    id: int
    name: str
    blob_name: str
    created_at: datetime
    is_active: bool = False
    _timezone_fields = ["created_at"]
    model_config = ConfigDict(from_attributes=True)
