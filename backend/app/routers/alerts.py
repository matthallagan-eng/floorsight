from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Machine, AlertRule, ProductionRecord
from ..metrics import compute_oee
from ..schemas import AlertRuleCreate, AlertRuleOut, TriggeredAlert

router = APIRouter(prefix="/alerts", tags=["alerts"])

VALID_METRICS = {"oee", "availability", "quality", "downtime_min"}
VALID_COMPARATORS = {"lt", "gt"}

@router.post("", response_model=AlertRuleOut, status_code=201)
def create_rule(payload: AlertRuleCreate,
                db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if payload.metric not in VALID_METRICS:
        raise HTTPException(400, f"metric must be one of {sorted(VALID_METRICS)}")
    if payload.comparator not in VALID_COMPARATORS:
        raise HTTPException(400, "comparator must be 'lt' or 'gt'")

    rule = AlertRule(owner_id=current_user.id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("", response_model=list[AlertRuleOut])
def list_rules(db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    return db.query(AlertRule).filter(AlertRule.owner_id == current_user.id).all()

@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: int,
                db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    rule = (db.query(AlertRule)
              .filter(AlertRule.id == rule_id,
                      AlertRule.owner_id == current_user.id)
              .first())
    if not rule:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()

@router.get("/triggered", response_model=list[TriggeredAlert])
def triggered(db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    rules = (db.query(AlertRule)
               .filter(AlertRule.owner_id == current_user.id,
                       AlertRule.active == True)  # noqa: E712
               .all())
    machines = db.query(Machine).filter(Machine.owner_id == current_user.id).all()
    machines_by_id = {m.id: m for m in machines}

    out: list[TriggeredAlert] = []

    for rule in rules:
        targets = ([machines_by_id[rule.machine_id]]
                   if rule.machine_id in machines_by_id else machines)

        for machine in targets:
            recs = (db.query(ProductionRecord)
                      .filter(ProductionRecord.machine_id == machine.id)
                      .all())
            if not recs:
                continue

            result = compute_oee(recs)
            actual = {
                "oee": result.oee,
                "availability": result.availability,
                "quality": result.quality,
                "downtime_min": result.total_downtime_min,
            }[rule.metric]

            breached = (actual < rule.threshold if rule.comparator == "lt"
                        else actual > rule.threshold)
            if breached:
                direction = "below" if rule.comparator == "lt" else "above"
                out.append(TriggeredAlert(
                    rule_id=rule.id,
                    machine_name=machine.name,
                    metric=rule.metric,
                    threshold=rule.threshold,
                    actual=actual,
                    message=(f"{machine.name}: {rule.metric} is {actual} "
                             f"({direction} threshold of {rule.threshold})"),
                ))

    return out