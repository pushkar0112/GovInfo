import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
from app.core.datetime_utils import utc_now


class DeliverableStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PilotDeliverable(Base, BaseModelMixin):
    """
    Deliverables, reports, telemetry data, and technical proof documents
    submitted by startups to substantiate milestone completion.
    Supports version history upon rejection and re-submission.
    """
    __tablename__ = "pilot_deliverables"

    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False, index=True)
    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # File storage specifications
    file_name = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes

    # Version tracking (e.g. v1, v2)
    submission_version = Column(Integer, default=1, nullable=False)

    # Review status
    status = Column(String(50), default=DeliverableStatus.SUBMITTED.value, nullable=False, index=True)

    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comments = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_deliverables_milestone_version", "milestone_id", "submission_version"),
        Index("ix_deliverables_pilot_status", "pilot_id", "status"),
    )

    # Relationships
    pilot = relationship("Pilot", back_populates="deliverables")
    milestone = relationship("Milestone", back_populates="deliverables")
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
