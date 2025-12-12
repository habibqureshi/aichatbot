from __future__ import annotations

from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    full_name: str | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime

    _timezone_fields: ClassVar[list[str]] = ["created_at"]

    model_config = ConfigDict(from_attributes=True)
