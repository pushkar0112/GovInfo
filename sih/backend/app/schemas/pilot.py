from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.models.evaluation import EvaluationRecommendation
from app.models.pilot import PilotStatus, PilotApprovalStatus, PilotSuccessStatus
from app.models.milestone import MilestoneStatus, MilestoneAcceptanceStatus
from app.models.pilot_deliverable import DeliverableStatus


# Legacy evaluation schema preservation
class EvaluationCreateRequest(BaseModel):
    technical_score: float = Field(..., ge=0.0, le=100.0, description="Technical feasibility score (0-100)")
    operational_score: float = Field(..., ge=0.0, le=100.0, description="Operational fit score (0-100)")
    commercial_score: float = Field(..., ge=0.0, le=100.0, description="Cost & commercial viability score (0-100)")
    evaluator_feedback: str = Field(..., min_length=10)
    recommendation: EvaluationRecommendation = Field(default=EvaluationRecommendation.RECOMMEND)


class EvaluationResponse(BaseModel):
    id: str
    application_id: str
    evaluator_id: str
    technical_score: float
    operational_score: float
    commercial_score: float
    composite_score: float
    evaluator_feedback: str
    recommendation: EvaluationRecommendation
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Deliverables schemas
class DeliverableCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None


class DeliverableReviewRequest(BaseModel):
    action: str = Field(..., description="ACCEPT or REJECT")
    review_comments: Optional[str] = Field(default=None, min_length=3)


class DeliverableResponse(BaseModel):
    id: str
    milestone_id: str
    pilot_id: str
    title: str
    description: Optional[str] = None
    file_name: str
    storage_key: str
    mime_type: str
    file_size: int
    submission_version: int = 1
    status: str
    submitted_at: datetime
    submitted_by: Optional[str] = None
    submitter_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewer_name: Optional[str] = None
    review_comments: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Milestone schemas
class MilestoneCreateRequest(BaseModel):
    sequence_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=3, max_length=255)
    objective: Optional[str] = None
    description: Optional[str] = None
    deliverable_description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    due_date: Optional[date] = None
    weight: float = Field(default=0.0, ge=0.0, le=100.0, description="Weight percentage (0-100%)")
    tranche_amount: float = Field(default=0.0, ge=0.0)

    @model_validator(mode="before")
    @classmethod
    def reconcile_legacy_milestone_fields(cls, data):
        if isinstance(data, dict):
            if not data.get("description") and data.get("deliverable_description"):
                data["description"] = data.get("deliverable_description")
            if not data.get("deliverable_description") and data.get("description"):
                data["deliverable_description"] = data.get("description")
            if not data.get("planned_end_date") and data.get("due_date"):
                data["planned_end_date"] = data.get("due_date")
            if not data.get("due_date") and data.get("planned_end_date"):
                data["due_date"] = data.get("planned_end_date")
        return data


class MilestoneUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    objective: Optional[str] = None
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    weight: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    completion_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    status: Optional[str] = None
    block_reason: Optional[str] = None


class MilestoneStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Milestone status (NOT_STARTED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, BLOCKED, COMPLETED)")
    completion_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    block_reason: Optional[str] = None


class MilestoneReviewRequest(BaseModel):
    action: str = Field(..., description="ACCEPT or REJECT")
    reason: Optional[str] = Field(default=None, description="Reason for rejection or review remarks")


