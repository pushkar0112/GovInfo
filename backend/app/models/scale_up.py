import enum
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Date,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    Index,
    Float,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


# ==============================================================================
# Step 9 Enums
# ==============================================================================

class ScaleUpDecisionType(str, enum.Enum):
    SCALE = "SCALE"
    REPLICATE = "REPLICATE"
    EXTEND = "EXTEND"
    RE_PILOT = "RE_PILOT"
    DO_NOT_SCALE = "DO_NOT_SCALE"
    FURTHER_REVIEW = "FURTHER_REVIEW"


class ScaleUpDecisionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class ScalePlanStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PLANNING = "PLANNING"
    APPROVAL_PENDING = "APPROVAL_PENDING"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ScalePlanApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class RolloutStrategy(str, enum.Enum):
    PHASED_ROLLOUT = "PHASED_ROLLOUT"
    PARALLEL_ROLLOUT = "PARALLEL_ROLLOUT"
    REGIONAL_ROLLOUT = "REGIONAL_ROLLOUT"
    DEPARTMENT_ROLLOUT = "DEPARTMENT_ROLLOUT"
    SITE_BY_SITE = "SITE_BY_SITE"
    CUSTOM = "CUSTOM"


class ScaleTargetType(str, enum.Enum):
    DEPARTMENT = "DEPARTMENT"
    REGION = "REGION"
    DISTRICT = "DISTRICT"
    SITE = "SITE"
    OPERATIONAL_UNIT = "OPERATIONAL_UNIT"
    CUSTOM = "CUSTOM"


class ScaleTargetStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    READY = "READY"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ReplicationDeploymentStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    ADAPTATION_REQUIRED = "ADAPTATION_REQUIRED"
    READY = "READY"
    DEPLOYED = "DEPLOYED"
    VALIDATING = "VALIDATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ReadinessCategory(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    OPERATIONAL = "OPERATIONAL"
    SECURITY = "SECURITY"
    FINANCIAL = "FINANCIAL"
    TRAINING = "TRAINING"
    SUPPORT = "SUPPORT"
    DATA = "DATA"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    GOVERNANCE = "GOVERNANCE"


class ReadinessStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    BLOCKED = "BLOCKED"


class ScaleApprovalType(str, enum.Enum):
    TECHNICAL_REVIEW = "TECHNICAL_REVIEW"
    OPERATIONAL_REVIEW = "OPERATIONAL_REVIEW"
    FINANCIAL_REVIEW = "FINANCIAL_REVIEW"
    GOVERNMENT_APPROVAL = "GOVERNMENT_APPROVAL"


class ScaleApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REQUESTED_CHANGES = "REQUESTED_CHANGES"


class ScalePhaseStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class ImpactCategory(str, enum.Enum):
    SERVICE_DELIVERY = "SERVICE_DELIVERY"
    COST = "COST"
    TIME = "TIME"
    ADOPTION = "ADOPTION"
    QUALITY = "QUALITY"
    RELIABILITY = "RELIABILITY"
    ACCESS = "ACCESS"
    EFFICIENCY = "EFFICIENCY"
    ENVIRONMENT = "ENVIRONMENT"
    SOCIAL_IMPACT = "SOCIAL_IMPACT"
    CUSTOM = "CUSTOM"


class ImpactDirection(str, enum.Enum):
    HIGHER_IS_BETTER = "HIGHER_IS_BETTER"
    LOWER_IS_BETTER = "LOWER_IS_BETTER"
    TARGET_EXACT = "TARGET_EXACT"
    RANGE_BOUND = "RANGE_BOUND"


class ScaleOutcomeType(str, enum.Enum):
    SUCCESSFUL = "SUCCESSFUL"
    PARTIALLY_SUCCESSFUL = "PARTIALLY_SUCCESSFUL"
    UNSUCCESSFUL = "UNSUCCESSFUL"
    INCONCLUSIVE = "INCONCLUSIVE"


class BeneficiaryCategory(str, enum.Enum):
    DIRECT_BENEFICIARIES = "DIRECT_BENEFICIARIES"
    INDIRECT_BENEFICIARIES = "INDIRECT_BENEFICIARIES"
    OFFICERS = "OFFICERS"
    STUDENTS = "STUDENTS"
    PATIENTS = "PATIENTS"
    CITIZENS = "CITIZENS"
    BUSINESSES = "BUSINESSES"
    CUSTOM = "CUSTOM"


