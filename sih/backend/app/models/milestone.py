import enum
from sqlalchemy import Column, String, Text, Numeric, Integer, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class MilestoneStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    DELIVERABLE_SUBMITTED = "DELIVERABLE_SUBMITTED"
    APPROVED = "APPROVED"
    TRANCHE_DISBURSED = "TRANCHE_DISBURSED"
    DELAYED = "DELAYED"


class Milestone(Base, BaseModelMixin):
    """
    Time-bound milestones and grant/tranche deliverables within a pilot.
    """
    __tablename__ = "milestones"

    pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    deliverable_description = Column(Text, nullable=False)
    tranche_amount = Column(Numeric(12, 2), default=0.0, nullable=False)
    due_date = Column(Date, nullable=False)
    completion_date = Column(Date, nullable=True)

    status = Column(
        SQLEnum(MilestoneStatus, name="milestone_status_enum", native_enum=False),
        default=MilestoneStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Relationships
    pilot = relationship("Pilot", back_populates="milestones")
    kpis = relationship("KPI", back_populates="milestone")
