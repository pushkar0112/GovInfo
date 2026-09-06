from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.models.challenge import ChallengeStatus
from app.models.application import ApplicationStatus


# ==============================================================================
# KPI Schemas
# ==============================================================================

class KPICreateRequest(BaseModel):
    """
    Measurable quantitative Key Performance Indicator schema.
    """
    name: str = Field(..., min_length=2, max_length=255, description="e.g. Water leakage reduction")
    description: Optional[str] = Field(None, description="Detailed explanation of what is measured")
    measurement_unit: str = Field(..., min_length=1, max_length=50, description="e.g. %, hours, metres, ₹")
    baseline_value: Optional[float] = Field(None, description="Current baseline before innovation")
    target_value: float = Field(..., description="Target threshold required for milestone signoff")
    measurement_method: Optional[str] = Field(None, description="Telemetry sensor, audit protocol, or lab test")
    weight: float = Field(default=1.0, description="Weighting factor or percentage relative to other KPIs")

    @model_validator(mode="before")
    @classmethod
    def harmonize_kpi_fields(cls, data):
        if isinstance(data, dict):
            if "name" not in data and "kpi_name" in data:
                data["name"] = data["kpi_name"]
            if "measurement_unit" not in data and "unit" in data:
                data["measurement_unit"] = data["unit"]
            if "measurement_method" not in data and "measurement_methodology" in data:
                data["measurement_method"] = data["measurement_methodology"]
            if "target_value" in data and isinstance(data["target_value"], str):
                try:
                    data["target_value"] = float(data["target_value"])
                except ValueError:
                    pass
            if "baseline_value" in data and isinstance(data["baseline_value"], str):
                try:
                    data["baseline_value"] = float(data["baseline_value"])
                except ValueError:
                    pass
        return data


class KPIUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    measurement_unit: Optional[str] = Field(None, min_length=1, max_length=50)
    baseline_value: Optional[float] = None
    target_value: Optional[float] = None
    measurement_method: Optional[str] = None
    weight: Optional[float] = None


class KPIResponse(BaseModel):
    id: str
    challenge_id: str
    name: str
    description: Optional[str] = None
    measurement_unit: str
    baseline_value: Optional[float] = None
    target_value: float
    measurement_method: Optional[str] = None
    weight: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Challenge Schemas
# ==============================================================================

class ChallengeCreateRequest(BaseModel):
    """
    Payload submitted by government nodal officers to create a new challenge.
    Supports both Step 3 comprehensive fields and Step 1 legacy parameters.
    """
    title: str = Field(..., min_length=5, max_length=255)
    problem_statement: str = Field(..., min_length=10)
    desired_outcome: Optional[str] = Field(None, min_length=10)
    outcome_definition: Optional[str] = Field(None, description="Legacy alias for desired_outcome")
    current_state: Optional[str] = None
    challenge_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None

    technology_preferences: Optional[str] = None
    technology_restrictions: Optional[str] = None

    domain: Optional[str] = Field(None, description="Sector or operational domain")
    target_sector: Optional[str] = Field(None, description="Legacy alias for domain")
    geographical_scope: Optional[str] = Field(default="National")

    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    budget_estimate: Optional[float] = Field(None, ge=0, description="Legacy alias for budget_max")
    currency: str = Field(default="INR")

    pilot_duration_days: Optional[int] = Field(default=90, ge=1)
    pilot_duration_months: Optional[float] = Field(None, description="Legacy alias in months")
    application_deadline: Optional[datetime] = None
    pilot_start_date: Optional[datetime] = None

    data_requirements: Optional[str] = None
    security_requirements: Optional[str] = None
    compliance_requirements: Optional[str] = None
    intellectual_property_requirements: Optional[str] = None
    eligibility_requirements: Optional[str] = None

    status: Optional[ChallengeStatus] = Field(default=None, description="Initial status; default DRAFT")
    department_id: Optional[str] = Field(default=None, description="Department ID if specified by admin")
    kpis: Optional[List[KPICreateRequest]] = Field(default=None, description="Initial KPIs to attach")

    @model_validator(mode="after")
    def harmonize_fields(self):
        # 1. Determine status if not explicitly provided
        if self.status is None:
            if self.outcome_definition and not self.desired_outcome:
                self.status = ChallengeStatus.PUBLISHED
            else:
                self.status = ChallengeStatus.DRAFT

        # 2. Outcome definition mapping
        if not self.desired_outcome and self.outcome_definition:
            self.desired_outcome = self.outcome_definition
        elif not self.desired_outcome and not self.outcome_definition:
            raise ValueError("Either desired_outcome or outcome_definition must be provided.")

        # 3. Domain / Sector mapping
        if not self.domain and self.target_sector:
            self.domain = self.target_sector
        elif not self.domain and not self.target_sector:
            self.domain = "CivicTech"

        # 4. Budget estimate mapping
        if self.budget_max is None and self.budget_estimate is not None:
            self.budget_max = self.budget_estimate
            if self.budget_min is None:
                self.budget_min = 0

        # 5. Budget min <= max validation
        if self.budget_min is not None and self.budget_max is not None:
            if self.budget_min > self.budget_max:
                raise ValueError(f"budget_min ({self.budget_min}) cannot exceed budget_max ({self.budget_max})")

        # 6. Pilot duration mapping
        if self.pilot_duration_days is None and self.pilot_duration_months is not None:
            self.pilot_duration_days = int(round(float(self.pilot_duration_months) * 30.0))

        return self


