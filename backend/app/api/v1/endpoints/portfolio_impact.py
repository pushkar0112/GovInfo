from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import require_authenticated_user, require_government
from app.schemas.scale_up import (
    PortfolioImpactMetricsResponse,
    InnovationPortfolioItemResponse,
)
from app.services.scale_up_service import ScaleUpService

router = APIRouter()


@router.get(
    "/impact",
    response_model=PortfolioImpactMetricsResponse,
    summary="Get cross-department macro innovation impact metrics",
)
def get_portfolio_impact(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """
    Returns aggregated public innovation impact telemetry:
    Total pilots, total scaled, total beneficiaries reached, cost savings, and average impact score.
    """
    return ScaleUpService.get_portfolio_impact_metrics(db, current_user)


@router.get(
    "/innovation-portfolio",
    response_model=List[InnovationPortfolioItemResponse],
    summary="Get executive full-funnel innovation portfolio",
)
def get_innovation_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    """
    Returns the comprehensive end-to-end innovation pipeline:
    Challenge -> Application -> Expert Evaluation -> Pilot -> Validation -> Procurement -> Scale-Up -> Impact.
    """
    return ScaleUpService.get_innovation_portfolio(db, current_user)
