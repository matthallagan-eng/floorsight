from datetime import datetime

from sqlalchemy import String, DateTime, Float, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    machines: Mapped[list["Machine"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["AlertRule"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    line: Mapped[str] = mapped_column(String(100), default="Line 1")
    ideal_cycle_time_sec: Mapped[float] = mapped_column(Float, default=3.0)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    owner: Mapped["User"] = relationship(back_populates="machines")
    records: Mapped[list["ProductionRecord"]] = relationship(
        back_populates="machine", cascade="all, delete-orphan"
    )


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)

    planned_time_min: Mapped[float] = mapped_column(Float)
    downtime_min: Mapped[float] = mapped_column(Float, default=0.0)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    good_count: Mapped[int] = mapped_column(Integer, default=0)
    downtime_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)

    machine: Mapped["Machine"] = relationship(back_populates="records")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    machine_id: Mapped[int | None] = mapped_column(
        ForeignKey("machines.id"), nullable=True
    )
    metric: Mapped[str] = mapped_column(String(50))
    comparator: Mapped[str] = mapped_column(String(10))
    threshold: Mapped[float] = mapped_column(Float)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship(back_populates="alerts")