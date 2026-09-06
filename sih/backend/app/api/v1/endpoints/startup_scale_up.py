from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import require_startup
from app.models.scale_up import (
    ScaleUpPlan,
    ScaleTarget,
    ScaleDeploymentUpdate,
    ImpactMetric,
    ImpactMeasurement,
    ScaleLesson,
)
from app.schemas.scale_up import (
    ScaleUpPlanResponse,
    ScaleTargetResponse,
    ScaleDeploymentUpdateCreateRequest,
    ScaleDeploymentUpdateResponse,
    ImpactMeasurementCreateRequest,
    ImpactMeasurementResponse,
    ImpactEvidenceCreateRequest,
    ImpactEvidenceResponse,
    ScaleLessonCreateRequest,
    ScaleLessonResponse,
)
from app.services.scale_up_service import ScaleUpService

router = APIRouter()


@router.get(
    "/scale-plans",
    response_model=List[ScaleUpPlanResponse],
    summary="List scale-up plans awarded to authenticated startup",
)
def list_startup_scale_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.list_scale_plans(db, current_user)


@router.get(
    "/scale-plans/{plan_id}",
    response_model=ScaleUpPlanResponse,
    summary="Get startup scale-up workspace",
)
def get_startup_scale_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.get_scale_plan(db, current_user, plan_id)


@router.get(
    "/scale-plans/{plan_id}/targets",
    response_model=List[ScaleTargetResponse],
    summary="List rollout target sites for startup",
)
def list_startup_scale_targets(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    plan = ScaleUpService.get_scale_plan(db, current_user, plan_id)
    targets = db.query(ScaleTarget).filter(ScaleTarget.scale_up_plan_id == plan.id).order_by(ScaleTarget.created_at.asc()).all()
    return [ScaleTargetResponse.model_validate(t) for t in targets]


@router.post(
    "/scale-plans/{plan_id}/deployments",
    response_model=ScaleDeploymentUpdateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit site deployment progress update",
)
def submit_deployment_update(
    plan_id: str,
    payload: ScaleDeploymentUpdateCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.submit_deployment_update(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/deployments",
    response_model=List[ScaleDeploymentUpdateResponse],
    summary="List deployment updates submitted by startup",
)
def list_startup_deployments(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    targets = db.query(ScaleTarget).filter(ScaleTarget.scale_up_plan_id == plan_id).all()
    t_ids = [t.id for t in targets]
    updates = db.query(ScaleDeploymentUpdate).filter(ScaleDeploymentUpdate.scale_target_id.in_(t_ids)).order_by(ScaleDeploymentUpdate.submitted_at.desc()).all()
    return [ScaleDeploymentUpdateResponse.model_validate(u) for u in updates]


@router.post(
    "/impact-metrics/{metric_id}/measurements",
    response_model=ImpactMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit field impact telemetry data point",
)
def submit_impact_measurement(
    metric_id: str,
    payload: ImpactMeasurementCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.record_impact_measurement(db, current_user, metric_id, payload)


@router.post(
    "/impact-metrics/{metric_id}/evidence",
    response_model=ImpactEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload impact evidence document with SHA-256",
)
def upload_startup_evidence(
    metric_id: str,
    payload: ImpactEvidenceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.upload_impact_evidence(db, current_user, metric_id, payload)


@router.post(
    "/scale-plans/{plan_id}/lessons",
    response_model=ScaleLessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Contribute field lesson learned during rollout",
)
def submit_startup_lesson(
    plan_id: str,
    payload: ScaleLessonCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ScaleUpService.create_scale_lesson(db, current_user, plan_id, payload)
