import enum
from sqlalchemy import Column, String, Text, DateTime, Float, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now


class ApplicationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"

    # Legacy statuses for backwards compatibility
    SCREENING_PASSED = "SCREENING_PASSED"
    UNDER_EVALUATION = "UNDER_EVALUATION"
    SELECTED_FOR_PILOT = "SELECTED_FOR_PILOT"


class Application(Base, BaseModelMixin):
    """
    Startup technical application submitted to an open government challenge.
    Captures problem diagnosis, technical approach, pilot implementation plan,
    budget grant requests, risk mitigations, and compliance commitments.
    """
    __tablename__ = "applications"

    # Unique human-readable application code (e.g. APP-2026-0001)
    application_code = Column(String(50), nullable=True, unique=True, index=True)

    # Foreign Keys
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    # Application Status Lifecycle
    status = Column(
        String(50),
        default=ApplicationStatus.DRAFT.value,
        nullable=False,
        index=True,
    )

    # Step 1: Basic Proposal
    proposal_title = Column(String(255), nullable=True)
    executive_summary = Column(Text, nullable=True)
    proposal_summary = Column(Text, nullable=True)  # Legacy column maintained for compatibility

    # Step 2: Problem & Solution
    problem_understanding = Column(Text, nullable=True)
    proposed_solution = Column(Text, nullable=True)
    technical_approach = Column(Text, nullable=True)
    proposed_solution_trl = Column(String(50), default="TRL 7", nullable=True)  # Legacy column

    # Step 3: Expected Outcomes & Implementation
    expected_outcomes = Column(Text, nullable=True)
    implementation_plan = Column(Text, nullable=True)

    # Step 4: Pilot Approach & Constraints
    pilot_plan = Column(Text, nullable=True)
    timeline_days = Column(Integer, nullable=True)
    risks = Column(Text, nullable=True)
    dependencies = Column(Text, nullable=True)

    # Step 5: Startup Capability & References
    team_capabilities = Column(Text, nullable=True)
    previous_deployments = Column(Text, nullable=True)

    # Step 6: Cost & Budget Envelope
    estimated_cost = Column(Float, nullable=True)
    requested_budget = Column(Float, nullable=True)

    # Step 7: Data, Security, & IP Approach
    data_requirements = Column(Text, nullable=True)
    security_approach = Column(Text, nullable=True)
    ip_approach = Column(Text, nullable=True)

    # Step 8: Supporting Documents & Eligibility Snapshot (JSON-encoded)
    supporting_documents = Column(Text, nullable=True)  # JSON-encoded array of uploaded doc metadata
    pitch_deck_url = Column(String(500), nullable=True)  # Legacy column
    eligibility_snapshot = Column(Text, nullable=True)  # JSON-encoded evaluation of eligibility criteria

    # Review Remarks & Timestamps
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    challenge = relationship("Challenge", back_populates="applications")
    startup = relationship("Startup", back_populates="applications")
    submitter = relationship("User", foreign_keys=[submitted_by])
    evaluations = relationship("Evaluation", back_populates="application", cascade="all, delete-orphan")
    evaluation_assignments = relationship("EvaluationAssignment", back_populates="application", cascade="all, delete-orphan")
    pilot = relationship("Pilot", back_populates="application", uselist=False)

    # Indexes
    __table_args__ = (
        Index("ix_applications_challenge_startup", "challenge_id", "startup_id"),
    )

    # ==========================================================================
    # Backward Compatibility Harmonizers
    # ==========================================================================

    def sync_legacy_fields(self):
        """Synchronize new and legacy columns."""
        if self.executive_summary and not self.proposal_summary:
            self.proposal_summary = self.executive_summary
        elif self.proposal_summary and not self.executive_summary:
            self.executive_summary = self.proposal_summary