class RiskCategory(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    OPERATIONAL = "OPERATIONAL"
    FINANCIAL = "FINANCIAL"
    SECURITY = "SECURITY"
    DATA = "DATA"
    TRAINING = "TRAINING"
    SUPPORT = "SUPPORT"
    ADOPTION = "ADOPTION"
    PROCUREMENT = "PROCUREMENT"
    OTHER = "OTHER"


class RiskSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskStatus(str, enum.Enum):
    OPEN = "OPEN"
    MITIGATING = "MITIGATING"
    RESOLVED = "RESOLVED"
    ACCEPTED = "ACCEPTED"


class LessonCategory(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    OPERATIONAL = "OPERATIONAL"
    POLICY = "POLICY"
    TRAINING = "TRAINING"
    USER_ADOPTION = "USER_ADOPTION"
    SECURITY = "SECURITY"
    PROCUREMENT = "PROCUREMENT"
    COST = "COST"
    OTHER = "OTHER"


# ==============================================================================
# Step 9 Database Models
# ==============================================================================

class ScaleUpDecision(Base, BaseModelMixin):
    """
    Official government post-procurement scale-up decision gate.
    Answers: 'Should this successfully validated and procured innovation scale?'
    """
    __tablename__ = "scale_up_decisions"

    scale_up_code = Column(String(50), unique=True, nullable=False, index=True)

    pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=False, index=True)
    procurement_id = Column(String(36), ForeignKey("procurement_records.id"), nullable=True, index=True)
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=True, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)
    originating_department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)

    decision_type = Column(String(50), nullable=False, index=True)
    decision_status = Column(String(50), default="DRAFT", nullable=False, index=True)
    rationale = Column(Text, nullable=False)
    expected_impact = Column(Text, nullable=True)
    estimated_scale_value = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    proposed_sites_count = Column(Integer, default=1, nullable=False)
    proposed_regions = Column(String(255), nullable=True)
    proposed_start_date = Column(Date, nullable=True)
    proposed_end_date = Column(Date, nullable=True)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)

    # Relationships
    pilot = relationship("Pilot", back_populates="scale_up_decisions", foreign_keys=[pilot_id])
    procurement = relationship("ProcurementRecord", foreign_keys=[procurement_id])
    contract = relationship("Contract", foreign_keys=[contract_id])
    startup = relationship("Startup", foreign_keys=[startup_id])
    department = relationship("Department", foreign_keys=[originating_department_id])
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    plans = relationship("ScaleUpPlan", back_populates="decision", cascade="all, delete-orphan")


class ScaleUpPlan(Base, BaseModelMixin):
    """
    Formal scale-up and multi-site deployment plan.
    Governs rollout strategy, budget, targets, phases, readiness, and impact.
    """
    __tablename__ = "scale_up_plans"

    scale_up_decision_id = Column(String(36), ForeignKey("scale_up_decisions.id"), nullable=False, index=True)
    plan_code = Column(String(50), unique=True, nullable=False, index=True)

    title = Column(String(255), nullable=False)
    objective = Column(Text, nullable=False)
    scope = Column(Text, nullable=False)
    target_population = Column(String(255), nullable=True)
    deployment_strategy = Column(String(50), default=RolloutStrategy.PHASED_ROLLOUT.value, nullable=False)
    rollout_strategy = Column(String(50), nullable=True)

    estimated_budget = Column(Numeric(14, 2), nullable=False)
    approved_budget = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)

    target_sites = Column(Integer, default=1, nullable=False)
    target_units = Column(Integer, default=1, nullable=False)
    target_regions = Column(String(255), nullable=True)

    start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)

    status = Column(String(50), default=ScalePlanStatus.DRAFT.value, nullable=False, index=True)
    approval_status = Column(String(50), default=ScalePlanApprovalStatus.PENDING.value, nullable=False, index=True)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    decision = relationship("ScaleUpDecision", back_populates="plans")
    creator = relationship("User", foreign_keys=[created_by])
    targets = relationship("ScaleTarget", back_populates="plan", cascade="all, delete-orphan")
    phases = relationship("ScalePhase", back_populates="plan", cascade="all, delete-orphan")
    readiness_checks = relationship("ScaleReadinessCheck", back_populates="plan", cascade="all, delete-orphan")
    approvals = relationship("ScaleUpApproval", back_populates="plan", cascade="all, delete-orphan")
    replications = relationship("Replication", back_populates="plan", cascade="all, delete-orphan")
    impact_metrics = relationship("ImpactMetric", back_populates="plan", cascade="all, delete-orphan")
    beneficiary_metrics = relationship("ScaleBeneficiaryMetric", back_populates="plan", cascade="all, delete-orphan")
    risks = relationship("ScaleRisk", back_populates="plan", cascade="all, delete-orphan")
    lessons = relationship("ScaleLesson", back_populates="plan", cascade="all, delete-orphan")
    outcomes = relationship("ScaleOutcome", back_populates="plan", cascade="all, delete-orphan")


