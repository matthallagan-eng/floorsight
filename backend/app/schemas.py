from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MachineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    line: str


class MetricSummary(BaseModel):
    oee: float
    availability: float
    performance: float
    quality: float
    total_downtime_min: float
    total_good: int
    total_produced: int


class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class DowntimeReason(BaseModel):
    reason: str
    minutes: float


class AlertRuleCreate(BaseModel):
    machine_id: int | None = None
    metric: str
    comparator: str
    threshold: float


class AlertRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    machine_id: int | None
    metric: str
    comparator: str
    threshold: float
    active: bool


class TriggeredAlert(BaseModel):
    rule_id: int
    machine_name: str
    metric: str
    threshold: float
    actual: float
    message: str

class MachineMetrics(BaseModel):
    machine_id: int
    machine_name: str
    line: str
    oee: float
    availability: float
    performance: float
    quality: float
    total_downtime_min: float
    total_good: int
    total_produced: int
    record_count: int

class ProductionRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    machine_id: int
    timestamp: datetime
    planned_time_min: float
    downtime_min: float
    total_count: int
    good_count: int
    downtime_reason: str | None


class RecordPage(BaseModel):
    records: list[ProductionRecordOut]
    total: int
    machine_names: dict[int, str]