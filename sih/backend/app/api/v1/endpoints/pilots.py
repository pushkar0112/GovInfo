from typing import List, Optional
from fastapi import APIRouter, Depends, status, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.schemas.pilot import (
    EvaluationCreateRequest,
    EvaluationResponse,
    PilotCreateRequest,
    PilotResponse,
    MilestoneResponse,
    KPIResponse,
)
from app.services.pilot_service import PilotService

router = APIRouter()


@router.post(
    "/applications/{app_id}/evaluate",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Evaluate startup challenge proposal",
    description="Allows Expert Committee members or Department Officials to record multi-criteria evaluation scores.",
)
def evaluate_application(
    app_id: str,
    payload: EvaluationCreateRequest,
    current_user: User = Depends(
        require_role(UserRole.EXPERT_EVALUATOR, UserRole.GOVERNMENT, UserRole.ADMIN)
    ),
    db: Session = Depends(get_db),
) -> EvaluationResponse:
    return PilotService.evaluate_application(db, current_user, app_id, payload)


@router.post(
    "",
    response_model=PilotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create controlled operational sandbox pilot",
    description="Allows Government Nodal Officers to initiate a funded pilot for a shortlisted startup proposal.",
)
def create_pilot(
    payload: PilotCreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotService.create_pilot(db, current_user, payload)


@router.get(
    "",
    response_model=List[PilotResponse],
    summary="List all sandbox pilots",
    description="Returns public/authenticated inventory of active and completed pilots across departments.",
)
def list_pilots(
    db: Session = Depends(get_db),
) -> List[PilotResponse]:
    return PilotService.list_pilots(db)


@router.get(
    "/{pilot_id}",
    response_model=PilotResponse,
    summary="Get detailed pilot sandbox telemetry",
    description="Returns milestone tranches, quantitative KPI measurements, and operational location.",
)
def get_pilot(
    pilot_id: str,
    db: Session = Depends(get_db),
) -> PilotResponse:
    return PilotService.get_pilot_by_id(db, pilot_id)


@router.post(
    "/{pilot_id}/milestones/{milestone_id}/submit",
    response_model=MilestoneResponse,
    summary="Submit milestone deliverable proof",
    description="Allows Startup to report completion of a milestone deliverable.",
)
def submit_milestone(
    pilot_id: str,
    milestone_id: str,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotService.submit_milestone_deliverable(db, current_user, pilot_id, milestone_id)


@router.post(
    "/{pilot_id}/milestones/{milestone_id}/approve",
    response_model=MilestoneResponse,
    summary="Authorize milestone tranche disbursement",
    description="Allows Government Officials to approve milestone deliverables and authorize public grant disbursements.",
)
def approve_milestone_tranche(
    pilot_id: str,
    milestone_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    return PilotService.approve_milestone_tranche(db, current_user, pilot_id, milestone_id)


@router.post(
    "/{pilot_id}/kpis/{kpi_id}/update",
    response_model=KPIResponse,
    summary="Update quantitative KPI achievement",
    description="Records telemetry or field verification data against target KPIs.",
)
def update_kpi(
    pilot_id: str,
    kpi_id: str,
    achieved_value: float = Body(..., embed=True),
    verification_source: Optional[str] = Body(None, embed=True),
    current_user: User = Depends(
        require_role(UserRole.STARTUP, UserRole.EXPERT_EVALUATOR, UserRole.GOVERNMENT, UserRole.ADMIN)
    ),
    db: Session = Depends(get_db),
) -> KPIResponse:
    return PilotService.update_kpi_telemetry(
        db, current_user, pilot_id, kpi_id, achieved_value, verification_source
    )
