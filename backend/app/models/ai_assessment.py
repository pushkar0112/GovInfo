import enum
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now


class AIAssessmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    ERROR = "ERROR"


class AIRecommendation(str, enum.Enum):
    STRONG_MATCH = "STRONG_MATCH"
    MODERATE_MATCH = "MODERATE_MATCH"
    LOW_MATCH = "LOW_MATCH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class AIAssessment(Base, BaseModelMixin):
    """
    Explainable AI-assisted shortlisting assessment for a startup application.
    Operates as an assistive prioritization and risk-assessment recommendation layer.
    Does NOT replace human expert evaluation or final government nodal officer decisions.
    """
    __tablename__ = "ai_assessments"

    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    challenge_id = Column(String(36), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)

    # Lifecycle Status
    status = Column(
        String(50),
        default=AIAssessmentStatus.PENDING.value,
        nullable=False,
        index=True,
    )

    # Composite AI Match Score: 0 to 100
    overall_score = Column(Float, nullable=True)

    # 6 Weighted Factors:
    # 1. Problem–Solution Fit (30% weight, max 30)
    problem_solution_fit_score = Column(Float, nullable=True)
    # 2. Technical Readiness / TRL (20% weight, max 20)
    technical_readiness_score = Column(Float, nullable=True)
    # 3. KPI / Outcome Alignment (20% weight, max 20)
    kpi_alignment_score = Column(Float, nullable=True)
    # 4. Pilot Feasibility (15% weight, max 15)
    pilot_feasibility_score = Column(Float, nullable=True)
    # 5. Relevant Experience (10% weight, max 10)
    relevant_experience_score = Column(Float, nullable=True)
    # 6. Risk & Application Completeness (5% weight, max 5)
    risk_completeness_score = Column(Float, nullable=True)

    # Qualitative Recommendation
    recommendation = Column(String(50), nullable=True)
    recommendation_label = Column(String(100), nullable=True)  # e.g., "Strong Match"

    # Explainability Data (JSON-encoded lists of strings)
    positive_reasons = Column(Text, nullable=True)  # JSON-encoded list of strengths
    risk_flags = Column(Text, nullable=True)        # JSON-encoded list of potential concerns

    # Executive Summary / Narrative
    summary = Column(Text, nullable=True)

    # Model & Execution Metadata
    model_version = Column(String(100), default="rule-based-nlp-v1.0", nullable=False)
    execution_mode = Column(String(50), default="DEMO_RULE_BASED", nullable=False)  # DEMO_RULE_BASED or LIVE_AI
    mode_label = Column(String(120), default="AI-Assisted Assessment — Demo/Rule-Based Mode", nullable=False)

    # Timestamps
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    application = relationship("Application", backref="ai_assessment")
    challenge = relationship("Challenge")

    __table_args__ = (
        Index("ix_ai_assessments_app_status", "application_id", "status"),
    )
