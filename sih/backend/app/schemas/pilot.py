from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.evaluation import EvaluationRecommendation
from app.models.pilot import PilotStatus
from app.models.milestone import MilestoneStatus


class EvaluationCreateRequest(BaseModel):
    """
    Expert committee scoring for a startup application.
    """
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


class MilestoneCreateRequest(BaseModel):
    sequence_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=3)
    deliverable_description: str = Field(..., min_length=10)
    tranche_amount: float = Field(default=0.0, ge=0.0)
    due_date: date


class MilestoneResponse(BaseModel):
    id: str
    pilot_id: str
    sequence_number: int
    title: str
    deliverable_description: str
    tranche_amount: float
    status: MilestoneStatus
    due_date: date
    completion_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


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


class PilotCreateRequest(BaseModel):
    """
    Payload to initiate an operational sandbox pilot for an application.
    """
    application_id: str
    title: str = Field(..., min_length=5)
    scope_of_work: str = Field(..., min_length=20)
    duration_weeks: int = Field(default=12, ge=4, le=52)
    sandbox_location: str = Field(..., min_length=3)
    approved_budget: float = Field(..., gt=0.0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    milestones: List[MilestoneCreateRequest] = []
    kpis: List[KPICreateRequest] = []


class PilotResponse(BaseModel):
    id: str
    application_id: str
    title: str
    scope_of_work: str
    duration_weeks: int
    sandbox_location: str
    approved_budget: float
    status: PilotStatus
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    milestones: List[MilestoneResponse] = []
    kpis: List[KPIResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
