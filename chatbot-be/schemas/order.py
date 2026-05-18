from __future__ import annotations

from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from schemas.common import TimezoneMixin
from schemas.customer import Customer


class OrderItem(BaseModel):
    id: int
    item_name: str
    quantity: int
    unit_price: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)


class Order(TimezoneMixin, BaseModel):
    id: int
    customer_id: int
    status: str
    total_amount: float
    delivery_address: str | None = None
    created_at: datetime
    updated_at: datetime
    customer: Customer | None = None
    items: list[OrderItem] = []

    _timezone_fields: ClassVar[list[str]] = ["created_at", "updated_at"]

    model_config = ConfigDict(from_attributes=True)


class AddOrderItemRequestItem(BaseModel):
    item_name: str = Field(..., description="Exact menu item name from the MENU")
    quantity: int = Field(..., ge=1, description="Quantity to add")
