import enum
from sqlalchemy import Column, String, Text, Numeric, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class EvaluationRecommendation(str, enum.Enum):
    STRONGLY_RECOMMEND = "STRONGLY_RECOMMEND"
    RECOMMEND = "RECOMMEND"
    NEEDS_REVISION = "NEEDS_REVISION"
    DO_NOT_RECOMMEND = "DO_NOT_RECOMMEND"


class Evaluation(Base, BaseModelMixin):
    """
    Expert and technical evaluation of a startup application.
    """
    __tablename__ = "evaluations"

    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False, index=True)
    evaluator_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    technical_score = Column(Numeric(5, 2), nullable=False)    # 0.0 - 100.0
    operational_score = Column(Numeric(5, 2), nullable=False)  # 0.0 - 100.0
    commercial_score = Column(Numeric(5, 2), nullable=False)   # 0.0 - 100.0
    composite_score = Column(Numeric(5, 2), nullable=False)    # Weighted total

    evaluator_feedback = Column(Text, nullable=False)
    recommendation = Column(
        SQLEnum(EvaluationRecommendation, name="evaluation_rec_enum", native_enum=False),
        default=EvaluationRecommendation.RECOMMEND,
        nullable=False,
    )
    is_finalized = Column(String(10), default="true", nullable=False)

    # Relationships
    application = relationship("Application", back_populates="evaluations")
    evaluator = relationship("User", foreign_keys=[evaluator_id])
