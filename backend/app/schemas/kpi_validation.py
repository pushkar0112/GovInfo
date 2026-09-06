from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.pilot_kpi import (
    KPICategory,
    KPIMeasurementType,
    KPIDirection,
    TargetOperator,
    KPIStatus,
    MeasurementStatus,
    EvidenceType,
    EvidenceStatus,
)
from app.models.validation_workflow import (
    ValidatorAvailability,
    AssignmentStatus,
    ValidatorCOIDeclaration,
    ValidationAssessment,
    ValidationConfidence,
    KPIValidationResult,
    PilotValidationStatus,
)
from app.models.pilot import PilotSuccessStatus


# -------------------------------------------------------------
# 1. PILOT KPI SCHEMAS
# -------------------------------------------------------------
class PilotKPICreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    category: KPICategory = Field(default=KPICategory.IMPACT)
    measurement_type: KPIMeasurementType = Field(default=KPIMeasurementType.NUMBER)
    unit: str = Field(..., min_length=1, max_length=50)
    baseline_value: Optional[float] = None
    baseline_date: Optional[date] = None
    baseline_source: Optional[str] = None
    baseline_notes: Optional[str] = None
    target_value: float = Field(...)
    target_date: Optional[date] = None
    target_operator: TargetOperator = Field(default=TargetOperator.GREATER_THAN_OR_EQUAL)
    direction: KPIDirection = Field(default=KPIDirection.HIGHER_IS_BETTER)
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    verification_method: Optional[str] = None
    data_source: Optional[str] = None
    target_description: Optional[str] = None


class PilotKPIUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    category: Optional[KPICategory] = None
    measurement_type: Optional[KPIMeasurementType] = None
    unit: Optional[str] = None
    baseline_value: Optional[float] = None
    baseline_date: Optional[date] = None
    baseline_source: Optional[str] = None
    baseline_notes: Optional[str] = None
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    target_operator: Optional[TargetOperator] = None
    direction: Optional[KPIDirection] = None
    weight: Optional[float] = Field(default=None, ge=0.1, le=10.0)
    status: Optional[KPIStatus] = None
    verification_method: Optional[str] = None
    data_source: Optional[str] = None
    target_description: Optional[str] = None


