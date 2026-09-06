from datetime import date, datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

from app.models.scale_up import (
    ScaleUpDecisionType,
    ScaleUpDecisionStatus,
    ScalePlanStatus,
    ScalePlanApprovalStatus,
    RolloutStrategy,
    ScaleTargetType,
    ScaleTargetStatus,
    ReplicationDeploymentStatus,
    ReadinessCategory,
    ReadinessStatus,
    ScaleApprovalType,
    ScaleApprovalStatus,
    ScalePhaseStatus,
    ImpactCategory,
    ImpactDirection,
    ScaleOutcomeType,
    BeneficiaryCategory,
    RiskCategory,
    RiskSeverity,
    RiskStatus,
    LessonCategory,
)


# ==============================================================================
# Scale-Up Decision Schemas
# ==============================================================================

class ScaleUpDecisionCreateRequest(BaseModel):
    decision_type: ScaleUpDecisionType = Field(default=ScaleUpDecisionType.SCALE)
    rationale: str = Field(..., min_length=10, description="Detailed administrative rationale for scale decision")
    expected_impact: Optional[str] = Field(default=None, description="Anticipated public outcome and benefits")
    estimated_scale_value: Optional[float] = Field(default=None, ge=0.0)
    currency: str = Field(default="INR")
    proposed_sites_count: int = Field(default=1, ge=1)
    proposed_regions: Optional[str] = None
    proposed_start_date: Optional[date] = None
    proposed_end_date: Optional[date] = None


class ScaleUpDecisionUpdateRequest(BaseModel):
    decision_type: Optional[ScaleUpDecisionType] = None
    rationale: Optional[str] = None
    expected_impact: Optional[str] = None
    estimated_scale_value: Optional[float] = None
    proposed_sites_count: Optional[int] = None
    proposed_regions: Optional[str] = None
    proposed_start_date: Optional[date] = None
    proposed_end_date: Optional[date] = None


class ScaleUpDecisionResponse(BaseModel):
    id: str
    scale_up_code: str
    pilot_id: str
    procurement_id: Optional[str] = None
    contract_id: Optional[str] = None
    startup_id: str
    originating_department_id: str
    decision_type: str
    decision_status: str
    rationale: str
    expected_impact: Optional[str] = None
    estimated_scale_value: Optional[float] = None
    currency: str
    proposed_sites_count: int
    proposed_regions: Optional[str] = None
    proposed_start_date: Optional[date] = None
    proposed_end_date: Optional[date] = None
    created_by: str
    reviewed_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Rich metadata
    pilot_title: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Scale-Up Plan Schemas
# ==============================================================================

