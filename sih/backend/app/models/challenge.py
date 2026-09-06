import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Integer,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ChallengeStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"
    ARCHIVED = "ARCHIVED"

    # Legacy statuses for backward compatibility with downstream stage models
    ACTIVE = "ACTIVE"
    APPLICATIONS_CLOSED = "APPLICATIONS_CLOSED"
    EVALUATION_ACTIVE = "EVALUATION_ACTIVE"
    PILOT_STAGE = "PILOT_STAGE"
    PROCURED = "PROCURED"


class Challenge(Base, BaseModelMixin):
    """
    Government Problem Statement transformed into an Outcome-Based Innovation Challenge.
    """
    __tablename__ = "challenges"

    challenge_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "GI-2026-0001"
    title = Column(String(255), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Problem Statement & Context
    problem_statement = Column(Text, nullable=False)
    current_state = Column(Text, nullable=True)
    desired_outcome = Column(Text, nullable=False)
    challenge_description = Column(Text, nullable=True)
    target_beneficiaries = Column(Text, nullable=True)

    # Technology Scope (Outcome-First Guidance)
    technology_preferences = Column(Text, nullable=True)
    technology_restrictions = Column(Text, nullable=True)

    # Domain & Geography
    domain = Column(String(100), nullable=False, index=True)  # e.g., "CivicTech", "HealthTech", "CleanTech"
    geographical_scope = Column(String(100), nullable=True)   # e.g., "National", "State-Level", "Pan-India", "Municipal"

    # Budget & Timeline
    budget_min = Column(Numeric(14, 2), nullable=True)
    budget_max = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    pilot_duration_days = Column(Integer, default=90, nullable=False)
    application_deadline = Column(DateTime(timezone=True), nullable=True)
    pilot_start_date = Column(DateTime(timezone=True), nullable=True)

    # Governance, Data, Security & Legal
    data_requirements = Column(Text, nullable=True)
    security_requirements = Column(Text, nullable=True)
    compliance_requirements = Column(Text, nullable=True)
    intellectual_property_requirements = Column(Text, nullable=True)
    eligibility_requirements = Column(Text, nullable=True)

    # Lifecycle State
    status = Column(
        SQLEnum(ChallengeStatus, name="challenge_status_enum", native_enum=False),
        default=ChallengeStatus.DRAFT,
        nullable=False,
        index=True,
    )
    published_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    department = relationship("Department", back_populates="challenges")
    creator = relationship("User", back_populates="challenges_created", foreign_keys=[created_by])
    kpis = relationship("ChallengeKPI", back_populates="challenge", cascade="all, delete-orphan", order_by="ChallengeKPI.created_at")
    evaluation_criteria = relationship("EvaluationCriteria", back_populates="challenge", cascade="all, delete-orphan", order_by="EvaluationCriteria.display_order")
    applications = relationship("Application", back_populates="challenge")

    # Backward compatibility properties for Step 1 / test suites
    @property
    def outcome_definition(self) -> str:
        return self.desired_outcome

    @outcome_definition.setter
    def outcome_definition(self, value: str):
        self.desired_outcome = value

    @property
    def target_sector(self) -> str:
        return self.domain

    @target_sector.setter
    def target_sector(self, value: str):
        self.domain = value

    @property
    def budget_estimate(self):
        return self.budget_max

    @budget_estimate.setter
    def budget_estimate(self, value):
        self.budget_max = value
        if self.budget_min is None:
            self.budget_min = 0

    @property
    def pilot_duration_months(self) -> float:
        return round(float(self.pilot_duration_days) / 30.0, 1)

    @pilot_duration_months.setter
    def pilot_duration_months(self, value: float):
        self.pilot_duration_days = int(round(float(value) * 30.0))
