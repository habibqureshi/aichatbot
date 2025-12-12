from datetime import datetime
from typing import ClassVar
from pydantic import BaseModel, ConfigDict
from schemas.common import TimezoneMixin


class AppSettingBase(BaseModel):
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)


class AppSetting(AppSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AppSettingCreate(BaseModel):
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)


class AppSettingUpdate(BaseModel):
    key: str | None = None
    value: str | None = None
    model_config = ConfigDict(from_attributes=True)
