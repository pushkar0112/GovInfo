from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AIFactorScore(BaseModel):
    factor_key: str
    label: str
    score: Optional[float] = None
    max_score: float
    weight_percentage: float
    description: Optional[str] = None


class AIAssessmentResponse(BaseModel):
    id: str
    application_id: str
    challenge_id: str
    status: str = Field(..., description="PENDING, ANALYZING, COMPLETED, INSUFFICIENT_DATA, ERROR")
    overall_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="AI Match Score (0-100)")
    score_label: str = Field("AI-Assisted Match Score", description="Assistive prioritization score label")
    recommendation: Optional[str] = Field(None, description="STRONG_MATCH, MODERATE_MATCH, LOW_MATCH, INSUFFICIENT_DATA")
    recommendation_label: Optional[str] = Field(None, description="Human readable recommendation title")
    factors: List[AIFactorScore] = Field(default_factory=list)
    positive_reasons: List[str] = Field(default_factory=list, description="Why this application scored highly")
    risk_flags: List[str] = Field(default_factory=list, description="Potential concerns / risk flags")
    summary: Optional[str] = None
    model_version: str = "rule-based-nlp-v1.0"
    execution_mode: str = "DEMO_RULE_BASED"
    mode_label: str = "AI-Assisted Assessment — Demo/Rule-Based Mode"
    analyzed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
