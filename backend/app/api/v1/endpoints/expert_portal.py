from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user
from app.models.user import User
from app.models.evaluation_assignment import EvaluationAssignment, AssignmentStatus
from app.models.conflict_of_interest import ConflictOfInterest, ConflictDeclaration
from app.models.evaluation import Evaluation
from app.models.evaluation_score import EvaluationScore
from app.services.expert_evaluation_service import ExpertEvaluationService
from app.services.scoring_service import ScoringService
from app.schemas.expert_evaluation import (
    EvaluationAssignmentResponse,
    ConflictDeclarationRequest,
    ConflictDeclarationResponse,
    EvaluationDraftRequest,
    EvaluationSubmitRequest,
    EvaluationResponse,
)

router = APIRouter(prefix="/expert", tags=["Expert Evaluation Portal"])


@router.get(
    "/assignments",
    response_model=List[EvaluationAssignmentResponse],
    summary="List all evaluation assignments assigned to current expert",
)
def get_my_assignments(
    status: Optional[str] = Query(None, description="Filter by assignment status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.EXPERT, UserRole.EXPERT_EVALUATOR, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Expert access required.")

    assignments = ExpertEvaluationService.list_expert_assignments(
        db=db,
        expert_user=current_user,
        status_filter=status,
    )

    results = []
    for a in assignments:
        app = a.application
        coi = a.conflict
        ev = a.evaluation

        results.append({
            "id": a.id,
            "application_id": app.id,
            "application_code": app.application_code,
            "proposal_title": app.proposal_title,
            "challenge_id": app.challenge.id,
            "challenge_title": app.challenge.title,
            "expert_id": a.expert_id,
            "expert_name": a.expert.full_name if a.expert else "",
            "expert_email": a.expert.email if a.expert else "",
            "expert_organization": a.expert.organization_name if a.expert else None,
            "assigned_by": a.assigned_by,
            "assigned_by_name": a.assigner.full_name if a.assigner else "",
            "assignment_status": a.assignment_status,
            "assigned_at": a.assigned_at,
            "accepted_at": a.accepted_at,
            "completed_at": a.completed_at,
            "due_at": a.due_at,
            "notes": a.notes,
            "conflict_declaration": coi.declaration if coi else None,
            "conflict_reason": coi.reason if coi else None,
            "overall_score": float(ev.overall_score) if ev and ev.overall_score is not None else None,
            "recommendation": ev.recommendation.value if ev and hasattr(ev.recommendation, "value") else (ev.recommendation if ev else None),
        })

    return results


@router.get(
    "/assignments/{assignment_id}",
    summary="Get single assignment with full application dossier and evaluation criteria",
)
def get_assignment_detail(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = (
        db.query(EvaluationAssignment)
        .options(
            joinedload(EvaluationAssignment.application).joinedload(Application.challenge),
            joinedload(EvaluationAssignment.application).joinedload(Application.startup),
            joinedload(EvaluationAssignment.conflict),
            joinedload(EvaluationAssignment.evaluation).joinedload(Evaluation.scores),
        )
        .filter(EvaluationAssignment.id == assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.expert_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    app = assignment.application
    challenge = app.challenge
    startup = app.startup
    criteria = ExpertEvaluationService.get_challenge_criteria(db, challenge.id)

    # Format criteria
    criteria_data = [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "weight": float(c.weight),
            "max_score": float(c.max_score),
            "min_score": float(c.min_score),
            "mandatory": c.mandatory,
            "display_order": c.display_order,
        }
        for c in criteria
    ]

    # Format current evaluation draft / submission if present
    ev = assignment.evaluation
    eval_data = None
    if ev:
        crit_map = {c.id: c for c in criteria}
        scores_list = []
        for s in ev.scores:
            c = crit_map.get(s.criterion_id)
            if c:
                calc = ScoringService.calculate_criterion_scores(c, s.score)
                scores_list.append({
                    "id": s.id,
                    "criterion_id": s.criterion_id,
                    "criterion_name": c.name,
                    "criterion_description": c.description,
                    "weight": float(c.weight),
                    "max_score": float(c.max_score),
                    "score": float(s.score),
                    "normalized_score": calc["normalized_score"],
                    "weighted_score": calc["weighted_score"],
                    "comment": s.comment,
                    "evidence_reference": s.evidence_reference,
                })
        eval_data = {
            "id": ev.id,
            "overall_score": float(ev.overall_score) if ev.overall_score is not None else None,
            "recommendation": ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation,
            "overall_comments": ev.overall_comments,
            "is_submitted": ev.is_submitted,
            "submitted_at": ev.submitted_at,
            "scores": scores_list,
        }

    return {
        "assignment": {
            "id": assignment.id,
            "assignment_status": assignment.assignment_status,
            "assigned_at": assignment.assigned_at,
            "accepted_at": assignment.accepted_at,
            "completed_at": assignment.completed_at,
            "due_at": assignment.due_at,
            "notes": assignment.notes,
            "conflict_declaration": assignment.conflict.declaration if assignment.conflict else None,
            "conflict_reason": assignment.conflict.reason if assignment.conflict else None,
        },
        "challenge": {
            "id": challenge.id,
            "title": challenge.title,
            "challenge_code": challenge.challenge_code,
            "problem_statement": challenge.problem_statement,
            "desired_outcome": challenge.desired_outcome,
            "domain": challenge.domain,
            "criteria": criteria_data,
        },
        "startup": {
            "id": startup.id if startup else None,
            "startup_name": startup.startup_name if startup else "Confidential",
            "dpiit_number": startup.dpiit_recognition_number if startup else None,
            "product_stage": startup.product_stage if startup else None,
            "headquarters": startup.headquarters if startup else None,
        },
        "application": {
            "id": app.id,
            "application_code": app.application_code,
            "proposal_title": app.proposal_title,
            "executive_summary": app.executive_summary,
            "problem_understanding": app.problem_understanding,
            "proposed_solution": app.proposed_solution,
            "technical_approach": app.technical_approach,
            "expected_outcomes": app.expected_outcomes,
            "implementation_plan": app.implementation_plan,
            "pilot_plan": app.pilot_plan,
            "timeline_days": app.timeline_days,
            "requested_budget": float(app.requested_budget) if app.requested_budget else None,
            "risks": app.risks,
            "dependencies": app.dependencies,
            "data_requirements": app.data_requirements,
            "security_approach": app.security_approach,
            "ip_approach": app.ip_approach,
            "submitted_at": app.submitted_at,
        },
        "evaluation": eval_data,
    }


@router.post(
    "/assignments/{assignment_id}/accept",
    summary="Accept an evaluation assignment",
)
def accept_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.expert_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    assignment.assignment_status = AssignmentStatus.ACCEPTED.value
    assignment.accepted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Assignment accepted.", "status": assignment.assignment_status}


@router.post(
    "/assignments/{assignment_id}/decline",
    summary="Decline an evaluation assignment",
)
def decline_assignment(
    assignment_id: str,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.expert_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    reason = payload.get("reason") if payload else "Declined by expert"
    assignment.assignment_status = AssignmentStatus.DECLINED.value
    assignment.notes = f"{assignment.notes or ''} [Declined: {reason}]".strip()
    db.commit()
    return {"message": "Assignment declined.", "status": assignment.assignment_status}


@router.post(
    "/assignments/{assignment_id}/conflict",
    response_model=ConflictDeclarationResponse,
    summary="Declare conflict of interest (NO_CONFLICT or CONFLICT_DECLARED)",
)
@router.post(
    "/assignments/{assignment_id}/coi",
    response_model=ConflictDeclarationResponse,
    include_in_schema=False,
)
def declare_conflict(
    assignment_id: str,
    payload: ConflictDeclarationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coi = ExpertEvaluationService.declare_conflict(
        db=db,
        assignment_id=assignment_id,
        expert_user=current_user,
        declaration=payload.declaration,
        reason=payload.reason,
    )
    return coi


@router.get(
    "/assignments/{assignment_id}/evaluation",
    response_model=Optional[EvaluationResponse],
    summary="Get current expert evaluation for this assignment",
)
def get_my_evaluation(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(EvaluationAssignment).filter(EvaluationAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if assignment.expert_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    ev = db.query(Evaluation).filter(Evaluation.assignment_id == assignment_id).first()
    if not ev:
        return None

    criteria = ExpertEvaluationService.get_challenge_criteria(db, assignment.application.challenge_id)
    crit_map = {c.id: c for c in criteria}

    score_resps = []
    for sc in ev.scores:
        crit = crit_map.get(sc.criterion_id)
        if crit:
            calc = ScoringService.calculate_criterion_scores(crit, sc.score)
            score_resps.append({
                "id": sc.id,
                "criterion_id": sc.criterion_id,
                "criterion_name": crit.name,
                "criterion_description": crit.description,
                "weight": float(crit.weight),
                "max_score": float(crit.max_score),
                "score": float(sc.score),
                "normalized_score": calc["normalized_score"],
                "weighted_score": calc["weighted_score"],
                "comment": sc.comment,
                "evidence_reference": sc.evidence_reference,
            })

    return {
        "id": ev.id,
        "assignment_id": ev.assignment_id,
        "application_id": ev.application_id,
        "expert_id": ev.expert_id or current_user.id,
        "expert_name": current_user.full_name,
        "expert_organization": current_user.organization_name,
        "overall_score": float(ev.overall_score) if ev.overall_score is not None else None,
        "recommendation": ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation,
        "overall_comments": ev.overall_comments,
        "is_submitted": ev.is_submitted,
        "submitted_at": ev.submitted_at,
        "scores": score_resps,
    }


@router.post(
    "/assignments/{assignment_id}/evaluation/draft",
    response_model=EvaluationResponse,
    summary="Save partial evaluation scores as a draft",
)
@router.put(
    "/assignments/{assignment_id}/evaluation/draft",
    response_model=EvaluationResponse,
    summary="Update draft evaluation scores",
)
@router.post(
    "/assignments/{assignment_id}/draft",
    response_model=EvaluationResponse,
    include_in_schema=False,
)
@router.put(
    "/assignments/{assignment_id}/draft",
    response_model=EvaluationResponse,
    include_in_schema=False,
)
def save_evaluation_draft(
    assignment_id: str,
    payload: EvaluationDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = ExpertEvaluationService.save_evaluation_draft(
        db=db,
        assignment_id=assignment_id,
        expert_user=current_user,
        scores_data=[s.model_dump() for s in payload.scores],
        overall_comments=payload.overall_comments,
        recommendation=payload.recommendation,
    )

    criteria = ExpertEvaluationService.get_challenge_criteria(db, ev.application.challenge_id)
    crit_map = {c.id: c for c in criteria}

    score_resps = []
    for sc in ev.scores:
        crit = crit_map.get(sc.criterion_id)
        if crit:
            calc = ScoringService.calculate_criterion_scores(crit, sc.score)
            score_resps.append({
                "id": sc.id,
                "criterion_id": sc.criterion_id,
                "criterion_name": crit.name,
                "criterion_description": crit.description,
                "weight": float(crit.weight),
                "max_score": float(crit.max_score),
                "score": float(sc.score),
                "normalized_score": calc["normalized_score"],
                "weighted_score": calc["weighted_score"],
                "comment": sc.comment,
                "evidence_reference": sc.evidence_reference,
            })

    return {
        "id": ev.id,
        "assignment_id": ev.assignment_id,
        "application_id": ev.application_id,
        "expert_id": current_user.id,
        "expert_name": current_user.full_name,
        "expert_organization": current_user.organization_name,
        "overall_score": float(ev.overall_score) if ev.overall_score is not None else None,
        "recommendation": ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation,
        "overall_comments": ev.overall_comments,
        "is_submitted": ev.is_submitted,
        "submitted_at": ev.submitted_at,
        "scores": score_resps,
    }


@router.post(
    "/assignments/{assignment_id}/evaluation/submit",
    response_model=EvaluationResponse,
    summary="Submit and finalize expert evaluation (immutable once submitted)",
)
@router.post(
    "/assignments/{assignment_id}/submit",
    response_model=EvaluationResponse,
    include_in_schema=False,
)
def submit_evaluation(
    assignment_id: str,
    payload: EvaluationSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = ExpertEvaluationService.submit_evaluation(
        db=db,
        assignment_id=assignment_id,
        expert_user=current_user,
        scores_data=[s.model_dump() for s in payload.scores],
        recommendation=payload.recommendation,
        overall_comments=payload.overall_comments,
    )

    criteria = ExpertEvaluationService.get_challenge_criteria(db, ev.application.challenge_id)
    crit_map = {c.id: c for c in criteria}

    score_resps = []
    for sc in ev.scores:
        crit = crit_map.get(sc.criterion_id)
        if crit:
            calc = ScoringService.calculate_criterion_scores(crit, sc.score)
            score_resps.append({
                "id": sc.id,
                "criterion_id": sc.criterion_id,
                "criterion_name": crit.name,
                "criterion_description": crit.description,
                "weight": float(crit.weight),
                "max_score": float(crit.max_score),
                "score": float(sc.score),
                "normalized_score": calc["normalized_score"],
                "weighted_score": calc["weighted_score"],
                "comment": sc.comment,
                "evidence_reference": sc.evidence_reference,
            })

    return {
        "id": ev.id,
        "assignment_id": ev.assignment_id,
        "application_id": ev.application_id,
        "expert_id": current_user.id,
        "expert_name": current_user.full_name,
        "expert_organization": current_user.organization_name,
        "overall_score": float(ev.overall_score) if ev.overall_score is not None else None,
        "recommendation": ev.recommendation.value if hasattr(ev.recommendation, "value") else ev.recommendation,
        "overall_comments": ev.overall_comments,
        "is_submitted": ev.is_submitted,
        "submitted_at": ev.submitted_at,
        "scores": score_resps,
    }
