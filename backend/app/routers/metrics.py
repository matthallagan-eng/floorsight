from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Machine, ProductionRecord
from ..metrics import compute_oee
from ..schemas import MetricSummary, TimeSeriesPoint, DowntimeReason

router = APIRouter(prefix="/metrics", tags=["metrics"])

def _scoped_records(db, user, machine_id, days):
    since = datetime.utcnow() - timedelta(days=days)
    q = (db.query(ProductionRecord)
           .join(Machine)
           .filter(Machine.owner_id == user.id))
    if machine_id:
        q = q.filter(ProductionRecord.machine_id == machine_id)
    return q.all()   # date filter omitted for demo data; see note below

@router.get("/summary", response_model=MetricSummary)
def summary(machine_id: int | None = None,
            days: int = Query(30, ge=1, le=365),
            db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    records = _scoped_records(db, current_user, machine_id, days)
    r = compute_oee(records)
    return MetricSummary(
        oee=r.oee, availability=r.availability,
        performance=r.performance, quality=r.quality,
        total_downtime_min=r.total_downtime_min,
        total_good=r.total_good, total_produced=r.total_produced,
    )

@router.get("/oee-trend", response_model=list[TimeSeriesPoint])
def oee_trend(machine_id: int | None = None,
              db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    records = _scoped_records(db, current_user, machine_id, 30)

    by_hour: dict[datetime, list] = defaultdict(list)
    for rec in records:
        bucket = rec.timestamp.replace(minute=0, second=0, microsecond=0)
        by_hour[bucket].append(rec)

    return [
        TimeSeriesPoint(timestamp=ts, value=compute_oee(recs).oee)
        for ts, recs in sorted(by_hour.items())
    ]

@router.get("/downtime-by-reason", response_model=list[DowntimeReason])
def downtime_by_reason(machine_id: int | None = None,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    records = _scoped_records(db, current_user, machine_id, 30)

    totals: dict[str, float] = defaultdict(float)
    for rec in records:
        if rec.downtime_min > 0:
            totals[rec.downtime_reason or "Unclassified"] += rec.downtime_min

    return sorted(
        [DowntimeReason(reason=k, minutes=round(v, 1)) for k, v in totals.items()],
        key=lambda d: d.minutes, reverse=True,
    )