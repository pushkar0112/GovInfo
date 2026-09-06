import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ConflictDeclaration(str, enum.Enum):
    NO_CONFLICT = "NO_CONFLICT"
    CONFLICT_DECLARED = "CONFLICT_DECLARED"


class ConflictOfInterest(Base, BaseModelMixin):
    """
    Mandatory Conflict of Interest declaration submitted by an expert before evaluating.
    Declaring a conflict locks the evaluation form and notifies the department nodal officer.
    """
    __tablename__ = "conflict_of_interest"

    assignment_id = Column(
        String(36),
        ForeignKey("evaluation_assignments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    expert_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    declaration = Column(String(50), nullable=False)  # NO_CONFLICT, CONFLICT_DECLARED
    reason = Column(Text, nullable=True)
    declared_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    assignment = relationship("EvaluationAssignment", back_populates="conflict")
    expert = relationship("User", foreign_keys=[expert_id])

    def __repr__(self) -> str:
        return f"<ConflictOfInterest assignment={self.assignment_id} decl={self.declaration}>"
