import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Integer,
    Date,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class MilestoneStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"

    # Legacy statuses for backward compatibility
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DELIVERABLE_SUBMITTED = "DELIVERABLE_SUBMITTED"
    TRANCHE_DISBURSED = "TRANCHE_DISBURSED"
    DELAYED = "DELAYED"


class MilestoneAcceptanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Milestone(Base, BaseModelMixin):
    """
    Structured, time-bound operational milestone contributing a weighted percentage
    to overall pilot sandbox completion.
    """
    __tablename__ = "milestones"

    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_code = Column(String(50), nullable=True, index=True)  # e.g., MS-001
    sequence_number = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=False)

    objective = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # Schedule
    planned_start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True, index=True)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)

    # Progress weight & completion
    weight = Column(Numeric(5, 2), default=0.0, nullable=False)  # e.g. 25.00 for 25%
    completion_percentage = Column(Numeric(5, 2), default=0.0, nullable=False)  # 0 to 100

    # Lifecycle & Acceptance
    status = Column(String(50), default=MilestoneStatus.NOT_STARTED.value, nullable=False, index=True)
    acceptance_status = Column(String(50), default=MilestoneAcceptanceStatus.PENDING.value, nullable=False)

    # Operational blockage / rejection remarks
    block_reason = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Legacy column compatibility
    deliverable_description = Column(Text, nullable=True)
    tranche_amount = Column(Numeric(12, 2), default=0.0, nullable=True)
    due_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)

    __table_args__ = (
        Index("ix_milestones_pilot_seq", "pilot_id", "sequence_number"),
        Index("ix_milestones_pilot_status", "pilot_id", "status"),
    )

    # Relationships
    pilot = relationship("Pilot", back_populates="milestones")
    deliverables = relationship(
        "PilotDeliverable",
        back_populates="milestone",
        cascade="all, delete-orphan",
        order_by="PilotDeliverable.submission_version.desc()",
    )
    kpis = relationship("KPI", back_populates="milestone")

    # Property helpers for seamless backward-compatibility
    @property
    def display_description(self) -> str:
        return self.description or self.deliverable_description or ""

    @property
    def display_due_date(self):
        return self.planned_end_date or self.due_date

    @property
    def display_completion_date(self):
        return self.actual_end_date or self.completion_date


# Alias for explicit naming
PilotMilestone = Milestone
