from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, text

from db.models import Conversation, Patient


async def total_calls(
    db: AsyncSession, start: datetime, end: datetime, tenant_id: int
) -> int:
    q = select(func.count(Conversation.id)).where(
        Conversation.started_at.between(start, end),
        Conversation.tenant_id == tenant_id,
    )
    return int((await db.scalar(q)) or 0)


async def average_call_duration_seconds(
    db: AsyncSession, start: datetime, end: datetime, tenant_id: int
) -> float:
    """Compute average call duration in seconds fully inside SQL.
    'start' and 'end' are required.
    """
    duration_expr = func.timestampdiff(
        text("SECOND"),
        Conversation.started_at,
        Conversation.ended_at,
    )

    q = select(func.avg(duration_expr)).where(
        Conversation.ended_at.isnot(None),
        Conversation.started_at >= start,
        Conversation.started_at <= end,
        Conversation.tenant_id == tenant_id,
    )

    avg_seconds = await db.scalar(q)
    return float(avg_seconds or 0.0)


async def conversion_rate(
    db: AsyncSession, start: datetime, end: datetime, tenant_id: int
) -> float:
    total_expr = func.count(Conversation.id)
    success_expr = func.sum(
        case((Conversation.resolved_status == "satisfied", 1), else_=0)
    )

    q = select(total_expr.label("total"), success_expr.label("success")).where(
        Conversation.ended_at.isnot(None),
        Conversation.started_at.between(start, end),
        Conversation.tenant_id == tenant_id,
    )

    row = (await db.execute(q)).one_or_none()
    if not row:
        return 0.0

    total = int(row.total or 0)
    success = int(row.success or 0)
    if total == 0:
        return 0.0

    return (success / total) * 100.0


async def call_volume_timeseries(
    db: AsyncSession,
    start: datetime,
    end: datetime,
    tenant_id: int,
    interval: str = "month",
) -> List[Dict[str, Any]]:

    fmt = "%Y-%m" if interval == "month" else "%Y-%m-%d"

    label_expr = func.date_format(Conversation.started_at, fmt)
    total_expr = func.count(Conversation.id)
    success_expr = func.sum(
        case((Conversation.resolved_status == "satisfied", 1), else_=0)
    )

    q = (
        select(label_expr.label("label"), total_expr, success_expr)
        .where(
            Conversation.started_at.between(start, end),
            Conversation.tenant_id == tenant_id,
        )
        .group_by(label_expr)
        .order_by(label_expr)
    )

    rows = (await db.execute(q)).all()

    out = []
    for label, total, success in rows:
        t = int(total or 0)
        s = int(success or 0)
        out.append({"label": label, "successful": s, "failed": t - s, "total": t})

    return out


async def live_call_activity(db: AsyncSession, tenant_id: int) -> Dict[str, Any]:
    q = select(Conversation).where(
        Conversation.status == "active",
        Conversation.tenant_id == tenant_id,
    )

    convs = (await db.execute(q)).scalars().unique().all()

    patient_ids = [c.patient_id for c in convs if c.patient_id]
    patients_map = {}

    if patient_ids:
        pr = await db.execute(select(Patient).where(Patient.id.in_(patient_ids)))
        for p in pr.scalars().all():
            patients_map[p.id] = p

    active = []
    for c in convs:
        p = patients_map.get(c.patient_id)
        active.append(
            {
                "call_sid": c.call_sid,
                "conversation_id": c.id,
                "patient_name": getattr(p, "name", None) if p else None,
                "patient_phone": getattr(p, "phone_number", None) if p else None,
                "started_at": c.started_at,
            }
        )

    return {"active_calls": len(active), "calls": active}
