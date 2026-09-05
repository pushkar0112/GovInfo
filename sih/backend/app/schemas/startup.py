from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator


class StartupProfileCreateRequest(BaseModel):
    startup_name: str = Field(..., min_length=2, max_length=255)
    legal_name: Optional[str] = None
    founded_year: Optional[int] = Field(None, ge=1990, le=2030)
    website: Optional[str] = None
    headquarters: Optional[str] = None
    team_size: Optional[str] = None  # e.g., "1-10", "11-50", "51-200", "201+"
    dpiit_recognition_number: Optional[str] = None
    recognition_status: Optional[str] = "PENDING"
    description: Optional[str] = None
    technology_domains: Optional[List[str]] = Field(default_factory=list)
    solution_categories: Optional[List[str]] = Field(default_factory=list)
    product_stage: Optional[str] = "MVP"
    operating_regions: Optional[List[str]] = Field(default_factory=list)
    previous_deployments: Optional[str] = None
    government_experience: Optional[str] = None
    certifications: Optional[str] = None
    cybersecurity_certifications: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class StartupProfileUpdateRequest(BaseModel):
    startup_name: Optional[str] = None
    legal_name: Optional[str] = None
    founded_year: Optional[int] = None
    website: Optional[str] = None
    headquarters: Optional[str] = None
    team_size: Optional[str] = None
    dpiit_recognition_number: Optional[str] = None
    recognition_status: Optional[str] = None
    description: Optional[str] = None
    technology_domains: Optional[List[str]] = None
    solution_categories: Optional[List[str]] = None
    product_stage: Optional[str] = None
    operating_regions: Optional[List[str]] = None
    previous_deployments: Optional[str] = None
    government_experience: Optional[str] = None
    certifications: Optional[str] = None
    cybersecurity_certifications: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


class StartupProfileResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    startup_name: Optional[str] = None
    company_name: Optional[str] = None  # Legacy support
    legal_name: Optional[str] = None
    founded_year: Optional[int] = None
    website: Optional[str] = None
    headquarters: Optional[str] = None
    team_size: Optional[str] = None
    dpiit_recognition_number: Optional[str] = None
    dpiit_number: Optional[str] = None  # Legacy support
    recognition_status: str
    dpiit_recognized: bool = False
    description: Optional[str] = None
    technology_domains: List[str] = Field(default_factory=list)
    solution_categories: List[str] = Field(default_factory=list)
    product_stage: str
    stage: Optional[str] = None  # Legacy support
    operating_regions: List[str] = Field(default_factory=list)
    previous_deployments: Optional[str] = None
    government_experience: Optional[str] = None
    certifications: Optional[str] = None
    cybersecurity_certifications: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Profile Completeness
    completeness_percentage: int = 0
    missing_fields: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class EligibilityCriterion(BaseModel):
    name: str
    status: str  # "PASSED", "FAILED", "WARNING"
    is_mandatory: bool
    required_value: str
    actual_value: str
    message: str


class EligibilityCheckResponse(BaseModel):
    is_eligible: bool
    overall_status: str  # "ELIGIBLE", "INELIGIBLE", "ACTION_REQUIRED"
    mandatory_criteria: List[EligibilityCriterion]
    preferred_criteria: List[EligibilityCriterion]
    summary_message: str
    summary: Optional[str] = None
    evaluated_at: datetime = Field(default_factory=datetime.now)
