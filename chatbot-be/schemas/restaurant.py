from __future__ import annotations

from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from schemas.common import TimezoneMixin
from schemas.patient import Patient


class RestaurantTableBase(BaseModel):
    capacity: int
    table_number: str
    location: str | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class RestaurantTable(TimezoneMixin, RestaurantTableBase):
    id: int
    created_at: datetime

    _timezone_fields: ClassVar[list[str]] = ["created_at"]

    model_config = ConfigDict(from_attributes=True)


class RestaurantTableCreate(RestaurantTableBase):
    pass


class RestaurantTableUpdate(BaseModel):
    capacity: int | None = None
    table_number: str | None = None
    location: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class ReservationBase(BaseModel):
    customer_id: int
    table_id: int
    reservation_date: datetime
    party_size: int
    status: str | None = "pending"
    special_request: str | None = None

    model_config = ConfigDict(from_attributes=True)


class Reservation(TimezoneMixin, ReservationBase):
    id: int
    created_at: datetime
    cancelled_at: datetime | None = None
    customer: Patient | None = None
    table: RestaurantTable | None = None

    _timezone_fields: ClassVar[list[str]] = [
        "reservation_date",
        "created_at",
        "cancelled_at",
    ]

    model_config = ConfigDict(from_attributes=True)


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    customer_id: int | None = None
    table_id: int | None = None
    reservation_date: datetime | None = None
    party_size: int | None = None
    status: str | None = None
    special_request: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RestaurantSettingBase(BaseModel):
    key: str
    value: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RestaurantSetting(RestaurantSettingBase):
    id: int
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RestaurantSettingCreate(RestaurantSettingBase):
    pass


class RestaurantSettingUpdate(BaseModel):
    value: str | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