class ScaleTarget(Base, BaseModelMixin):
    """
    Specific expansion site, office, district, or operational unit under a ScaleUpPlan.
    """
    __tablename__ = "scale_targets"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    target_type = Column(String(50), default=ScaleTargetType.SITE.value, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)
    region = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)
    site_name = Column(String(255), nullable=True)
    operational_unit = Column(String(255), nullable=True)
    target_population = Column(Integer, nullable=True)
    planned_start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)
    budget = Column(Numeric(14, 2), default=0.0, nullable=False)
    status = Column(String(50), default=ScaleTargetStatus.PLANNED.value, nullable=False, index=True)
    progress_percentage = Column(Float, default=0.0, nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="targets")
    department = relationship("Department", foreign_keys=[department_id])
    deployment_updates = relationship("ScaleDeploymentUpdate", back_populates="target", cascade="all, delete-orphan")


class Replication(Base, BaseModelMixin):
    """
    Distinguishes copying a solution from adapting a solution to a new local context.
    """
    __tablename__ = "replications"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    source_pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=False, index=True)
    source_site = Column(String(255), nullable=False)
    target_site = Column(String(255), nullable=False)
    target_department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)

    adaptation_required = Column(Boolean, default=False, nullable=False)
    adaptation_notes = Column(Text, nullable=True)
    local_constraints = Column(Text, nullable=True)
    deployment_status = Column(String(50), default=ReplicationDeploymentStatus.PLANNED.value, nullable=False, index=True)
    lessons_learned = Column(Text, nullable=True)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="replications")
    source_pilot = relationship("Pilot", foreign_keys=[source_pilot_id])
    target_department = relationship("Department", foreign_keys=[target_department_id])


class ScaleReadinessCheck(Base, BaseModelMixin):
    """
    Operational, technical, security, and financial readiness gates.
    Mandatory checks must be complete before a ScaleUpPlan can be activated.
    """
    __tablename__ = "scale_readiness_checks"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    category = Column(String(50), default=ReadinessCategory.TECHNICAL.value, nullable=False)
    check_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    required = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default=ReadinessStatus.PENDING.value, nullable=False, index=True)

    evidence_document_id = Column(String(36), nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="readiness_checks")
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class ScaleUpApproval(Base, BaseModelMixin):
    """
    Configurable multi-tier approval audit trail for scale-up plans.
    """
    __tablename__ = "scale_up_approvals"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    approval_type = Column(String(50), default=ScaleApprovalType.GOVERNMENT_APPROVAL.value, nullable=False)
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), default=ScaleApprovalStatus.PENDING.value, nullable=False, index=True)
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="approvals")
    approver = relationship("User", foreign_keys=[approver_id])


class ScalePhase(Base, BaseModelMixin):
    """
    Staged rollout phases (e.g. Phase 1: 5 sites, Phase 2: 20 sites).
    """
    __tablename__ = "scale_phases"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    phase_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    objective = Column(Text, nullable=True)
    target_count = Column(Integer, default=1, nullable=False)
    budget = Column(Numeric(14, 2), default=0.0, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(50), default=ScalePhaseStatus.PLANNED.value, nullable=False, index=True)
    completion_percentage = Column(Float, default=0.0, nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="phases")
    milestones = relationship("ScaleMilestone", back_populates="phase", cascade="all, delete-orphan")


