from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_government,
    require_role,
    require_authenticated_user,
)
from app.schemas.scale_up import (
    ScaleUpDecisionCreateRequest,
    ScaleUpDecisionUpdateRequest,
    ScaleUpDecisionResponse,
    ScaleUpPlanCreateRequest,
    ScaleUpPlanUpdateRequest,
    ScaleUpPlanResponse,
    ScaleTargetCreateRequest,
    ScaleTargetUpdateRequest,
    ScaleTargetResponse,
    ScalePhaseCreateRequest,
    ScalePhaseUpdateRequest,
    ScalePhaseResponse,
    ScaleMilestoneCreateRequest,
    ScaleMilestoneResponse,
    ScaleReadinessCheckCreateRequest,
    ScaleReadinessCheckUpdateRequest,
    ScaleReadinessCheckResponse,
    ScaleUpApprovalCreateRequest,
    ScaleUpApprovalResponse,
    ReplicationCreateRequest,
    ReplicationUpdateRequest,
    ReplicationResponse,
    ScaleDeploymentUpdateCreateRequest,
    ScaleDeploymentUpdateReviewRequest,
    ScaleDeploymentUpdateResponse,
    ImpactMetricCreateRequest,
    ImpactMetricUpdateRequest,
    ImpactMetricResponse,
    ImpactMeasurementCreateRequest,
    ImpactMeasurementResponse,
    ImpactEvidenceCreateRequest,
    ImpactEvidenceResponse,
    ScaleOutcomeConfirmRequest,
    ScaleOutcomeResponse,
    ScaleBeneficiaryMetricCreateRequest,
    ScaleBeneficiaryMetricResponse,
    ScaleRiskCreateRequest,
    ScaleRiskUpdateRequest,
    ScaleRiskResponse,
    ScaleLessonCreateRequest,
    ScaleLessonResponse,
    ScaleUpDashboardMetricsResponse,
)
from app.models.scale_up import (
    ScaleUpDecision,
    ScaleUpPlan,
    ScaleTarget,
    ScalePhase,
    ScaleReadinessCheck,
    Replication,
    ScaleDeploymentUpdate,
    ImpactMetric,
    ImpactMeasurement,
    ScaleRisk,
    ScaleLesson,
)
from app.services.scale_up_service import ScaleUpService
from app.services.scale_calculation_service import ScaleCalculationService

router = APIRouter()

require_gov_or_admin = require_role(
    UserRole.GOVERNMENT,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ADMIN,
)


# ==============================================================================
# Scale-Up Decisions
# ==============================================================================

