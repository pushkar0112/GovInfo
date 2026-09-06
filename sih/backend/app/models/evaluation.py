import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Float, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class EvaluationRecommendation(str, enum.Enum):
    STRONGLY_RECOMMEND = "STRONGLY_RECOMMEND"
    RECOMMEND = "RECOMMEND"
    NEUTRAL = "NEUTRAL"
    DO_NOT_RECOMMEND = "DO_NOT_RECOMMEND"
    NEEDS_REVISION = "NEEDS_REVISION"


class Evaluation(Base, BaseModelMixin):
    """
    Expert and technical evaluation of a startup application.
    Supports both Step 5 granular criteria-based scoring and legacy evaluations.
    """
    __tablename__ = "evaluations"

    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(String(36), ForeignKey("evaluation_assignments.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    expert_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    evaluator_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Step 5 granular weighted evaluation
    overall_score = Column(Float, nullable=True)  # Computed 0.0 - 100.0 from criteria
    overall_comments = Column(Text, nullable=True)
    is_submitted = Column(Boolean, default=False, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    # Legacy attributes for backward compatibility
    technical_score = Column(Numeric(5, 2), nullable=True)    # 0.0 - 100.0
    operational_score = Column(Numeric(5, 2), nullable=True)  # 0.0 - 100.0
    commercial_score = Column(Numeric(5, 2), nullable=True)   # 0.0 - 100.0
    composite_score = Column(Numeric(5, 2), nullable=True)    # Weighted total
    evaluator_feedback = Column(Text, nullable=True)
    is_finalized = Column(String(10), default="true", nullable=True)

    recommendation = Column(
        SQLEnum(EvaluationRecommendation, name="evaluation_rec_enum", native_enum=False),
        default=EvaluationRecommendation.RECOMMEND,
        nullable=False,
    )

    # Relationships
    application = relationship("Application", back_populates="evaluations")
    assignment = relationship("EvaluationAssignment", back_populates="evaluation")
    expert = relationship("User", foreign_keys=[expert_id])
    evaluator = relationship("User", foreign_keys=[evaluator_id])
    scores = relationship("EvaluationScore", back_populates="evaluation", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Evaluation id={self.id} app={self.application_id} score={self.overall_score} submitted={self.is_submitted}>"
