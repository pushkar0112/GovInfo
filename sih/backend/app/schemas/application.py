from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator


class DocumentMetadata(BaseModel):
    document_id: str
    original_filename: str
    file_size: int
    mime_type: str
    file_url: str
    uploaded_at: Optional[datetime] = None


class ApplicationDraftSaveRequest(BaseModel):
    challenge_id: str
    proposal_title: Optional[str] = None
    executive_summary: Optional[str] = None
    problem_understanding: Optional[str] = None
    proposed_solution: Optional[str] = None
    technical_approach: Optional[str] = None
    expected_outcomes: Optional[str] = None
    implementation_plan: Optional[str] = None
    pilot_plan: Optional[str] = None
    timeline_days: Optional[int] = None
    risks: Optional[str] = None
    dependencies: Optional[str] = None
    team_capabilities: Optional[str] = None
    previous_deployments: Optional[str] = None
    estimated_cost: Optional[float] = None
    requested_budget: Optional[float] = None
    data_requirements: Optional[str] = None
    security_approach: Optional[str] = None
    ip_approach: Optional[str] = None
    supporting_documents: Optional[List[DocumentMetadata]] = Field(default_factory=list)


class ApplicationSubmitRequest(BaseModel):
    challenge_id: str
    proposal_title: str = Field(..., min_length=5, max_length=255)
    executive_summary: str = Field(..., min_length=20)
    problem_understanding: str = Field(..., min_length=20)
    proposed_solution: str = Field(..., min_length=20)
    technical_approach: str = Field(..., min_length=20)
    expected_outcomes: str = Field(..., min_length=20)
    implementation_plan: str = Field(..., min_length=20)
    pilot_plan: str = Field(..., min_length=20)
    timeline_days: int = Field(..., gt=0)
    requested_budget: float = Field(..., gt=0)
    estimated_cost: Optional[float] = None
    risks: Optional[str] = None
    dependencies: Optional[str] = None
    team_capabilities: Optional[str] = None
    previous_deployments: Optional[str] = None
    data_requirements: Optional[str] = None
    security_approach: Optional[str] = None
    ip_approach: Optional[str] = None
    supporting_documents: Optional[List[DocumentMetadata]] = Field(default_factory=list)


class ApplicationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Allowed transitions: UNDER_REVIEW, SHORTLISTED, REJECTED")
    review_notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    application_code: Optional[str] = None
    challenge_id: str
    challenge_title: Optional[str] = None
    challenge_code: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    startup_id: str
    startup_name: Optional[str] = None
    company_name: Optional[str] = None  # Legacy support
    status: str
    proposal_title: Optional[str] = None
    executive_summary: Optional[str] = None
    proposal_summary: Optional[str] = None  # Legacy support
    problem_understanding: Optional[str] = None
    proposed_solution: Optional[str] = None
    technical_approach: Optional[str] = None
    expected_outcomes: Optional[str] = None
    implementation_plan: Optional[str] = None
    pilot_plan: Optional[str] = None
    timeline_days: Optional[int] = None
    risks: Optional[str] = None
    dependencies: Optional[str] = None
    team_capabilities: Optional[str] = None
    previous_deployments: Optional[str] = None
    estimated_cost: Optional[float] = None
    requested_budget: Optional[float] = None
    data_requirements: Optional[str] = None
    security_approach: Optional[str] = None
    ip_approach: Optional[str] = None
    supporting_documents: List[DocumentMetadata] = Field(default_factory=list)
    eligibility_snapshot: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[ApplicationResponse]
