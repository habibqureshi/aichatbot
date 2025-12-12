from typing import List, Literal
from datetime import datetime, date, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.db import get_db
from services import call_stats_service, auth_service
from schemas.call_stats import (
    TotalCallsResponse,
    AverageDurationResponse,
    ConversionRateResponse,
    TimeseriesPoint,
    LiveCallActivity,
)

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/total_calls", response_model=TotalCallsResponse)
async def total_calls(
    start: date,
    end: date,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
):
    total = await call_stats_service.total_calls(
        db=db,
        start=datetime.combine(start, time.min),
        end=datetime.combine(end, time.max),
    )
    return TotalCallsResponse(total=total)


@router.get("/average_duration", response_model=AverageDurationResponse)
async def average_duration(
    start: date,
    end: date,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
):
    avg = await call_stats_service.average_call_duration_seconds(
        db=db,
        start=datetime.combine(start, time.min),
        end=datetime.combine(end, time.max),
    )
    return AverageDurationResponse(average_seconds=avg)


@router.get("/conversion_rate", response_model=ConversionRateResponse)
async def conversion_rate(
    start: date,
    end: date,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
):
    rate = await call_stats_service.conversion_rate(
        db=db,
        start=datetime.combine(start, time.min),
        end=datetime.combine(end, time.max),
    )
    return ConversionRateResponse(conversion_rate=rate)


@router.get("/timeseries", response_model=List[TimeseriesPoint])
async def timeseries(
    start: date,
    end: date,
    interval: Literal["month", "day"] = Query("month"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
):
    rows = await call_stats_service.call_volume_timeseries(
        db=db,
        start=datetime.combine(start, time.min),
        end=datetime.combine(end, time.max),
        interval=interval,
    )
    return [TimeseriesPoint(**r) for r in rows]


@router.get("/live", response_model=LiveCallActivity)
async def live_activity(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_service.get_current_user),
):
    data = await call_stats_service.live_call_activity(db=db)
    return LiveCallActivity.parse_obj(data)
