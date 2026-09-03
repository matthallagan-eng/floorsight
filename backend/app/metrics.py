from dataclasses import dataclass
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import ProductionRecord, Machine

@dataclass
class OeeResult:
    availability: float
    performance: float
    quality: float
    oee: float
    total_downtime_min: float
    total_good: int
    total_produced: int

def compute_oee(records: list[ProductionRecord],
                ideal_cycle_time_sec: float = 3.0) -> OeeResult:
    """
    Standard OEE = Availability x Performance x Quality

      Availability = Run Time / Planned Production Time
      Performance  = (Ideal Cycle Time x Total Count) / Run Time
      Quality      = Good Count / Total Count

    All returned as fractions between 0 and 1.
    """
    if not records:
        return OeeResult(0, 0, 0, 0, 0, 0, 0)

    planned_min = sum(r.planned_time_min for r in records)
    downtime_min = sum(r.downtime_min for r in records)
    run_min = max(planned_min - downtime_min, 0.0)

    total_count = sum(r.total_count for r in records)
    good_count = sum(r.good_count for r in records)

    availability = run_min / planned_min if planned_min > 0 else 0.0

    ideal_run_min = (ideal_cycle_time_sec * total_count) / 60.0
    performance = ideal_run_min / run_min if run_min > 0 else 0.0
    performance = min(performance, 1.0)   # clamp: cycle time estimates can drift

    quality = good_count / total_count if total_count > 0 else 0.0

    return OeeResult(
        availability=round(availability, 4),
        performance=round(performance, 4),
        quality=round(quality, 4),
        oee=round(availability * performance * quality, 4),
        total_downtime_min=round(downtime_min, 1),
        total_good=good_count,
        total_produced=total_count,
    )