class ScaleUpPlanCreateRequest(BaseModel):
    scale_up_decision_id: str
    title: str = Field(..., min_length=3)
    objective: str = Field(..., min_length=10)
    scope: str = Field(..., min_length=10)
    target_population: Optional[str] = None
    deployment_strategy: RolloutStrategy = Field(default=RolloutStrategy.PHASED_ROLLOUT)
    rollout_strategy: Optional[str] = None
    estimated_budget: float = Field(..., ge=0.0)
    approved_budget: Optional[float] = Field(default=None, ge=0.0)
    currency: str = Field(default="INR")
    target_sites: int = Field(default=1, ge=1)
    target_units: int = Field(default=1, ge=1)
    target_regions: Optional[str] = None
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class ScaleUpPlanUpdateRequest(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    target_population: Optional[str] = None
    deployment_strategy: Optional[RolloutStrategy] = None
    rollout_strategy: Optional[str] = None
    estimated_budget: Optional[float] = None
    approved_budget: Optional[float] = None
    target_sites: Optional[int] = None
    target_units: Optional[int] = None
    target_regions: Optional[str] = None
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class ScaleUpPlanResponse(BaseModel):
    id: str
    scale_up_decision_id: str
    plan_code: str
    title: str
    objective: str
    scope: str
    target_population: Optional[str] = None
    deployment_strategy: str
    rollout_strategy: Optional[str] = None
    estimated_budget: float
    approved_budget: Optional[float] = None
    currency: str
    target_sites: int
    target_units: int
    target_regions: Optional[str] = None
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    status: str
    approval_status: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    # Calculated metrics
    progress_percentage: float = 0.0
    phase_count: int = 0
    target_count: int = 0
    readiness_completed_count: int = 0
    readiness_total_count: int = 0
    disbursed_or_spent_amount: float = 0.0

    # Associated names
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    pilot_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Scale Target Schemas
# ==============================================================================

class ScaleTargetCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    target_type: ScaleTargetType = Field(default=ScaleTargetType.SITE)
    department_id: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    site_name: Optional[str] = None
    operational_unit: Optional[str] = None
    target_population: Optional[int] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    budget: float = Field(default=0.0, ge=0.0)


class ScaleTargetUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[ScaleTargetStatus] = None
    progress_percentage: Optional[float] = None
    budget: Optional[float] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class ScaleTargetResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    name: str
    target_type: str
    department_id: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    site_name: Optional[str] = None
    operational_unit: Optional[str] = None
    target_population: Optional[int] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    budget: float
    status: str
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Scale Phase & Milestone Schemas
# ==============================================================================

class ScalePhaseCreateRequest(BaseModel):
    phase_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=2)
    objective: Optional[str] = None
    target_count: int = Field(default=1, ge=1)
    budget: float = Field(default=0.0, ge=0.0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ScalePhaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    target_count: Optional[int] = None
    budget: Optional[float] = None
    completion_percentage: Optional[float] = None
    status: Optional[ScalePhaseStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ScalePhaseResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    phase_number: int
    title: str
    objective: Optional[str] = None
    target_count: int
    budget: float
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    completion_percentage: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScaleMilestoneCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    sequence_number: int = Field(default=1, ge=1)
    weight: float = Field(default=1.0, gt=0.0)
    due_date: Optional[date] = None


class ScaleMilestoneResponse(BaseModel):
    id: str
    scale_phase_id: str
    title: str
    description: Optional[str] = None
    sequence_number: int
    weight: float
    due_date: Optional[date] = None
    completion_percentage: float
    status: str
    acceptance_status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Readiness & Approval Schemas
# ==============================================================================

class ScaleReadinessCheckCreateRequest(BaseModel):
    category: ReadinessCategory = Field(default=ReadinessCategory.TECHNICAL)
    check_name: str = Field(..., min_length=3)
    description: Optional[str] = None
    required: bool = Field(default=True)


class ScaleReadinessCheckUpdateRequest(BaseModel):
    status: ReadinessStatus
    reviewer_comments: Optional[str] = None
    evidence_document_id: Optional[str] = None


class ScaleReadinessCheckResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    category: str
    check_name: str
    description: Optional[str] = None
    required: bool
    status: str
    evidence_document_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    reviewer_comments: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScaleUpApprovalCreateRequest(BaseModel):
    approval_type: ScaleApprovalType = Field(default=ScaleApprovalType.GOVERNMENT_APPROVAL)
    status: ScaleApprovalStatus = Field(default=ScaleApprovalStatus.APPROVED)
    comments: Optional[str] = None


class ScaleUpApprovalResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    approval_type: str
    approver_id: Optional[str] = None
    status: str
    comments: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Replication Schemas
# ==============================================================================

class ReplicationCreateRequest(BaseModel):
    source_pilot_id: str
    source_site: str = Field(..., min_length=2)
    target_site: str = Field(..., min_length=2)
    target_department_id: str
    adaptation_required: bool = Field(default=False)
    adaptation_notes: Optional[str] = None
    local_constraints: Optional[str] = None


class ReplicationUpdateRequest(BaseModel):
    deployment_status: Optional[ReplicationDeploymentStatus] = None
    adaptation_notes: Optional[str] = None
    local_constraints: Optional[str] = None
    lessons_learned: Optional[str] = None


class ReplicationResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    source_pilot_id: str
    source_site: str
    target_site: str
    target_department_id: str
    adaptation_required: bool
    adaptation_notes: Optional[str] = None
    local_constraints: Optional[str] = None
    deployment_status: str
    lessons_learned: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Deployment Update Schemas
# ==============================================================================

class ScaleDeploymentUpdateCreateRequest(BaseModel):
    scale_target_id: str
    status: str = Field(..., description="e.g. ACTIVE, COMPLETED, BLOCKED")
    completion_percentage: float = Field(..., ge=0.0, le=100.0)
    update_text: str = Field(..., min_length=5)
    blockers: Optional[str] = None


class ScaleDeploymentUpdateReviewRequest(BaseModel):
    accepted: bool = Field(default=True)
    review_comments: Optional[str] = None


class ScaleDeploymentUpdateResponse(BaseModel):
    id: str
    scale_target_id: str
    status: str
    completion_percentage: float
    update_text: str
    blockers: Optional[str] = None
    submitted_by: str
    submitted_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Impact Metrics, Measurements & Evidence
# ==============================================================================

class ImpactMetricCreateRequest(BaseModel):
    code: str = Field(..., min_length=2)
    title: str = Field(..., min_length=3)
    category: ImpactCategory = Field(default=ImpactCategory.SERVICE_DELIVERY)
    unit: str = Field(..., min_length=1)
    baseline_value: float
    target_value: float
    actual_value: Optional[float] = None
    direction: ImpactDirection = Field(default=ImpactDirection.HIGHER_IS_BETTER)
    weight: float = Field(default=1.0, gt=0.0)
    is_critical: bool = Field(default=False)
    data_source: Optional[str] = None


class ImpactMetricUpdateRequest(BaseModel):
    title: Optional[str] = None
    actual_value: Optional[float] = None
    measurement_date: Optional[date] = None
    data_source: Optional[str] = None
    verification_status: Optional[str] = None


class ImpactMetricResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    code: str
    title: str
    category: str
    unit: str
    baseline_value: float
    target_value: float
    actual_value: Optional[float] = None
    direction: str
    weight: float
    is_critical: bool
    measurement_date: Optional[date] = None
    data_source: Optional[str] = None
    verification_status: str
    normalized_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImpactMeasurementCreateRequest(BaseModel):
    value: float
    measurement_date: Optional[date] = None
    sample_size: Optional[int] = None
    confidence_interval: Optional[str] = None
    data_source: Optional[str] = None
    evidence_id: Optional[str] = None
    notes: Optional[str] = None


class ImpactMeasurementResponse(BaseModel):
    id: str
    impact_metric_id: str
    value: float
    measurement_date: date
    sample_size: Optional[int] = None
    confidence_interval: Optional[str] = None
    data_source: Optional[str] = None
    recorded_by: str
    evidence_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImpactEvidenceCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    file_name: str
    storage_key: str
    checksum: str = Field(..., min_length=32, description="SHA-256 Checksum")
    version: int = Field(default=1, ge=1)


class ImpactEvidenceResponse(BaseModel):
    id: str
    impact_metric_id: str
    title: str
    file_name: str
    storage_key: str
    checksum: str
    version: int
    verification_status: str
    uploaded_by: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Scale Outcome & Beneficiary Schemas
# ==============================================================================

class ScaleOutcomeConfirmRequest(BaseModel):
    confirmed_outcome: ScaleOutcomeType
    confirmation_reason: Optional[str] = None


class ScaleOutcomeResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    impact_score: float
    recommended_outcome: str
    confirmed_outcome: str
    confirmation_reason: Optional[str] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScaleBeneficiaryMetricCreateRequest(BaseModel):
    category: BeneficiaryCategory = Field(default=BeneficiaryCategory.DIRECT_BENEFICIARIES)
    baseline_count: int = Field(default=0, ge=0)
    target_count: int = Field(default=0, ge=0)
    actual_count: int = Field(default=0, ge=0)
    measurement_date: Optional[date] = None
    data_source: Optional[str] = None


class ScaleBeneficiaryMetricResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    category: str
    baseline_count: int
    target_count: int
    actual_count: int
    measurement_date: Optional[date] = None
    data_source: Optional[str] = None
    verification_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Risk & Lesson Schemas
# ==============================================================================

class ScaleRiskCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    category: RiskCategory = Field(default=RiskCategory.OPERATIONAL)
    severity: RiskSeverity = Field(default=RiskSeverity.MEDIUM)
    likelihood: str = Field(default="MEDIUM")
    mitigation: Optional[str] = None
    owner: Optional[str] = None


class ScaleRiskUpdateRequest(BaseModel):
    status: RiskStatus
    mitigation: Optional[str] = None


class ScaleRiskResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    title: str
    description: Optional[str] = None
    category: str
    severity: str
    likelihood: str
    mitigation: Optional[str] = None
    owner: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScaleLessonCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: LessonCategory = Field(default=LessonCategory.OPERATIONAL)
    recommendation: str = Field(..., min_length=10)


class ScaleLessonResponse(BaseModel):
    id: str
    scale_up_plan_id: str
    title: str
    description: str
    category: str
    recommendation: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Dashboard & Portfolio Schemas
# ==============================================================================

class ScaleUpDashboardMetricsResponse(BaseModel):
    total_scale_plans: int = 0
    active_rollouts: int = 0
    completed_rollouts: int = 0
    total_sites_deployed: int = 0
    departments_reached: int = 0
    total_beneficiaries_reached: int = 0
    total_scale_budget: float = 0.0
    actual_spend: float = 0.0
    average_impact_score: float = 0.0
    status_distribution: Dict[str, int] = {}
    strategy_distribution: Dict[str, int] = {}

    model_config = ConfigDict(from_attributes=True)


class PortfolioImpactMetricsResponse(BaseModel):
    total_innovations_piloted: int = 0
    total_innovations_procured: int = 0
    total_innovations_scaled: int = 0
    total_sites_reached: int = 0
    total_departments_reached: int = 0
    total_beneficiaries: int = 0
    total_scale_investment: float = 0.0
    estimated_savings: float = 0.0
    verified_savings: float = 0.0
    average_impact_score: float = 0.0
    outcome_distribution: Dict[str, int] = {}

    model_config = ConfigDict(from_attributes=True)


class InnovationPortfolioItemResponse(BaseModel):
    challenge_id: str
    challenge_title: str
    application_id: Optional[str] = None
    startup_id: str
    startup_name: str
    solution_name: str
    department_id: str
    department_name: str
    evaluation_score: Optional[float] = None
    pilot_id: Optional[str] = None
    pilot_title: Optional[str] = None
    pilot_score: Optional[float] = None
    validation_id: Optional[str] = None
    validation_outcome: Optional[str] = None
    procurement_id: Optional[str] = None
    procurement_status: Optional[str] = None
    contract_id: Optional[str] = None
    contract_status: Optional[str] = None
    contract_value: Optional[float] = None
    scale_plan_id: Optional[str] = None
    scale_status: Optional[str] = None
    scale_sites_count: int = 0
    impact_score: Optional[float] = None
    impact_outcome: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
