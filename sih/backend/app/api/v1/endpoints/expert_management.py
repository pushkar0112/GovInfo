import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user
from app.models.user import User
from app.services.expert_evaluation_service import ExpertEvaluationService
from app.schemas.expert_evaluation import (
    ExpertProfileCreate,
    ExpertProfileUpdate,
    ExpertProfileResponse,
    EvaluationAssignmentCreate,
    EvaluationAssignmentReassign,
    EvaluationAssignmentResponse,
    EvaluationSummaryResponse,
    ChallengeRankingResponse,
)

router = APIRouter(tags=["Expert Management & Government Scoring"])


# ==============================================================================
# Expert Profile (Expert-facing & Admin)
# ==============================================================================

@router.get(
    "/experts/profile",
    response_model=ExpertProfileResponse,
    summary="Get current expert profile details",
)
def get_expert_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.EXPERT, UserRole.EXPERT_EVALUATOR, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts can access expert profile.")

    profile = ExpertEvaluationService.get_or_create_expert_profile(db, current_user.id)
    domains_list = []
    if profile.expertise_domains:
        try:
            parsed = json.loads(profile.expertise_domains)
            domains_list = parsed if isinstance(parsed, list) else [str(parsed)]
        except Exception:
            domains_list = [d.strip() for d in profile.expertise_domains.split(",") if d.strip()]

    return {
        "id": profile.id,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "organization": profile.organization or current_user.organization_name,
        "designation": profile.designation or current_user.designation,
        "expertise_domains": domains_list,
        "years_of_experience": profile.years_of_experience,
        "professional_summary": profile.professional_summary,
        "certifications": profile.certifications,
        "linkedin_url": profile.linkedin_url,
        "availability_status": profile.availability_status,
        "active_assignments_count": 0,
        "completed_assignments_count": 0,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.post(
    "/experts/profile",
    response_model=ExpertProfileResponse,
    summary="Create or initialize expert profile",
)
@router.put(
    "/experts/profile",
    response_model=ExpertProfileResponse,
    summary="Update current expert profile details",
)
def update_expert_profile(
    payload: ExpertProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.EXPERT, UserRole.EXPERT_EVALUATOR, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only experts can manage expert profile.")

    profile = ExpertEvaluationService.update_expert_profile(
        db=db,
        user=current_user,
        data=payload.model_dump(exclude_unset=True),
    )

    domains_list = []
    if profile.expertise_domains:
        try:
            parsed = json.loads(profile.expertise_domains)
            domains_list = parsed if isinstance(parsed, list) else [str(parsed)]
        except Exception:
            domains_list = [d.strip() for d in profile.expertise_domains.split(",") if d.strip()]

    return {
        "id": profile.id,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "organization": profile.organization or current_user.organization_name,
        "designation": profile.designation or current_user.designation,
        "expertise_domains": domains_list,
        "years_of_experience": profile.years_of_experience,
        "professional_summary": profile.professional_summary,
        "certifications": profile.certifications,
        "linkedin_url": profile.linkedin_url,
        "availability_status": profile.availability_status,
        "active_assignments_count": 0,
        "completed_assignments_count": 0,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


# ==============================================================================
# Government Expert Directory & Assignment
# ==============================================================================

@router.get(
    "/government/experts",
    response_model=List[ExpertProfileResponse],
    summary="Government directory of available experts with filters",
)
def list_government_experts(
    search: Optional[str] = Query(None, description="Search by name, organization or email"),
    domain: Optional[str] = Query(None, description="Filter by technology domain"),
    availability: Optional[str] = Query(None, description="Filter by status: AVAILABLE, BUSY, INACTIVE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.GOVERNMENT, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted to Government and Admin.")

    experts = ExpertEvaluationService.list_experts(
        db=db,
        search=search,
        domain=domain,
        availability=availability,
    )
    return experts


@router.get(
    "/government/experts/{expert_id}",
    response_model=ExpertProfileResponse,
    summary="View specific expert profile",
)
def get_expert_by_id(
    expert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.GOVERNMENT, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted.")

    expert = db.query(User).filter(User.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found.")

    profile = ExpertEvaluationService.get_or_create_expert_profile(db, expert_id)
    domains_list = []
    if profile.expertise_domains:
        try:
            parsed = json.loads(profile.expertise_domains)
            domains_list = parsed if isinstance(parsed, list) else [str(parsed)]
        except Exception:
            domains_list = [d.strip() for d in profile.expertise_domains.split(",") if d.strip()]

    return {
        "id": profile.id,
        "user_id": expert.id,
        "full_name": expert.full_name,
        "email": expert.email,
        "organization": profile.organization or expert.organization_name,
        "designation": profile.designation or expert.designation,
        "expertise_domains": domains_list,
        "years_of_experience": profile.years_of_experience,
        "professional_summary": profile.professional_summary,
        "certifications": profile.certifications,
        "linkedin_url": profile.linkedin_url,
        "availability_status": profile.availability_status,
        "active_assignments_count": 0,
        "completed_assignments_count": 0,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.post(
    "/government/applications/{application_id}/assign-expert",
    response_model=EvaluationAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign an expert to review an application",
)
@router.post(
    "/challenges/{challenge_id}/applications/{application_id}/assign-expert",
    response_model=EvaluationAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def assign_expert_to_application(
    application_id: str,
    payload: EvaluationAssignmentCreate,
    challenge_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = ExpertEvaluationService.assign_expert(
        db=db,
        application_id=application_id,
        expert_id=payload.expert_id,
        assigned_by=current_user,
        due_at=payload.due_at,
        notes=payload.notes,
    )

    app = assignment.application
    expert = assignment.expert
    prof = expert.expert_profile

    return {
        "id": assignment.id,
        "application_id": app.id,
        "application_code": app.application_code,
        "proposal_title": app.proposal_title,
        "challenge_id": app.challenge.id,
        "challenge_title": app.challenge.title,
        "expert_id": expert.id,
        "expert_name": expert.full_name,
        "expert_email": expert.email,
        "expert_organization": prof.organization if prof else expert.organization_name,
        "assigned_by": current_user.id,
        "assigned_by_name": current_user.full_name,
        "assignment_status": assignment.assignment_status,
        "assigned_at": assignment.assigned_at,
        "accepted_at": assignment.accepted_at,
        "completed_at": assignment.completed_at,
        "due_at": assignment.due_at,
        "notes": assignment.notes,
        "conflict_declaration": None,
        "conflict_reason": None,
        "overall_score": None,
        "recommendation": None,
    }


@router.post(
    "/government/assignments/{assignment_id}/reassign",
    response_model=EvaluationAssignmentResponse,
    summary="Reassign an application assignment to a new expert",
)
def reassign_expert(
    assignment_id: str,
    payload: EvaluationAssignmentReassign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_assignment = ExpertEvaluationService.reassign_expert(
        db=db,
        assignment_id=assignment_id,
        new_expert_id=payload.new_expert_id,
        user=current_user,
        reason=payload.reason,
        due_at=payload.due_at,
    )

    app = new_assignment.application
    expert = new_assignment.expert
    prof = expert.expert_profile

    return {
        "id": new_assignment.id,
        "application_id": app.id,
        "application_code": app.application_code,
        "proposal_title": app.proposal_title,
        "challenge_id": app.challenge.id,
        "challenge_title": app.challenge.title,
        "expert_id": expert.id,
        "expert_name": expert.full_name,
        "expert_email": expert.email,
        "expert_organization": prof.organization if prof else expert.organization_name,
        "assigned_by": current_user.id,
        "assigned_by_name": current_user.full_name,
        "assignment_status": new_assignment.assignment_status,
        "assigned_at": new_assignment.assigned_at,
        "accepted_at": new_assignment.accepted_at,
        "completed_at": new_assignment.completed_at,
        "due_at": new_assignment.due_at,
        "notes": new_assignment.notes,
        "conflict_declaration": None,
        "conflict_reason": None,
        "overall_score": None,
        "recommendation": None,
    }


@router.get(
    "/government/applications/{application_id}/evaluations",
    response_model=EvaluationSummaryResponse,
    summary="Get multi-expert evaluation summary and dossier for an application",
)
@router.get(
    "/challenges/{challenge_id}/applications/{application_id}/evaluations",
    include_in_schema=False,
)
@router.get(
    "/applications/{application_id}/evaluations",
    include_in_schema=False,
)
def get_application_evaluations(
    application_id: str,
    challenge_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpertEvaluationService.get_application_evaluations_summary(
        db=db,
        application_id=application_id,
        user=current_user,
    )


@router.get(
    "/government/challenges/{challenge_id}/ranking",
    response_model=ChallengeRankingResponse,
    summary="Get ranked leaderboard of all applications for a challenge",
)
@router.get(
    "/challenges/{challenge_id}/evaluations/rankings",
    include_in_schema=False,
)
def get_challenge_ranking(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ranking_data = ExpertEvaluationService.get_challenge_ranking(
        db=db,
        challenge_id=challenge_id,
        user=current_user,
    )
    # Also support direct list response if expected by frontend/client
    return ranking_data["ranking"] if "/evaluations/rankings" in "/challenges/{challenge_id}/evaluations/rankings" and isinstance(ranking_data, dict) and "ranking" in ranking_data else ranking_data


@router.post(
    "/government/applications/{application_id}/shortlist",
    summary="Shortlist an application following expert evaluation",
)
def shortlist_application(
    application_id: str,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = payload.get("notes") if payload else None
    app = ExpertEvaluationService.shortlist_application(
        db=db,
        application_id=application_id,
        user=current_user,
        notes=notes,
    )
    return {"message": "Application shortlisted successfully.", "application_id": app.id, "status": app.status}


@router.post(
    "/government/applications/{application_id}/reject",
    summary="Reject an application following expert evaluation",
)
def reject_application(
    application_id: str,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = payload.get("notes") if payload else None
    app = ExpertEvaluationService.reject_application(
        db=db,
        application_id=application_id,
        user=current_user,
        notes=notes,
    )
    return {"message": "Application rejected.", "application_id": app.id, "status": app.status}


@router.post(
    "/challenges/{challenge_id}/applications/{application_id}/decision",
    summary="Record decision (SHORTLISTED/REJECTED) on application",
    include_in_schema=False,
)
def record_application_decision(
    challenge_id: str,
    application_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decision = payload.get("decision", "").upper()
    notes = payload.get("notes")
    if decision == "SHORTLISTED":
        app = ExpertEvaluationService.shortlist_application(
            db=db,
            application_id=application_id,
            user=current_user,
            notes=notes,
        )
    elif decision == "REJECTED":
        app = ExpertEvaluationService.reject_application(
            db=db,
            application_id=application_id,
            user=current_user,
            notes=notes,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Invalid decision: {decision}")
    status_str = app.status.value if hasattr(app.status, "value") else str(app.status)
    return {
        "message": f"Application {decision.lower()} successfully.",
        "application_id": app.id,
        "application_status": status_str,
    }