class KPIEvidenceResponse(BaseModel):
    id: str
    kpi_id: str
    measurement_id: Optional[str] = None
    pilot_id: str
    title: str
    description: Optional[str] = None
    evidence_type: str
    file_name: str
    storage_key: str
    mime_type: str
    file_size: int
    version: int = 1
    source: Optional[str] = None
    status: str
    submitted_by: Optional[str] = None
    submitter_name: Optional[str] = None
    submitted_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KPIMeasurementResponse(BaseModel):
    id: str
    kpi_id: str
    pilot_id: str
    measured_value: float
    measurement_date: date
    reporting_period_start: Optional[date] = None
    reporting_period_end: Optional[date] = None
    measured_by: Optional[str] = None
    measurer_name: Optional[str] = None
    measurement_method: Optional[str] = None
    data_sources_used: Optional[str] = None
    sample_size: Optional[int] = None
    calculation_notes: Optional[str] = None
    status: str
    created_at: datetime
    evidences: List[KPIEvidenceResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PilotKPIResponse(BaseModel):
    id: str
    pilot_id: str
    name: str
    description: Optional[str] = None
    category: str
    measurement_type: str
    unit: str
    baseline_value: Optional[float] = None
    baseline_date: Optional[date] = None
    baseline_source: Optional[str] = None
    baseline_notes: Optional[str] = None
    target_value: float
    target_date: Optional[date] = None
    target_operator: str
    direction: str
    weight: float
    status: str
    verification_method: Optional[str] = None
    data_source: Optional[str] = None
    target_description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Computed fields
    latest_measured_value: Optional[float] = None
    latest_measurement_date: Optional[date] = None
    achievement_percentage: Optional[float] = None
    is_target_met: Optional[bool] = None
    measurements_count: int = 0
    evidences_count: int = 0
    measurements: List[KPIMeasurementResponse] = []
    evidences: List[KPIEvidenceResponse] = []

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# 2. MEASUREMENT & EVIDENCE SCHEMAS
# -------------------------------------------------------------
class KPIMeasurementCreateRequest(BaseModel):
    measured_value: float = Field(...)
    measurement_date: date = Field(...)
    reporting_period_start: Optional[date] = None
    reporting_period_end: Optional[date] = None
    measurement_method: Optional[str] = None
    data_sources_used: Optional[str] = None
    sample_size: Optional[int] = None
    calculation_notes: Optional[str] = None


class KPIEvidenceCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    evidence_type: EvidenceType = Field(default=EvidenceType.DATASET)
    measurement_id: Optional[str] = None
    source: Optional[str] = None


# -------------------------------------------------------------
# 3. VALIDATOR PROFILE SCHEMAS
# -------------------------------------------------------------
class ValidatorProfileCreateRequest(BaseModel):
    organization: str = Field(..., min_length=2, max_length=255)
    domain_expertise: Optional[str] = None
    qualifications: Optional[str] = None
    accreditations: Optional[str] = None
    years_of_experience: int = Field(default=0, ge=0)
    contact_phone: Optional[str] = None


class ValidatorProfileUpdateRequest(BaseModel):
    organization: Optional[str] = None
    domain_expertise: Optional[str] = None
    qualifications: Optional[str] = None
    accreditations: Optional[str] = None
    years_of_experience: Optional[int] = Field(default=None, ge=0)
    availability: Optional[ValidatorAvailability] = None
    contact_phone: Optional[str] = None


class ValidatorProfileResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    organization: str
    domain_expertise: Optional[str] = None
    qualifications: Optional[str] = None
    accreditations: Optional[str] = None
    years_of_experience: int = 0
    validation_count: int = 0
    rating: Optional[float] = None
    availability: str
    contact_phone: Optional[str] = None
    is_verified: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# 4. VALIDATION ASSIGNMENT & COI SCHEMAS
# -------------------------------------------------------------
class ValidationAssignmentCreateRequest(BaseModel):
    pilot_id: str = Field(...)
    validator_id: str = Field(...)
    scope: Optional[str] = None
    terms_of_reference: Optional[str] = None
    deadline: Optional[date] = None


class ValidationAssignmentRespondRequest(BaseModel):
    action: str = Field(..., description="ACCEPT or DECLINE")
    decline_reason: Optional[str] = None


class COIDeclarationRequest(BaseModel):
    declaration: ValidatorCOIDeclaration = Field(...)
    has_financial_interest: bool = False
    has_past_employment: bool = False
    has_personal_relationship: bool = False
    has_competitive_interest: bool = False
    declaration_details: Optional[str] = None
    mitigation_notes: Optional[str] = None


class COIDeclarationResponse(BaseModel):
    id: str
    assignment_id: str
    validator_id: str
    pilot_id: str
    declaration: str
    has_financial_interest: bool
    has_past_employment: bool
    has_personal_relationship: bool
    has_competitive_interest: bool
    declaration_details: Optional[str] = None
    mitigation_notes: Optional[str] = None
    is_cleared: bool
    cleared_by: Optional[str] = None
    cleared_at: Optional[datetime] = None
    declared_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ValidationAssignmentResponse(BaseModel):
    id: str
    pilot_id: str
    pilot_title: Optional[str] = None
    pilot_code: Optional[str] = None
    startup_name: Optional[str] = None
    validator_id: str
    validator_name: Optional[str] = None
    validator_org: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_at: datetime
    scope: Optional[str] = None
    terms_of_reference: Optional[str] = None
    status: str
    coi_declared: bool
    coi_status: str
    coi_declaration_date: Optional[datetime] = None
    coi_details: Optional[str] = None
    response_date: Optional[datetime] = None
    decline_reason: Optional[str] = None
    deadline: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# 5. VALIDATION REPORT & KPI VALIDATION SCHEMAS
# -------------------------------------------------------------
class KPIValidationInput(BaseModel):
    kpi_id: str
    validator_measured_value: Optional[float] = None
    result: KPIValidationResult = Field(default=KPIValidationResult.NOT_VALIDATED)
    achievement_percentage: Optional[float] = None
    evidence_sufficiency: str = "SUFFICIENT"
    confidence_score: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    methodology_notes: Optional[str] = None
    validator_commentary: Optional[str] = None
    divergence_analysis: Optional[str] = None


class ValidationReportDraftRequest(BaseModel):
    executive_summary: Optional[str] = None
    methodology: Optional[str] = None
    overall_assessment: ValidationAssessment = Field(default=ValidationAssessment.INCONCLUSIVE)
    overall_achievement_percentage: Optional[float] = None
    confidence_level: ValidationConfidence = Field(default=ValidationConfidence.MEDIUM)
    findings: Optional[str] = None
    unintended_effects: Optional[str] = None
    recommendations: Optional[str] = None
    readiness_assessment: Optional[str] = None
    risks_and_limitations: Optional[str] = None
    kpi_validations: List[KPIValidationInput] = []


class ValidationReportSubmitRequest(BaseModel):
    executive_summary: str = Field(..., min_length=20)
    methodology: str = Field(..., min_length=10)
    overall_assessment: ValidationAssessment = Field(...)
    overall_achievement_percentage: Optional[float] = None
    confidence_level: ValidationConfidence = Field(default=ValidationConfidence.MEDIUM)
    findings: str = Field(..., min_length=20)
    unintended_effects: Optional[str] = None
    recommendations: str = Field(..., min_length=20)
    readiness_assessment: Optional[str] = None
    risks_and_limitations: Optional[str] = None
    kpi_validations: List[KPIValidationInput] = []


class ValidationReportReopenRequest(BaseModel):
    reopen_reason: str = Field(..., min_length=10)


class KPIValidationResponse(BaseModel):
    id: str
    report_id: str
    kpi_id: str
    kpi_name: Optional[str] = None
    kpi_category: Optional[str] = None
    kpi_unit: Optional[str] = None
    kpi_target_value: Optional[float] = None
    kpi_baseline_value: Optional[float] = None
    startup_measured_value: Optional[float] = None
    validator_measured_value: Optional[float] = None
    result: str
    achievement_percentage: Optional[float] = None
    evidence_sufficiency: Optional[str] = "SUFFICIENT"
    confidence_score: Optional[float] = None
    methodology_notes: Optional[str] = None
    validator_commentary: Optional[str] = None
    divergence_analysis: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ValidationReportResponse(BaseModel):
    id: str
    pilot_id: str
    pilot_title: Optional[str] = None
    pilot_code: Optional[str] = None
    validator_id: str
    validator_name: Optional[str] = None
    validator_org: Optional[str] = None
    assignment_id: str
    executive_summary: Optional[str] = None
    methodology: Optional[str] = None
    overall_assessment: str
    overall_achievement_percentage: Optional[float] = None
    kpis_achieved_count: int = 0
    kpis_total_count: int = 0
    confidence_level: str
    findings: Optional[str] = None
    unintended_effects: Optional[str] = None
    recommendations: Optional[str] = None
    readiness_assessment: Optional[str] = None
    risks_and_limitations: Optional[str] = None
    status: str
    submitted_at: Optional[datetime] = None
    reopened_at: Optional[datetime] = None
    reopen_reason: Optional[str] = None
    kpi_validations: List[KPIValidationResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# 6. GOVERNMENT CONFIRMATION & DASHBOARD SCHEMAS
# -------------------------------------------------------------
class PilotSuccessConfirmationRequest(BaseModel):
    success_status: PilotSuccessStatus = Field(...)
    classification_notes: Optional[str] = None
    classification_divergence_reason: Optional[str] = None


class PilotValidationSummaryResponse(BaseModel):
    pilot_id: str
    pilot_code: Optional[str] = None
    title: str
    status: str
    validation_status: str
    success_status: str
    validator_assessment: Optional[str] = None
    classification_confirmed_by: Optional[str] = None
    classification_confirmed_at: Optional[datetime] = None
    classification_notes: Optional[str] = None
    classification_divergence_reason: Optional[str] = None
    total_kpis: int = 0
    achieved_kpis: int = 0
    average_achievement_percentage: float = 0.0
    active_assignment: Optional[ValidationAssignmentResponse] = None
    latest_report: Optional[ValidationReportResponse] = None

    model_config = ConfigDict(from_attributes=True)
