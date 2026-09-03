from datetime import datetime
from app.metrics import compute_oee
from app.models import ProductionRecord

def _rec(planned, down, total, good):
    return ProductionRecord(
        timestamp=datetime(2026, 3, 1, 6), machine_id=1,
        planned_time_min=planned, downtime_min=down,
        total_count=total, good_count=good,
    )

def test_perfect_run_is_full_oee():
    # 60 min planned, no downtime, 1200 parts at 3s ideal = exactly 60 min
    r = compute_oee([_rec(60, 0, 1200, 1200)], ideal_cycle_time_sec=3.0)
    assert r.availability == 1.0
    assert r.quality == 1.0
    assert r.oee == 1.0

def test_downtime_reduces_availability():
    r = compute_oee([_rec(60, 15, 900, 900)], ideal_cycle_time_sec=3.0)
    assert r.availability == 0.75

def test_scrap_reduces_quality():
    r = compute_oee([_rec(60, 0, 1000, 900)], ideal_cycle_time_sec=3.0)
    assert r.quality == 0.9

def test_empty_input_does_not_crash():
    r = compute_oee([])
    assert r.oee == 0