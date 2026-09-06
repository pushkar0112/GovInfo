from sqlalchemy import Column, String, Float, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class EvaluationCriteria(Base, BaseModelMixin):
    """
    Challenge-specific evaluation criterion configured by Government nodal officers.
    Total weights across all criteria for a challenge must sum to 100%.
    """
    __tablename__ = "evaluation_criteria"

    challenge_id = Column(String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Float, nullable=False)  # Percentage weight, e.g. 25.0
    max_score = Column(Float, nullable=False, default=10.0)
    min_score = Column(Float, nullable=False, default=0.0)
    mandatory = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)

    # Relationships
    challenge = relationship("Challenge", back_populates="evaluation_criteria")
    scores = relationship("EvaluationScore", back_populates="criterion", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<EvaluationCriteria {self.name} (weight={self.weight}%, max={self.max_score})>"