class MilestoneResponse(BaseModel):
    id: str
    pilot_id: str
    milestone_code: Optional[str] = None
    sequence_number: int
    title: str
    objective: Optional[str] = None
    description: Optional[str] = None
    deliverable_description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    weight: float = 0.0
    completion_percentage: float = 0.0
    status: str
    acceptance_status: str
    block_reason: Optional[str] = None
    rejection_reason: Optional[str] = None
    tranche_amount: float = 0.0
    due_date: Optional[date] = None
    completion_date: Optional[date] = None
    is_overdue: bool = False
    deliverables: List[DeliverableResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# KPI schemas (Preserved for backward-compatibility)
class KPICreateRequest(BaseModel):
    metric_name: str = Field(..., min_length=3)
    baseline_value: Optional[float] = None
    target_value: float
    unit: str = Field(..., min_length=1)


class KPIResponse(BaseModel):
    id: str
    pilot_id: str
    metric_name: str
    baseline_value: Optional[float] = None
    target_value: float
    achieved_value: Optional[float] = None
    unit: str
    is_verified: bool
    verification_source: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Pilot schemas
class PilotCreateRequest(BaseModel):
    application_id: str
    pilot_title: Optional[str] = None
    title: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    scope_of_work: Optional[str] = None
    problem_statement: Optional[str] = None
    proposed_solution: Optional[str] = None
    expected_outcomes: Optional[str] = None
    pilot_location: Optional[str] = None
    sandbox_location: Optional[str] = None
    operating_regions: Optional[str] = None
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = 90
    duration_weeks: Optional[int] = 12
    pilot_budget: Optional[float] = None
    approved_budget: Optional[float] = None
    currency: str = "INR"
    government_owner_id: Optional[str] = None
    startup_owner_id: Optional[str] = None
    milestones: List[MilestoneCreateRequest] = []
    kpis: List[KPICreateRequest] = []

    @model_validator(mode="before")
    @classmethod
    def reconcile_pilot_create_fields(cls, data):
        if isinstance(data, dict):
            # Title reconciliation
            if not data.get("pilot_title") and data.get("title"):
                data["pilot_title"] = data.get("title")
            elif not data.get("title") and data.get("pilot_title"):
                data["title"] = data.get("pilot_title")

            # Scope reconciliation
            if not data.get("scope") and data.get("scope_of_work"):
                data["scope"] = data.get("scope_of_work")
            elif not data.get("scope_of_work") and data.get("scope"):
                data["scope_of_work"] = data.get("scope")

            # Location reconciliation
            if not data.get("pilot_location") and data.get("sandbox_location"):
                data["pilot_location"] = data.get("sandbox_location")
            elif not data.get("sandbox_location") and data.get("pilot_location"):
                data["sandbox_location"] = data.get("pilot_location")

            # Budget reconciliation
            if data.get("pilot_budget") is None and data.get("approved_budget") is not None:
                data["pilot_budget"] = data.get("approved_budget")
            elif data.get("approved_budget") is None and data.get("pilot_budget") is not None:
                data["approved_budget"] = data.get("pilot_budget")

            # End date & duration
            if not data.get("planned_end_date") and data.get("end_date"):
                data["planned_end_date"] = data.get("end_date")
            elif not data.get("end_date") and data.get("planned_end_date"):
                data["end_date"] = data.get("planned_end_date")

            if data.get("duration_days") is None and data.get("duration_weeks") is not None:
                data["duration_days"] = int(data.get("duration_weeks")) * 7
            elif data.get("duration_weeks") is None and data.get("duration_days") is not None:
                data["duration_weeks"] = max(1, int(data.get("duration_days")) // 7)

        return data


class PilotUpdateRequest(BaseModel):
    pilot_title: Optional[str] = Field(default=None, min_length=5, max_length=255)
    objective: Optional[str] = None
    scope: Optional[str] = None
    problem_statement: Optional[str] = None
    proposed_solution: Optional[str] = None
    expected_outcomes: Optional[str] = None
    pilot_location: Optional[str] = None
    operating_regions: Optional[str] = None
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    duration_days: Optional[int] = Field(default=None, ge=14, le=730)
    pilot_budget: Optional[float] = Field(default=None, ge=0.0)
    currency: Optional[str] = None
    government_owner_id: Optional[str] = None
    startup_owner_id: Optional[str] = None


class PilotLifecycleActionRequest(BaseModel):
    action: str = Field(..., description="Action: PROPOSE, APPROVE, REJECT, START, PAUSE, RESUME, COMPLETE, CANCEL")
    reason: Optional[str] = Field(default=None, description="Reason for rejection or cancellation")


class PilotStatsResponse(BaseModel):
    total_pilots: int = 0
    active_pilots: int = 0
    planning_pilots: int = 0
    completed_pilots: int = 0
    paused_pilots: int = 0
    cancelled_pilots: int = 0
    total_budget_committed: float = 0.0
    average_progress: float = 0.0
    overdue_milestones_count: int = 0


class PilotResponse(BaseModel):
    id: str
    pilot_code: Optional[str] = None
    application_id: str
    challenge_id: Optional[str] = None
    startup_id: Optional[str] = None
    government_department_id: Optional[str] = None

    # Specifications
    pilot_title: Optional[str] = None
    title: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    scope_of_work: Optional[str] = None
    problem_statement: Optional[str] = None
    proposed_solution: Optional[str] = None
    expected_outcomes: Optional[str] = None

    # Location & Sandbox
    pilot_location: Optional[str] = None
    sandbox_location: Optional[str] = None
    operating_regions: Optional[str] = None

    # Timeline & Duration
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    duration_days: int = 90
    duration_weeks: Optional[int] = 12

    # Financials
    pilot_budget: Optional[float] = None
    approved_budget: Optional[float] = None
    currency: str = "INR"

    # Statuses
    status: str = "PLANNING"
    approval_status: str = "PENDING"
    success_status: str = "NOT_ASSESSED"
    validation_status: str = "NOT_STARTED"
    validator_assessment: Optional[str] = None
    classification_confirmed_by: Optional[str] = None
    classification_confirmed_at: Optional[datetime] = None
    classification_notes: Optional[str] = None
    classification_divergence_reason: Optional[str] = None

    # Owners
    government_owner_id: Optional[str] = None
    government_owner_name: Optional[str] = None
    startup_owner_id: Optional[str] = None
    startup_owner_name: Optional[str] = None
    created_by: Optional[str] = None

    # Decisions
    rejection_reason: Optional[str] = None
    cancellation_reason: Optional[str] = None

    # Calculated metrics
    pilot_progress: float = 0.0
    total_milestones_count: int = 0
    completed_milestones_count: int = 0
    overdue_milestones_count: int = 0

    # Populated metadata
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    challenge_title: Optional[str] = None

    # Nested relations
    milestones: List[MilestoneResponse] = []
    deliverables: List[DeliverableResponse] = []
    kpis: List[KPIResponse] = []

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