@router.post(
    "/pilots/{pilot_id}/scale-decision",
    response_model=ScaleUpDecisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record post-validation scale-up decision for pilot",
)
def create_scale_decision(
    pilot_id: str,
    payload: ScaleUpDecisionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    """
    Step 9 Gate: Records an official scale-up decision for a validated and procured pilot.
    Strictly verifies pilot completion, independent validation, and success classification.
    """
    return ScaleUpService.create_scale_decision(db, current_user, pilot_id, payload)


@router.get(
    "/pilots/{pilot_id}/scale-decision",
    response_model=Optional[ScaleUpDecisionResponse],
    summary="Get scale-up decision for pilot",
)
def get_pilot_scale_decision(
    pilot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ScaleUpService.get_pilot_scale_decision(db, current_user, pilot_id)


@router.get(
    "/scale-decisions",
    response_model=List[ScaleUpDecisionResponse],
    summary="List scale-up decisions",
)
def list_scale_decisions(
    decision_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    query = db.query(ScaleUpDecision)
    user_role = str(current_user.role).upper()
    if "ADMIN" not in user_role and current_user.department_id:
        query = query.filter(ScaleUpDecision.originating_department_id == current_user.department_id)
    if decision_type:
        query = query.filter(ScaleUpDecision.decision_type == decision_type)
    if status:
        query = query.filter(ScaleUpDecision.decision_status == status)

    decisions = query.order_by(ScaleUpDecision.created_at.desc()).all()
    return [ScaleUpService._format_decision_response(d) for d in decisions]


@router.get(
    "/scale-decisions/{decision_id}",
    response_model=ScaleUpDecisionResponse,
    summary="Get scale-up decision details",
)
def get_scale_decision(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ScaleUpService.get_scale_decision(db, current_user, decision_id)


@router.post(
    "/scale-decisions/{decision_id}/submit",
    response_model=ScaleUpDecisionResponse,
    summary="Submit scale-up decision for departmental authorization",
)
def submit_scale_decision(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.submit_scale_decision(db, current_user, decision_id)


@router.post(
    "/scale-decisions/{decision_id}/approve",
    response_model=ScaleUpDecisionResponse,
    summary="Approve scale-up decision",
)
def approve_scale_decision(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.approve_scale_decision(db, current_user, decision_id)


@router.post(
    "/scale-decisions/{decision_id}/reject",
    response_model=ScaleUpDecisionResponse,
    summary="Reject scale-up decision",
)
def reject_scale_decision(
    decision_id: str,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.reject_scale_decision(db, current_user, decision_id, reason=reason)


# ==============================================================================
# Scale-Up Plans
# ==============================================================================

@router.post(
    "/scale-plans",
    response_model=ScaleUpPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multi-site scale-up plan",
)
def create_scale_plan(
    payload: ScaleUpPlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    """
    Creates a comprehensive scale-up plan linked to an approved scale decision.
    Automatically seeds default mandatory readiness checklist items.
    """
    return ScaleUpService.create_scale_plan(db, current_user, payload)


@router.get(
    "/scale-plans",
    response_model=List[ScaleUpPlanResponse],
    summary="List scale-up plans",
)
def list_scale_plans(
    status: Optional[str] = Query(None),
    strategy: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    plans = ScaleUpService.list_scale_plans(db, current_user)
    if status:
        plans = [p for p in plans if p.status == status]
    if strategy:
        plans = [p for p in plans if p.deployment_strategy == strategy]
    return plans


@router.get(
    "/scale-plans/{plan_id}",
    response_model=ScaleUpPlanResponse,
    summary="Get scale-up plan workspace",
)
def get_scale_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ScaleUpService.get_scale_plan(db, current_user, plan_id)


@router.post(
    "/scale-plans/{plan_id}/approve",
    response_model=ScaleUpPlanResponse,
    summary="Approve scale-up plan",
)
def approve_scale_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.approve_scale_plan(db, current_user, plan_id)


@router.post(
    "/scale-plans/{plan_id}/activate",
    response_model=ScaleUpPlanResponse,
    summary="Activate scale plan (enforces mandatory readiness checks)",
)
def activate_scale_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    """
    Activates the scale plan and transitions it to ACTIVE rollout state.
    Strictly verifies all required readiness checks are COMPLETED or NOT_APPLICABLE.
    """
    return ScaleUpService.activate_scale_plan(db, current_user, plan_id)


@router.get(
    "/scale-plans/{plan_id}/traceability",
    summary="Get 13-stage end-to-end auditable traceability chain",
)
def get_scale_plan_traceability(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ScaleUpService.build_extended_traceability(db, plan_id)


# ==============================================================================
# Targets & Multi-Site Deployment
# ==============================================================================

@router.post(
    "/scale-plans/{plan_id}/targets",
    response_model=ScaleTargetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add target site/district to scale plan",
)
def create_scale_target(
    plan_id: str,
    payload: ScaleTargetCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.create_scale_target(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/targets",
    response_model=List[ScaleTargetResponse],
    summary="List targets for scale plan",
)
def list_scale_targets(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    targets = db.query(ScaleTarget).filter(ScaleTarget.scale_up_plan_id == plan_id).order_by(ScaleTarget.created_at.asc()).all()
    return [ScaleTargetResponse.model_validate(t) for t in targets]


@router.post(
    "/scale-plans/{plan_id}/targets/{target_id}/start",
    response_model=ScaleTargetResponse,
    summary="Start deployment at target site",
)
def start_scale_target(
    plan_id: str,
    target_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.start_scale_target(db, current_user, plan_id, target_id)


@router.post(
    "/scale-plans/{plan_id}/targets/{target_id}/complete",
    response_model=ScaleTargetResponse,
    summary="Complete deployment at target site",
)
def complete_scale_target(
    plan_id: str,
    target_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.complete_scale_target(db, current_user, plan_id, target_id)


# ==============================================================================
# Rollout Phases
# ==============================================================================

@router.post(
    "/scale-plans/{plan_id}/phases",
    response_model=ScalePhaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add rollout phase to scale plan",
)
def create_scale_phase(
    plan_id: str,
    payload: ScalePhaseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.create_scale_phase(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/phases",
    response_model=List[ScalePhaseResponse],
    summary="List rollout phases for scale plan",
)
def list_scale_phases(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    phases = db.query(ScalePhase).filter(ScalePhase.scale_up_plan_id == plan_id).order_by(ScalePhase.phase_number.asc()).all()
    return [ScalePhaseResponse.model_validate(p) for p in phases]


@router.post(
    "/scale-plans/{plan_id}/phases/{phase_id}/start",
    response_model=ScalePhaseResponse,
    summary="Activate rollout phase",
)
def start_scale_phase(
    plan_id: str,
    phase_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.start_scale_phase(db, current_user, plan_id, phase_id)


@router.post(
    "/scale-plans/{plan_id}/phases/{phase_id}/complete",
    response_model=ScalePhaseResponse,
    summary="Complete rollout phase",
)
def complete_scale_phase(
    plan_id: str,
    phase_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.complete_scale_phase(db, current_user, plan_id, phase_id)


# ==============================================================================
# Readiness Checklist
# ==============================================================================

@router.get(
    "/scale-plans/{plan_id}/readiness-checks",
    response_model=List[ScaleReadinessCheckResponse],
    summary="List readiness checks for scale plan",
)
def list_readiness_checks(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    checks = db.query(ScaleReadinessCheck).filter(ScaleReadinessCheck.scale_up_plan_id == plan_id).all()
    return [ScaleReadinessCheckResponse.model_validate(c) for c in checks]


@router.put(
    "/scale-plans/{plan_id}/readiness-checks/{check_id}",
    response_model=ScaleReadinessCheckResponse,
    summary="Update and sign off on a readiness check",
)
def update_readiness_check(
    plan_id: str,
    check_id: str,
    payload: ScaleReadinessCheckUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.update_readiness_check(db, current_user, plan_id, check_id, payload)


# ==============================================================================
# Replications (Cross-Department / Cross-State)
# ==============================================================================

@router.post(
    "/scale-plans/{plan_id}/replications",
    response_model=ReplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register cross-department / cross-site replication",
)
def create_replication(
    plan_id: str,
    payload: ReplicationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.create_replication(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/replications",
    response_model=List[ReplicationResponse],
    summary="List replications for scale plan",
)
def list_replications(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    reps = db.query(Replication).filter(Replication.scale_up_plan_id == plan_id).all()
    return [ReplicationResponse.model_validate(r) for r in reps]


@router.get(
    "/replications",
    response_model=List[ReplicationResponse],
    summary="List all cross-department replications",
)
def list_all_replications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    reps = db.query(Replication).order_by(Replication.created_at.desc()).all()
    return [ReplicationResponse.model_validate(r) for r in reps]


# ==============================================================================
# Deployment Reviews
# ==============================================================================

@router.get(
    "/scale-plans/{plan_id}/deployments",
    response_model=List[ScaleDeploymentUpdateResponse],
    summary="List site deployment updates for scale plan",
)
def list_deployment_updates(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    targets = db.query(ScaleTarget).filter(ScaleTarget.scale_up_plan_id == plan_id).all()
    t_ids = [t.id for t in targets]
    updates = db.query(ScaleDeploymentUpdate).filter(ScaleDeploymentUpdate.scale_target_id.in_(t_ids)).order_by(ScaleDeploymentUpdate.submitted_at.desc()).all()
    return [ScaleDeploymentUpdateResponse.model_validate(u) for u in updates]


@router.post(
    "/deployments/{update_id}/review",
    response_model=ScaleDeploymentUpdateResponse,
    summary="Government review of site deployment update",
)
def review_deployment_update(
    update_id: str,
    payload: ScaleDeploymentUpdateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.review_deployment_update(db, current_user, update_id, payload)


# ==============================================================================
# Impact Metrics & Measurements
# ==============================================================================

@router.post(
    "/scale-plans/{plan_id}/impact-metrics",
    response_model=ImpactMetricResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Define measurable impact metric for scale plan",
)
def create_impact_metric(
    plan_id: str,
    payload: ImpactMetricCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.create_impact_metric(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/impact-metrics",
    response_model=List[ImpactMetricResponse],
    summary="List impact metrics for scale plan",
)
def list_impact_metrics(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    metrics = db.query(ImpactMetric).filter(ImpactMetric.scale_up_plan_id == plan_id).all()
    return [ScaleUpService._format_metric_response(m) for m in metrics]


@router.post(
    "/impact-metrics/{metric_id}/measurements",
    response_model=ImpactMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record verified impact measurement",
)
def record_impact_measurement(
    metric_id: str,
    payload: ImpactMeasurementCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.record_impact_measurement(db, current_user, metric_id, payload)


@router.get(
    "/impact-metrics/{metric_id}/measurements",
    response_model=List[ImpactMeasurementResponse],
    summary="List historical measurements for metric",
)
def list_impact_measurements(
    metric_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    ms = db.query(ImpactMeasurement).filter(ImpactMeasurement.impact_metric_id == metric_id).order_by(ImpactMeasurement.measurement_date.desc()).all()
    return [ImpactMeasurementResponse.model_validate(m) for m in ms]


@router.post(
    "/impact-metrics/{metric_id}/evidence",
    response_model=ImpactEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload impact evidence document with SHA-256 checksum",
)
def upload_impact_evidence(
    metric_id: str,
    payload: ImpactEvidenceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.upload_impact_evidence(db, current_user, metric_id, payload)


# ==============================================================================
# Outcome Evaluation & Confirmation
# ==============================================================================

@router.get(
    "/scale-plans/{plan_id}/evaluate-outcome",
    summary="Preview algorithmic impact score and outcome recommendation",
)
def evaluate_scale_outcome(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    plan = db.query(ScaleUpPlan).filter(ScaleUpPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scale plan not found.")
    ScaleUpService._verify_government_access(db, current_user, plan.decision.originating_department_id)
    return ScaleCalculationService.calculate_overall_impact_score(plan.impact_metrics)


@router.post(
    "/scale-plans/{plan_id}/confirm-outcome",
    response_model=ScaleOutcomeResponse,
    summary="Confirm final scale-up outcome with divergence justification check",
)
def confirm_scale_outcome(
    plan_id: str,
    payload: ScaleOutcomeConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.confirm_scale_outcome(db, current_user, plan_id, payload)


# ==============================================================================
# Risks & Lessons
# ==============================================================================

@router.post(
    "/scale-plans/{plan_id}/risks",
    response_model=ScaleRiskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add risk to scale plan",
)
def create_scale_risk(
    plan_id: str,
    payload: ScaleRiskCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.create_scale_risk(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/risks",
    response_model=List[ScaleRiskResponse],
    summary="List risks for scale plan",
)
def list_scale_risks(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    risks = db.query(ScaleRisk).filter(ScaleRisk.scale_up_plan_id == plan_id).order_by(ScaleRisk.created_at.desc()).all()
    return [ScaleRiskResponse.model_validate(r) for r in risks]


@router.post(
    "/scale-plans/{plan_id}/lessons",
    response_model=ScaleLessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record lesson learned from scale-up",
)
def create_scale_lesson(
    plan_id: str,
    payload: ScaleLessonCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ScaleUpService.create_scale_lesson(db, current_user, plan_id, payload)


@router.get(
    "/scale-plans/{plan_id}/lessons",
    response_model=List[ScaleLessonResponse],
    summary="List lessons learned from scale-up",
)
def list_scale_lessons(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    lessons = db.query(ScaleLesson).filter(ScaleLesson.scale_up_plan_id == plan_id).order_by(ScaleLesson.created_at.desc()).all()
    return [ScaleLessonResponse.model_validate(l) for l in lessons]


# ==============================================================================
# Dashboard Stats
# ==============================================================================

@router.get(
    "/scale-up/dashboard-stats",
    response_model=ScaleUpDashboardMetricsResponse,
    summary="Executive scale-up operations dashboard statistics",
)
def get_scale_up_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_admin),
):
    return ScaleUpService.get_scale_up_dashboard_metrics(db, current_user)