class ChallengeUpdateRequest(BaseModel):
    """
    Payload for updating an existing challenge (draft or non-core attributes).
    """
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    problem_statement: Optional[str] = Field(None, min_length=10)
    desired_outcome: Optional[str] = Field(None, min_length=10)
    current_state: Optional[str] = None
    challenge_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None

    technology_preferences: Optional[str] = None
    technology_restrictions: Optional[str] = None

    domain: Optional[str] = None
    geographical_scope: Optional[str] = None

    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None

    pilot_duration_days: Optional[int] = Field(None, ge=1)
    application_deadline: Optional[datetime] = None
    pilot_start_date: Optional[datetime] = None

    data_requirements: Optional[str] = None
    security_requirements: Optional[str] = None
    compliance_requirements: Optional[str] = None
    intellectual_property_requirements: Optional[str] = None
    eligibility_requirements: Optional[str] = None

    @model_validator(mode="after")
    def check_budget_order(self):
        if self.budget_min is not None and self.budget_max is not None:
            if self.budget_min > self.budget_max:
                raise ValueError("budget_min cannot exceed budget_max")
        return self


class ChallengePublishValidationResponse(BaseModel):
    """
    Validation response indicating whether a challenge meets all mandatory publish criteria.
    """
    can_publish: bool
    ready_to_publish: bool = True
    missing_requirements: List[str]

    @model_validator(mode="before")
    @classmethod
    def harmonize_flags(cls, data):
        if isinstance(data, dict):
            cp = data.get("can_publish", data.get("ready_to_publish", False))
            data["can_publish"] = cp
            data["ready_to_publish"] = cp
        return data


class ChallengeResponse(BaseModel):
    """
    Complete representation of a challenge returned across government and public views.
    """
    id: str
    challenge_code: str
    title: str
    problem_statement: str
    current_state: Optional[str] = None
    desired_outcome: str
    outcome_definition: str  # Backward compatibility
    challenge_description: Optional[str] = None
    target_beneficiaries: Optional[str] = None

    technology_preferences: Optional[str] = None
    technology_restrictions: Optional[str] = None

    domain: str
    target_sector: str  # Backward compatibility
    geographical_scope: Optional[str] = None

    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_estimate: Optional[float] = None  # Backward compatibility
    currency: str
    pilot_duration_days: int
    pilot_duration_months: float  # Backward compatibility

    application_deadline: Optional[datetime] = None
    pilot_start_date: Optional[datetime] = None

    data_requirements: Optional[str] = None
    security_requirements: Optional[str] = None
    compliance_requirements: Optional[str] = None
    intellectual_property_requirements: Optional[str] = None
    eligibility_requirements: Optional[str] = None

    status: ChallengeStatus
    department_id: str
    department_name: Optional[str] = None
    ministry: Optional[str] = None

    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    applications_count: int = 0
    kpis: List[KPIResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChallengeListResponse(BaseModel):
    """
    Paginated challenge list container.
    """
    total: int
    page: int
    page_size: int
    challenges: List[ChallengeResponse]


# Backward-compatible alias
ChallengePaginatedResponse = ChallengeListResponse


# ==============================================================================
# Legacy Application Schemas (Maintained for Stage Compatibility)
# ==============================================================================

class ApplicationCreateRequest(BaseModel):
    proposal_summary: str = Field(..., min_length=20)
    technical_approach: str = Field(..., min_length=30)
    proposed_solution_trl: str = Field(default="TRL 7")
    pitch_deck_url: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    challenge_id: str
    challenge_title: Optional[str] = None
    startup_id: str
    company_name: Optional[str] = None
    proposal_summary: str
    technical_approach: str
    proposed_solution_trl: str
    pitch_deck_url: Optional[str] = None
    status: ApplicationStatus
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
