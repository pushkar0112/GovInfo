from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class KPI(Base, BaseModelMixin):
    """
    Quantitative metrics and KPIs measured and verified during a pilot.
    """
    __tablename__ = "kpis"

    pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=False, index=True)
    milestone_id = Column(String(36), ForeignKey("milestones.id"), nullable=True)

    metric_name = Column(String(255), nullable=False)  # e.g., "Patient triage time reduction"
    baseline_value = Column(Numeric(12, 4), nullable=True)  # e.g., 45.0 (minutes)
    target_value = Column(Numeric(12, 4), nullable=False)    # e.g., 15.0 (minutes)
    achieved_value = Column(Numeric(12, 4), nullable=True)  # e.g., 12.5 (minutes)
    unit = Column(String(50), nullable=False)               # e.g., "%", "minutes", "₹"
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_source = Column(String(255), nullable=True)

    # Relationships
    pilot = relationship("Pilot", back_populates="kpis")
    milestone = relationship("Milestone", back_populates="kpis")
