from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Machine, ProductionRecord

import random
from datetime import datetime, timedelta

from ..models import AlertRule


router = APIRouter(prefix="/uploads", tags=["uploads"])

REQUIRED_COLUMNS = {
    "timestamp", "machine", "planned_time_min",
    "downtime_min", "total_count", "good_count",
}

@router.post("")
async def upload_csv(file: UploadFile = File(...),
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "File must be a .csv")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            400, f"Missing required columns: {', '.join(sorted(missing))}")

    try:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    except Exception:
        raise HTTPException(400, "Could not parse 'timestamp' column as dates")

    # Cache machines so we don't query per row
    machine_cache: dict[str, Machine] = {
        m.name: m for m in
        db.query(Machine).filter(Machine.owner_id == current_user.id).all()
    }

    created_machines = 0
    records = []

    for _, row in df.iterrows():
        name = str(row["machine"]).strip()
        machine = machine_cache.get(name)
        if machine is None:
            machine = Machine(
                name=name,
                line=str(row.get("line", "Line 1")),
                owner_id=current_user.id,
            )
            db.add(machine)
            db.flush()               # assigns machine.id without full commit
            machine_cache[name] = machine
            created_machines += 1

        reason = row.get("downtime_reason")
        records.append(ProductionRecord(
            machine_id=machine.id,
            timestamp=row["timestamp"].to_pydatetime(),
            planned_time_min=float(row["planned_time_min"]),
            downtime_min=float(row["downtime_min"] or 0),
            total_count=int(row["total_count"]),
            good_count=int(row["good_count"]),
            downtime_reason=None if pd.isna(reason) else str(reason),
        ))

    db.bulk_save_objects(records)
    db.commit()

    return {
        "rows_imported": len(records),
        "machines_created": created_machines,
        "machines_total": len(machine_cache),
    }



@router.post("/simulate")
def simulate_tick(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    machines = db.query(Machine).filter(Machine.owner_id == current_user.id).all()

    if not machines:
        seed = [
            ("Filler-01", "Line 1"),
            ("Capper-02", "Line 1"),
            ("Labeler-03", "Line 2"),
            ("Palletizer-04", "Line 2"),
        ]
        for name, line in seed:
            m = Machine(name=name, line=line, owner_id=current_user.id)
            db.add(m)
        db.commit()
        machines = (
            db.query(Machine).filter(Machine.owner_id == current_user.id).all()
        )

    latest = (
        db.query(ProductionRecord)
        .join(Machine)
        .filter(Machine.owner_id == current_user.id)
        .order_by(ProductionRecord.timestamp.desc())
        .first()
    )

    if latest:
        next_ts = latest.timestamp + timedelta(hours=1)
    else:
        next_ts = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

    reasons = [
        "Changeover",
        "Jam - infeed",
        "Minor stop",
        "Mechanical fault",
        "Material starvation",
    ]

    created = []
    for m in machines:
        downtime = random.choice([0, 0, 0, 0, 3.5, 8.0, 15.0, 22.0])
        total = random.randint(900, 1250)
        good = total - random.randint(0, 45)

        rec = ProductionRecord(
            machine_id=m.id,
            timestamp=next_ts,
            planned_time_min=60,
            downtime_min=downtime,
            total_count=total,
            good_count=good,
            downtime_reason=random.choice(reasons) if downtime else None,
        )
        db.add(rec)
        created.append(rec)

    db.commit()

    return {
        "machines_updated": len(machines),
        "timestamp": next_ts,
        "records_created": len(created),
    }


@router.delete("/reset", status_code=204)
def reset_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(AlertRule).filter(
        AlertRule.owner_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()

    machines = db.query(Machine).filter(Machine.owner_id == current_user.id).all()
    for m in machines:
        db.delete(m)
    db.commit()