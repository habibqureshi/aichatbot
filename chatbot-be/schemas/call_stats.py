from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class TotalCallsResponse(BaseModel):
    total: int = Field(..., description="Total number of calls in the period")


class AverageDurationResponse(BaseModel):
    average_seconds: float = Field(..., description="Average call duration in seconds")


class ConversionRateResponse(BaseModel):
    conversion_rate: float = Field(..., description="Conversion rate as percentage")


class TimeseriesPoint(BaseModel):
    label: str
    successful: int
    failed: int
    total: int


class LiveCallItem(BaseModel):
    call_sid: Optional[str]
    conversation_id: int
    patient_name: Optional[str]
    patient_phone: Optional[str]
    started_at: Optional[datetime]


class LiveCallActivity(BaseModel):
    active_calls: int
    calls: List[LiveCallItem]

