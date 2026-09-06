import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Numeric,
    Integer,
    Date,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class PilotStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

    # Legacy statuses preserved for backward compatibility
    INITIATED = "INITIATED"
    AGREEMENT_SIGNED = "AGREEMENT_SIGNED"
    UNDER_INDEPENDENT_AUDIT = "UNDER_INDEPENDENT_AUDIT"
    SUCCESSFULLY_VALIDATED = "SUCCESSFULLY_VALIDATED"
    FAILED_VALIDATION = "FAILED_VALIDATION"
    TERMINATED = "TERMINATED"


class PilotApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PilotSuccessStatus(str, enum.Enum):
    NOT_ASSESSED = "NOT_ASSESSED"
    SUCCESSFUL = "SUCCESSFUL"
    PARTIALLY_SUCCESSFUL = "PARTIALLY_SUCCESSFUL"
    UNSUCCESSFUL = "UNSUCCESSFUL"
    INCONCLUSIVE = "INCONCLUSIVE"


class Pilot(Base, BaseModelMixin):
    """
    Controlled operational pilot project testing shortlisted startup solutions
    in a live public department environment prior to procurement or scale-up.
    """
    __tablename__ = "pilots"

    # Unique identification
    pilot_code = Column(String(50), unique=True, nullable=True, index=True)

    # Foreign Key Associations
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False, index=True)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=True, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=True, index=True)
    government_department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)

    # Operational Specifications
    pilot_title = Column(String(255), nullable=True)
    objective = Column(Text, nullable=True)
    scope = Column(Text, nullable=True)
    problem_statement = Column(Text, nullable=True)
    proposed_solution = Column(Text, nullable=True)
    expected_outcomes = Column(Text, nullable=True)

    # Location & Deployment Sandbox
    pilot_location = Column(String(255), nullable=True)
    operating_regions = Column(String(500), nullable=True)  # State, District, Department/Office

    # Timeline & Duration
    start_date = Column(Date, nullable=True, index=True)
    planned_end_date = Column(Date, nullable=True, index=True)
    actual_end_date = Column(Date, nullable=True)
    duration_days = Column(Integer, default=90, nullable=False)

    # Budget
    pilot_budget = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)

    # Stakeholder Ownership
    government_owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    startup_owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Lifecycle Status Tracking
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    approval_status = Column(String(50), default="PENDING", nullable=False)
    success_status = Column(String(50), default="NOT_ASSESSED", nullable=False)

    # Decision Justifications
    rejection_reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)

    # Step 7: Validation & Success Governance
    validation_status = Column(String(50), default="NOT_STARTED", nullable=False, index=True)
    validator_assessment = Column(String(50), nullable=True)
    classification_confirmed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    classification_confirmed_at = Column(DateTime, nullable=True)
    classification_notes = Column(Text, nullable=True)
    classification_divergence_reason = Column(Text, nullable=True)

    # Legacy column compatibility
    title = Column(String(255), nullable=True)
    scope_of_work = Column(Text, nullable=True)
    duration_weeks = Column(Integer, default=12, nullable=True)
    sandbox_location = Column(String(255), nullable=True)
    approved_budget = Column(Numeric(14, 2), nullable=True)
    end_date = Column(Date, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_pilots_dept_status", "government_department_id", "status"),
        Index("ix_pilots_startup_status", "startup_id", "status"),
        Index("ix_pilots_dates", "start_date", "planned_end_date"),
        Index("ix_pilots_val_status", "validation_status"),
    )

    # Relationships
    application = relationship("Application", back_populates="pilot")
    challenge = relationship("Challenge")
    startup = relationship("Startup")
    department = relationship("Department")
    government_owner = relationship("User", foreign_keys=[government_owner_id])
    startup_owner = relationship("User", foreign_keys=[startup_owner_id])
    creator = relationship("User", foreign_keys=[created_by])
    classifier = relationship("User", foreign_keys=[classification_confirmed_by])

    milestones = relationship(
        "Milestone",
        back_populates="pilot",
        cascade="all, delete-orphan",
        order_by="Milestone.sequence_number.asc()",
    )
    deliverables = relationship(
        "PilotDeliverable",
        back_populates="pilot",
        cascade="all, delete-orphan",
    )
    pilot_kpis = relationship(
        "PilotKPI",
        back_populates="pilot",
        cascade="all, delete-orphan",
        order_by="PilotKPI.created_at.asc()",
    )
    validation_assignments = relationship(
        "ValidationAssignment",
        back_populates="pilot",
        cascade="all, delete-orphan",
    )
    validation_reports = relationship(
        "ValidationReport",
        back_populates="pilot",
        cascade="all, delete-orphan",
    )
    kpis = relationship("KPI", back_populates="pilot")
    validation = relationship("Validation", back_populates="pilot", uselist=False)
    procurement_decisions = relationship(
        "ProcurementDecision",
        back_populates="pilot",
        cascade="all, delete-orphan",
        order_by="ProcurementDecision.created_at.desc()",
    )
    procurement_records = relationship(
        "ProcurementRecord",
        back_populates="pilot",
        cascade="all, delete-orphan",
        order_by="ProcurementRecord.created_at.desc()",
    )
    scale_up_decisions = relationship(
        "ScaleUpDecision",
        back_populates="pilot",
        cascade="all, delete-orphan",
        order_by="ScaleUpDecision.created_at.desc()",
    )

    # Property helpers for seamless legacy attribute access
    @property
    def display_title(self) -> str:
        return self.pilot_title or self.title or "Untitled Pilot"

    @property
    def display_scope(self) -> str:
        return self.scope or self.scope_of_work or ""

    @property
    def display_location(self) -> str:
        return self.pilot_location or self.sandbox_location or ""

    @property
    def display_budget(self) -> float:
        val = self.pilot_budget or self.approved_budget or 0.0
        return float(val)

    @property
    def display_end_date(self):
        return self.planned_end_date or self.end_date
