from sqlalchemy import Column, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class EvaluationScore(Base, BaseModelMixin):
    """
    Individual criterion score awarded by an expert during an application evaluation.
    """
    __tablename__ = "evaluation_scores"

    evaluation_id = Column(String(36), ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("evaluation_criteria.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    evidence_reference = Column(Text, nullable=True)

    # Relationships
    evaluation = relationship("Evaluation", back_populates="scores")
    criterion = relationship("EvaluationCriteria", back_populates="scores")

    def __repr__(self) -> str:
        return f"<EvaluationScore eval={self.evaluation_id} crit={self.criterion_id} score={self.score}>"