class ScaleMilestone(Base, BaseModelMixin):
    """
    Milestone deliverable within a scale rollout phase.
    """
    __tablename__ = "scale_milestones"

    scale_phase_id = Column(String(36), ForeignKey("scale_phases.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_number = Column(Integer, default=1, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    due_date = Column(Date, nullable=True)
    completion_percentage = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False)
    acceptance_status = Column(String(50), default="PENDING", nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    phase = relationship("ScalePhase", back_populates="milestones")


class ScaleDeploymentUpdate(Base, BaseModelMixin):
    """
    Site deployment report submitted by startup and audited by government.
    """
    __tablename__ = "scale_deployment_updates"

    scale_target_id = Column(String(36), ForeignKey("scale_targets.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    completion_percentage = Column(Float, nullable=False)
    update_text = Column(Text, nullable=False)
    blockers = Column(Text, nullable=True)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comments = Column(Text, nullable=True)

    # Relationships
    target = relationship("ScaleTarget", back_populates="deployment_updates")
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ImpactMetric(Base, BaseModelMixin):
    """
    Measurable quantitative metric of public scale outcome.
    """
    __tablename__ = "impact_metrics"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default=ImpactCategory.SERVICE_DELIVERY.value, nullable=False, index=True)
    unit = Column(String(50), nullable=False)
    baseline_value = Column(Float, nullable=False)
    target_value = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=True)
    direction = Column(String(50), default=ImpactDirection.HIGHER_IS_BETTER.value, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    is_critical = Column(Boolean, default=False, nullable=False)
    measurement_date = Column(Date, nullable=True)
    data_source = Column(String(255), nullable=True)
    verification_status = Column(String(50), default="PENDING", nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="impact_metrics")
    measurements = relationship("ImpactMeasurement", back_populates="metric", cascade="all, delete-orphan")
    evidence = relationship("ImpactEvidence", back_populates="metric", cascade="all, delete-orphan")


class ImpactMeasurement(Base, BaseModelMixin):
    """
    Time-series audit measurement against an ImpactMetric.
    Historical records are immutable.
    """
    __tablename__ = "impact_measurements"

    impact_metric_id = Column(String(36), ForeignKey("impact_metrics.id"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    measurement_date = Column(Date, nullable=False, index=True)
    sample_size = Column(Integer, nullable=True)
    confidence_interval = Column(String(100), nullable=True)
    data_source = Column(String(255), nullable=True)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    evidence_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    metric = relationship("ImpactMetric", back_populates="measurements")
    recorder = relationship("User", foreign_keys=[recorded_by])


class ImpactEvidence(Base, BaseModelMixin):
    """
    Cryptographically verified (SHA-256) evidence dataset supporting impact claims.
    """
    __tablename__ = "impact_evidence"

    impact_metric_id = Column(String(36), ForeignKey("impact_metrics.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False)
    checksum = Column(String(128), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    verification_status = Column(String(50), default="VERIFIED", nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    metric = relationship("ImpactMetric", back_populates="evidence")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class ScaleOutcome(Base, BaseModelMixin):
    """
    Overall evaluated impact score and confirmed public outcome for a ScaleUpPlan.
    """
    __tablename__ = "scale_outcomes"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    impact_score = Column(Float, nullable=False)
    recommended_outcome = Column(String(50), nullable=False)
    confirmed_outcome = Column(String(50), nullable=False)
    confirmation_reason = Column(Text, nullable=True)
    confirmed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="outcomes")
    confirmer = relationship("User", foreign_keys=[confirmed_by])


class ScaleBeneficiaryMetric(Base, BaseModelMixin):
    """
    Categorized beneficiary counts and impact demographics.
    """
    __tablename__ = "scale_beneficiary_metrics"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    category = Column(String(50), default=BeneficiaryCategory.DIRECT_BENEFICIARIES.value, nullable=False)
    baseline_count = Column(Integer, default=0, nullable=False)
    target_count = Column(Integer, default=0, nullable=False)
    actual_count = Column(Integer, default=0, nullable=False)
    measurement_date = Column(Date, nullable=True)
    data_source = Column(String(255), nullable=True)
    verification_status = Column(String(50), default="VERIFIED", nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="beneficiary_metrics")


class ScaleRisk(Base, BaseModelMixin):
    """
    Risk register for operational scale-up deployments.
    """
    __tablename__ = "scale_risks"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default=RiskCategory.OPERATIONAL.value, nullable=False)
    severity = Column(String(50), default=RiskSeverity.MEDIUM.value, nullable=False)
    likelihood = Column(String(50), default="MEDIUM", nullable=False)
    mitigation = Column(Text, nullable=True)
    owner = Column(String(255), nullable=True)
    status = Column(String(50), default=RiskStatus.OPEN.value, nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="risks")


class ScaleLesson(Base, BaseModelMixin):
    """
    Institutional knowledge and recommendations captured during scale deployment.
    """
    __tablename__ = "scale_lessons"

    scale_up_plan_id = Column(String(36), ForeignKey("scale_up_plans.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default=LessonCategory.OPERATIONAL.value, nullable=False)
    recommendation = Column(Text, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    plan = relationship("ScaleUpPlan", back_populates="lessons")
    creator = relationship("User", foreign_keys=[created_by])
