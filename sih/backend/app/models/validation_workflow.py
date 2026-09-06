import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Numeric,
    Integer,
    Float,
    Boolean,
    Date,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now


class ValidatorAvailability(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    INACTIVE = "INACTIVE"


class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REASSIGNED = "REASSIGNED"


class ValidatorCOIDeclaration(str, enum.Enum):
    NO_CONFLICT = "NO_CONFLICT"
    CONFLICT_DECLARED = "CONFLICT_DECLARED"


class ValidationAssessment(str, enum.Enum):
    SUCCESSFUL = "SUCCESSFUL"
    PARTIALLY_SUCCESSFUL = "PARTIALLY_SUCCESSFUL"
    UNSUCCESSFUL = "UNSUCCESSFUL"
    INCONCLUSIVE = "INCONCLUSIVE"


class ValidationConfidence(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class KPIValidationResult(str, enum.Enum):
    ACHIEVED = "ACHIEVED"
    NOT_ACHIEVED = "NOT_ACHIEVED"
    INCONCLUSIVE = "INCONCLUSIVE"
    NOT_VALIDATED = "NOT_VALIDATED"


class PilotValidationStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    VALIDATOR_ASSIGNED = "VALIDATOR_ASSIGNED"
    VALIDATION_IN_PROGRESS = "VALIDATION_IN_PROGRESS"
    VALIDATION_SUBMITTED = "VALIDATION_SUBMITTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    VALIDATION_COMPLETED = "VALIDATION_COMPLETED"


class ValidatorProfile(Base, BaseModelMixin):
    """
    Accredited third-party verification entity or independent evaluation agency.
    """
    __tablename__ = "validator_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    organization = Column(String(255), nullable=False)
    domain_expertise = Column(Text, nullable=True)
    qualifications = Column(Text, nullable=True)
    accreditations = Column(Text, nullable=True)
    years_of_experience = Column(Integer, default=0, nullable=False)
    validation_count = Column(Integer, default=0, nullable=False)
    rating = Column(Numeric(3, 2), nullable=True)
    availability = Column(String(50), default=ValidatorAvailability.AVAILABLE.value, nullable=False, index=True)
    contact_phone = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assignments = relationship("ValidationAssignment", back_populates="validator", cascade="all, delete-orphan")
    reports = relationship("ValidationReport", back_populates="validator", cascade="all, delete-orphan")


class ValidationAssignment(Base, BaseModelMixin):
    """
    Formal tasking assigning an independent validator to audit a completed operational pilot.
    """
    __tablename__ = "validation_assignments"

    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)
    validator_id = Column(String(36), ForeignKey("validator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, default=utc_now, nullable=False)

    scope = Column(Text, nullable=True)
    terms_of_reference = Column(Text, nullable=True)
    status = Column(String(50), default=AssignmentStatus.ASSIGNED.value, nullable=False, index=True)

    coi_declared = Column(Boolean, default=False, nullable=False)
    coi_status = Column(String(50), default=ValidatorCOIDeclaration.NO_CONFLICT.value, nullable=False, index=True)
    coi_declaration_date = Column(DateTime, nullable=True)
    coi_details = Column(Text, nullable=True)

    response_date = Column(DateTime, nullable=True)
    decline_reason = Column(Text, nullable=True)
    deadline = Column(Date, nullable=True)

    # Relationships
    pilot = relationship("Pilot", back_populates="validation_assignments")
    validator = relationship("ValidatorProfile", back_populates="assignments", foreign_keys=[validator_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
    conflict_declaration = relationship(
        "ValidatorConflictOfInterest",
        back_populates="assignment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    report = relationship(
        "ValidationReport",
        back_populates="assignment",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_val_assign_pilot_val", "pilot_id", "validator_id"),
    )


class ValidatorConflictOfInterest(Base, BaseModelMixin):
    """
    Statutory integrity declaration required by the independent validator before accessing evidence.
    """
    __tablename__ = "validator_conflicts_of_interest"

    assignment_id = Column(
        String(36), ForeignKey("validation_assignments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    validator_id = Column(String(36), ForeignKey("validator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)

    declaration = Column(String(50), default=ValidatorCOIDeclaration.NO_CONFLICT.value, nullable=False, index=True)
    has_financial_interest = Column(Boolean, default=False, nullable=False)
    has_past_employment = Column(Boolean, default=False, nullable=False)
    has_personal_relationship = Column(Boolean, default=False, nullable=False)
    has_competitive_interest = Column(Boolean, default=False, nullable=False)
    declaration_details = Column(Text, nullable=True)
    mitigation_notes = Column(Text, nullable=True)
    is_cleared = Column(Boolean, default=True, nullable=False)
    cleared_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cleared_at = Column(DateTime, nullable=True)
    declared_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    assignment = relationship("ValidationAssignment", back_populates="conflict_declaration")
    validator = relationship("ValidatorProfile")
    pilot = relationship("Pilot")
    clearer = relationship("User", foreign_keys=[cleared_by])


class ValidationReport(Base, BaseModelMixin):
    """
    Independent audit report synthesizing empirical findings, KPI validations, and outcome assessment.
    """
    __tablename__ = "validation_reports"

    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)
    validator_id = Column(String(36), ForeignKey("validator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(
        String(36), ForeignKey("validation_assignments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )

    executive_summary = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    overall_assessment = Column(
        String(50), default=ValidationAssessment.INCONCLUSIVE.value, nullable=False, index=True
    )
    overall_achievement_percentage = Column(Numeric(5, 2), nullable=True)
    kpis_achieved_count = Column(Integer, default=0, nullable=False)
    kpis_total_count = Column(Integer, default=0, nullable=False)
    confidence_level = Column(
        String(50), default=ValidationConfidence.MEDIUM.value, nullable=False
    )
    findings = Column(Text, nullable=True)
    unintended_effects = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    readiness_assessment = Column(Text, nullable=True)
    risks_and_limitations = Column(Text, nullable=True)

    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    submitted_at = Column(DateTime, nullable=True)
    reopened_at = Column(DateTime, nullable=True)
    reopened_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reopen_reason = Column(Text, nullable=True)

    # Relationships
    pilot = relationship("Pilot", back_populates="validation_reports")
    validator = relationship("ValidatorProfile", back_populates="reports", foreign_keys=[validator_id])
    assignment = relationship("ValidationAssignment", back_populates="report")
    reopener = relationship("User", foreign_keys=[reopened_by])

    kpi_validations = relationship(
        "KPIValidation",
        back_populates="report",
        cascade="all, delete-orphan",
    )


class KPIValidation(Base, BaseModelMixin):
    """
    Evaluation line item for a specific KPI audited within a validation report.
    """
    __tablename__ = "kpi_validations"

    report_id = Column(
        String(36), ForeignKey("validation_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kpi_id = Column(String(36), ForeignKey("pilot_kpis.id", ondelete="CASCADE"), nullable=False, index=True)

    validator_measured_value = Column(Numeric(14, 4), nullable=True)
    result = Column(String(50), default=KPIValidationResult.NOT_VALIDATED.value, nullable=False, index=True)
    achievement_percentage = Column(Numeric(5, 2), nullable=True)
    evidence_sufficiency = Column(String(50), default="SUFFICIENT", nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    methodology_notes = Column(Text, nullable=True)
    validator_commentary = Column(Text, nullable=True)
    divergence_analysis = Column(Text, nullable=True)

    # Relationships
    report = relationship("ValidationReport", back_populates="kpi_validations")
    kpi = relationship("PilotKPI", back_populates="validations")
