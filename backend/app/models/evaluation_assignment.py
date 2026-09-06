import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REASSIGNED = "REASSIGNED"


class EvaluationAssignment(Base, BaseModelMixin):
    """
    Tracks assignment of an application to an independent expert for scoring.
    """
    __tablename__ = "evaluation_assignments"

    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    expert_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_status = Column(String(50), default=AssignmentStatus.ASSIGNED.value, nullable=False, index=True)

    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="evaluation_assignments")
    expert = relationship("User", foreign_keys=[expert_id], back_populates="assignments_as_expert")
    assigner = relationship("User", foreign_keys=[assigned_by], back_populates="assignments_made")
    conflict = relationship("ConflictOfInterest", uselist=False, back_populates="assignment", cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", uselist=False, back_populates="assignment")

    def __repr__(self) -> str:
        return f"<EvaluationAssignment app={self.application_id} expert={self.expert_id} status={self.assignment_status}>"
