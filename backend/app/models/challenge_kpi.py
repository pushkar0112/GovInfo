from sqlalchemy import Column, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ChallengeKPI(Base, BaseModelMixin):
    """
    Measurable quantitative Key Performance Indicators defined by
    Government Departments for outcome-based challenges.
    """
    __tablename__ = "challenge_kpis"

    challenge_id = Column(
        String(36),
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    measurement_unit = Column(String(50), nullable=False)  # e.g., "%", "minutes", "₹", "litres/hour"
    baseline_value = Column(Numeric(14, 4), nullable=True)
    target_value = Column(Numeric(14, 4), nullable=False)
    measurement_method = Column(Text, nullable=True)
    weight = Column(Numeric(5, 2), default=1.0, nullable=False)

    # Relationships
    challenge = relationship("Challenge", back_populates="kpis")
