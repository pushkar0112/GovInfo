from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator


# ==============================================================================
# Evaluation Criteria Schemas
# ==============================================================================

class EvaluationCriterionBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    weight: float = Field(..., gt=0.0, le=100.0, description="Percentage weight contribution")
    max_score: float = Field(10.0, gt=0.0, description="Maximum attainable score")
    min_score: float = Field(0.0, ge=0.0, description="Minimum possible score")
    mandatory: bool = Field(True, description="Whether scoring this criterion is required")
    display_order: int = Field(0, ge=0)

    @model_validator(mode="before")
    @classmethod
    def harmonize(cls, data: Any):
        if isinstance(data, dict):
            # Accept 'title' as alias for 'name'
            if "title" in data and "name" not in data:
                data["name"] = data["title"]
            # Accept 'is_mandatory' as alias for 'mandatory'
            if "is_mandatory" in data and "mandatory" not in data:
                data["mandatory"] = data["is_mandatory"]
        return data


class EvaluationCriterionCreate(EvaluationCriterionBase):
    pass


class EvaluationCriterionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    weight: Optional[float] = Field(None, gt=0.0, le=100.0)
    max_score: Optional[float] = Field(None, gt=0.0)
    min_score: Optional[float] = Field(None, ge=0.0)
    mandatory: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)

    @model_validator(mode="before")
    @classmethod
    def harmonize(cls, data: Any):
        if isinstance(data, dict):
            if "title" in data and "name" not in data:
                data["name"] = data["title"]
            if "is_mandatory" in data and "mandatory" not in data:
                data["mandatory"] = data["is_mandatory"]
        return data


class EvaluationCriterionResponse(BaseModel):
    id: str
    challenge_id: str
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    weight: float
    max_score: float
    min_score: float
    mandatory: bool
    is_mandatory: Optional[bool] = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_aliases(self):
        if not self.title:
            self.title = self.name
        if self.is_mandatory is None:
            self.is_mandatory = self.mandatory
        return self


class EvaluationCriteriaListResponse(BaseModel):
    items: List[EvaluationCriterionResponse]
    total_weight: float
    is_valid: bool  # True if abs(total_weight - 100.0) < 0.01


# ==============================================================================
# Expert Profile Schemas
# ==============================================================================

class ExpertProfileBase(BaseModel):
    organization: Optional[str] = None
    designation: Optional[str] = None
    expertise_domains: List[str] = Field(default_factory=list)
    years_of_experience: int = Field(0, ge=0)
    professional_summary: Optional[str] = None
    certifications: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability_status: str = Field("AVAILABLE", description="AVAILABLE, BUSY, or INACTIVE")


class ExpertProfileCreate(ExpertProfileBase):
    pass


class ExpertProfileUpdate(BaseModel):
    organization: Optional[str] = None
    designation: Optional[str] = None
    expertise_domains: Optional[List[str]] = None
    years_of_experience: Optional[int] = Field(None, ge=0)
    professional_summary: Optional[str] = None
    certifications: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability_status: Optional[str] = None


class ExpertProfileResponse(ExpertProfileBase):
    id: str
    user_id: str
    full_name: str
    email: str
    active_assignments_count: int = 0
    completed_assignments_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Conflict of Interest Schemas
# ==============================================================================

