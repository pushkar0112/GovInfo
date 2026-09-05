from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    require_role,
)
from app.models.user import User
from app.schemas.challenge import (
    ChallengeCreateRequest,
    ChallengeUpdateRequest,
    ChallengeResponse,
    ChallengePublishValidationResponse,
    KPICreateRequest,
    KPIUpdateRequest,
    KPIResponse,
    ApplicationCreateRequest,
    ApplicationResponse,
)
from app.services.challenge_service import ChallengeService

router = APIRouter()


# ==============================================================================
# Challenge Lifecycle Endpoints
# ==============================================================================

@router.post(
    "",
    response_model=ChallengeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new innovation challenge",
    description="Allows Government Nodal Officers and Admins to define problem statements and outcome criteria.",
)
def create_challenge(
    payload: ChallengeCreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.create_challenge(db, current_user, payload)


@router.get(
    "",
    response_model=List[ChallengeResponse],
    summary="List challenges directory",
    description="Directory for government challenges with domain, status, and department filtering. Drafts are restricted to owning departments and admins.",
)
def list_challenges(
    domain: Optional[str] = Query(None, description="Filter by domain/sector (e.g., CivicTech, HealthTech)"),
    sector: Optional[str] = Query(None, description="Legacy sector filter"),
    department_id: Optional[str] = Query(None, description="Filter by sponsoring department UUID"),
    geographical_scope: Optional[str] = Query(None, description="Filter by geographical scope"),
    status: Optional[str] = Query(None, description="Filter by status (DRAFT, PUBLISHED, CLOSED, etc.)"),
    search: Optional[str] = Query(None, description="Search keyword in title, problem, or code"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> List[ChallengeResponse]:
    return ChallengeService.list_challenges(
        db,
        current_user=current_user,
        domain=domain,
        sector=sector,
        department_id=department_id,
        geographical_scope=geographical_scope,
        status_filter=status,
        search=search,
    )


@router.get(
    "/my-applications",
    response_model=List[ApplicationResponse],
    summary="List proposals submitted by current startup",
    description="Returns all application proposals submitted by the authenticated startup.",
)
def get_my_applications(
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> List[ApplicationResponse]:
    return ChallengeService.list_my_applications(db, current_user)


@router.get(
    "/{challenge_id}",
    response_model=ChallengeResponse,
    summary="Get challenge details",
    description="Returns complete outcome definition, problem statement, and KPIs. Unpublished challenges are restricted to owning departments.",
)
def get_challenge(
    challenge_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.get_challenge_by_id(db, challenge_id, current_user=current_user)


@router.put(
    "/{challenge_id}",
    response_model=ChallengeResponse,
    summary="Update an existing challenge",
    description="Allows owning department or Admin to edit challenge details, budget, and timeline.",
)
def update_challenge(
    challenge_id: str,
    payload: ChallengeUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.update_challenge(db, current_user, challenge_id, payload)


@router.delete(
    "/{challenge_id}",
    summary="Delete a draft challenge",
    description="Allows owning department or Admin to delete an unpublished draft challenge.",
)
def delete_challenge(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return ChallengeService.delete_challenge(db, current_user, challenge_id)


@router.get(
    "/{challenge_id}/validate-publish",
    response_model=ChallengePublishValidationResponse,
    summary="Validate challenge readiness for publication",
    description="Inspects whether all mandatory criteria and KPIs are fulfilled before publishing.",
)
def validate_challenge_for_publish(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengePublishValidationResponse:
    from app.models.challenge import Challenge
    from fastapi import HTTPException
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")
    ChallengeService.check_department_ownership(current_user, challenge)
    can_publish, missing = ChallengeService.validate_for_publish(challenge)
    return ChallengePublishValidationResponse(
        can_publish=can_publish,
        ready_to_publish=can_publish,
        missing_requirements=missing,
    )


@router.post(
    "/{challenge_id}/publish",
    response_model=ChallengeResponse,
    summary="Publish a challenge",
    description="Validates all mandatory criteria and publishes the challenge for public discovery.",
)
def publish_challenge(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.publish_challenge(db, current_user, challenge_id)


@router.post(
    "/{challenge_id}/close",
    response_model=ChallengeResponse,
    summary="Close an active challenge",
    description="Closes the challenge for new applications.",
)
def close_challenge(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.close_challenge(db, current_user, challenge_id)


@router.post(
    "/{challenge_id}/cancel",
    response_model=ChallengeResponse,
    summary="Cancel a challenge",
    description="Withdraws the challenge from the platform.",
)
def cancel_challenge(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    return ChallengeService.cancel_challenge(db, current_user, challenge_id)


# ==============================================================================
# KPI Endpoints
# ==============================================================================

@router.get(
    "/{challenge_id}/kpis",
    response_model=List[KPIResponse],
    summary="List KPIs for a challenge",
    description="Returns quantitative outcome KPIs defined for this challenge.",
)
def list_challenge_kpis(
    challenge_id: str,
    db: Session = Depends(get_db),
) -> List[KPIResponse]:
    return ChallengeService.list_kpis(db, challenge_id)


@router.post(
    "/{challenge_id}/kpis",
    response_model=KPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a KPI to a challenge",
    description="Allows owning department or Admin to attach a measurable quantitative KPI.",
)
def create_challenge_kpi(
    challenge_id: str,
    payload: KPICreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> KPIResponse:
    return ChallengeService.create_kpi(db, current_user, challenge_id, payload)


@router.put(
    "/{challenge_id}/kpis/{kpi_id}",
    response_model=KPIResponse,
    summary="Update a KPI",
    description="Allows owning department or Admin to edit a challenge KPI.",
)
def update_challenge_kpi(
    challenge_id: str,
    kpi_id: str,
    payload: KPIUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> KPIResponse:
    return ChallengeService.update_kpi(db, current_user, challenge_id, kpi_id, payload)


@router.delete(
    "/{challenge_id}/kpis/{kpi_id}",
    summary="Remove a KPI",
    description="Allows owning department or Admin to delete a KPI from a challenge.",
)
def delete_challenge_kpi(
    challenge_id: str,
    kpi_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return ChallengeService.delete_kpi(db, current_user, challenge_id, kpi_id)


# ==============================================================================
# Legacy Application Endpoints (Maintained for Stage Compatibility)
# ==============================================================================

@router.post(
    "/{challenge_id}/apply",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit startup proposal to challenge",
    description="Allows DPIIT Startups to apply with a technical proposal and Technology Readiness Level (TRL).",
)
def apply_to_challenge(
    challenge_id: str,
    payload: ApplicationCreateRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ChallengeService.submit_application(db, current_user, challenge_id, payload)


@router.get(
    "/{challenge_id}/applications",
    response_model=List[ApplicationResponse],
    summary="List applications for a department challenge",
    description="Allows Government Nodal Officers to review startup submissions for their department's challenge.",
)
def get_challenge_applications(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> List[ApplicationResponse]:
    return ChallengeService.list_applications_for_challenge(db, current_user, challenge_id)
