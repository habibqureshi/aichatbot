from typing import ClassVar, List, Generic, TypeVar
from pydantic import BaseModel, field_validator, Field
from datetime import datetime
from zoneinfo import ZoneInfo
from math import ceil


class TimezoneMixin:
    _timezone_fields: ClassVar[list[str]] = []

    @field_validator("*", mode="before")
    @classmethod
    def convert_timezone(cls, v, info):
        # Check if this field should be converted
        if info.field_name not in cls._timezone_fields:
            return v

        if v is None or not isinstance(v, datetime):
            return v

        # Get timezone from context
        tz_str = info.context.get("timezone", "UTC") if info.context else "UTC"
        tz = ZoneInfo(tz_str)

        # Ensure datetime is timezone-aware
        if v.tzinfo is None:
            v = v.replace(tzinfo=ZoneInfo("UTC"))

        return v.astimezone(tz)


T = TypeVar("T")


class PaginationMetadata(BaseModel):
    """Metadata for pagination"""

    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    limit: int = Field(description="Items per page")
    total_pages: int = Field(description="Total number of pages")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""

    data: List[T] = Field(description="List of items")
    metadata: PaginationMetadata = Field(description="Pagination metadata")

    @classmethod
    def create(
        cls, data: List[T], total: int, page: int, limit: int
    ) -> "PaginatedResponse[T]":
        """
        Create a paginated response

        Args:
            data: List of items for current page
            total: Total number of items across all pages
            page: Current page number (1-indexed)
            limit: Number of items per page
        """
        total_pages = ceil(total / limit) if limit > 0 else 0

        metadata = PaginationMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

        return cls(data=data, metadata=metadata)