class ConflictDeclarationRequest(BaseModel):
    declaration: str = Field(..., description="NO_CONFLICT or CONFLICT_DECLARED")
    reason: Optional[str] = Field(None, description="Explanation required if conflict declared")

    @field_validator("declaration")
    @classmethod
    def validate_declaration(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ("NO_CONFLICT", "CONFLICT_DECLARED"):
            raise ValueError("Declaration must be either 'NO_CONFLICT' or 'CONFLICT_DECLARED'")
        return v_upper


class ConflictDeclarationResponse(BaseModel):
    id: str
    assignment_id: str
    expert_id: str
    declaration: str
    reason: Optional[str] = None
    declared_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Evaluation Assignment Schemas
# ==============================================================================

class EvaluationAssignmentCreate(BaseModel):
    expert_id: str
    due_at: Optional[datetime] = None
    notes: Optional[str] = None


class EvaluationAssignmentReassign(BaseModel):
    new_expert_id: str
    reason: Optional[str] = None
    due_at: Optional[datetime] = None


class EvaluationAssignmentResponse(BaseModel):
    id: str
    application_id: str
    application_code: str
    proposal_title: str
    challenge_id: str
    challenge_title: str
    expert_id: str
    expert_name: str
    expert_email: str
    expert_organization: Optional[str] = None
    assigned_by: str
    assigned_by_name: str
    assignment_status: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    notes: Optional[str] = None
    conflict_declaration: Optional[str] = None
    conflict_reason: Optional[str] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Scoring & Evaluation Submission Schemas
# ==============================================================================

class CriterionScoreInput(BaseModel):
    criterion_id: str
    score: float = Field(..., ge=0.0)
    comment: Optional[str] = None
    evidence_reference: Optional[str] = None


class CriterionScoreResponse(BaseModel):
    id: Optional[str] = None
    criterion_id: str
    criterion_name: str
    criterion_description: Optional[str] = None
    weight: float
    max_score: float
    score: float
    normalized_score: float
    weighted_score: float
    comment: Optional[str] = None
    evidence_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EvaluationDraftRequest(BaseModel):
    scores: List[CriterionScoreInput] = Field(default_factory=list)
    overall_comments: Optional[str] = None
    feedback: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    recommendation: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def harmonize_draft(cls, data: Any):
        if isinstance(data, dict):
            if "feedback" in data and not data.get("overall_comments"):
                data["overall_comments"] = data["feedback"]
            rec = data.get("recommendation")
            if rec:
                r_up = rec.upper().replace("-", "_")
                rec_map = {
                    "HIGHLY_RECOMMENDED": "STRONGLY_RECOMMEND",
                    "STRONGLY_RECOMMENDED": "STRONGLY_RECOMMEND",
                    "RECOMMENDED": "RECOMMEND",
                    "NOT_RECOMMENDED": "DO_NOT_RECOMMEND",
                }
                data["recommendation"] = rec_map.get(r_up, r_up)
        return data


class EvaluationSubmitRequest(BaseModel):
    scores: List[CriterionScoreInput]
    overall_comments: Optional[str] = None
    feedback: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    recommendation: str = Field(..., description="STRONGLY_RECOMMEND, RECOMMEND, NEUTRAL, DO_NOT_RECOMMEND")

    @model_validator(mode="before")
    @classmethod
    def harmonize_submit(cls, data: Any):
        if isinstance(data, dict):
            if "feedback" in data and not data.get("overall_comments"):
                data["overall_comments"] = data["feedback"]
            rec = data.get("recommendation")
            if rec:
                r_up = rec.upper().replace("-", "_")
                rec_map = {
                    "HIGHLY_RECOMMENDED": "STRONGLY_RECOMMEND",
                    "STRONGLY_RECOMMENDED": "STRONGLY_RECOMMEND",
                    "RECOMMENDED": "RECOMMEND",
                    "NOT_RECOMMENDED": "DO_NOT_RECOMMEND",
                }
                data["recommendation"] = rec_map.get(r_up, r_up)
        return data


class EvaluationResponse(BaseModel):
    id: str
    assignment_id: Optional[str] = None
    application_id: str
    expert_id: str
    expert_name: str
    expert_organization: Optional[str] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    overall_comments: Optional[str] = None
    is_submitted: bool
    is_draft: Optional[bool] = None
    submitted_at: Optional[datetime] = None
    scores: List[CriterionScoreResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_draft(self):
        if self.is_draft is None:
            self.is_draft = not self.is_submitted
        return self


class EvaluationSummaryResponse(BaseModel):
    application_id: str
    average_score: Optional[float] = None
    highest_score: Optional[float] = None
    lowest_score: Optional[float] = None
    completed_evaluations_count: int = 0
    assigned_evaluations_count: int = 0
    recommendations_summary: Dict[str, int] = Field(default_factory=dict)
    criteria_breakdown: List[Dict[str, Any]] = Field(default_factory=list)
    evaluations: List[EvaluationResponse] = Field(default_factory=list)


# ==============================================================================
# Challenge Ranking Schemas
# ==============================================================================

class ChallengeRankingItem(BaseModel):
    rank: int
    application_id: str
    application_code: str
    startup_id: str
    startup_name: str
    dpiit_number: Optional[str] = None
    proposal_title: str
    status: str
    submitted_at: Optional[datetime] = None
    average_score: Optional[float] = None
    highest_score: Optional[float] = None
    lowest_score: Optional[float] = None
    evaluations_completed: int = 0
    evaluations_count: int = 0
    evaluations_assigned: int = 0

    @model_validator(mode="after")
    def sync_counts(self):
        if not self.evaluations_count:
            self.evaluations_count = self.evaluations_completed
        if not self.evaluations_completed:
            self.evaluations_completed = self.evaluations_count
        return self


class ChallengeRankingResponse(BaseModel):
    challenge_id: str
    challenge_title: str
    challenge_code: str
    total_applications: int
    ranking: List[ChallengeRankingItem]
