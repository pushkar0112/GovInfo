from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user, require_role, get_current_user_optional
from app.models.user import User
from app.models.challenge import Challenge, ChallengeStatus
from app.models.department import Department
from app.schemas.startup import (
    StartupProfileCreateRequest,
    StartupProfileUpdateRequest,
    StartupProfileResponse,
    EligibilityCheckResponse,
)
from app.schemas.challenge import ChallengeResponse, ChallengePaginatedResponse
from app.services.startup_service import StartupService
from app.services.challenge_service import ChallengeService

router = APIRouter()


# ==============================================================================
# Startup Profile Endpoints
# ==============================================================================

@router.get(
    "/profile",
    response_model=StartupProfileResponse,
    summary="Get startup profile",
    description="Fetches the authenticated startup's profile and completeness percentage.",
)
def get_profile(
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> StartupProfileResponse:
    startup = StartupService.get_or_create_profile(db, current_user)
    return StartupService.build_profile_response(startup)


@router.post(
    "/profile",
    response_model=StartupProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or initialize startup profile",
)
def create_profile(
    payload: StartupProfileCreateRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> StartupProfileResponse:
    update_payload = StartupProfileUpdateRequest(**payload.model_dump())
    return StartupService.update_profile(db, current_user, update_payload)


@router.put(
    "/profile",
    response_model=StartupProfileResponse,
    summary="Update startup profile",
    description="Updates organization, recognition, technology, and operating scope fields.",
)
def update_profile(
    payload: StartupProfileUpdateRequest,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> StartupProfileResponse:
    return StartupService.update_profile(db, current_user, payload)


# ==============================================================================
# Challenge Discovery & Search (Startup Perspective)
# ==============================================================================

@router.get(
    "/challenges",
    response_model=ChallengePaginatedResponse,
    summary="Startup challenge discovery catalog",
    description="Lists ONLY published government challenges with database-driven search, filtering, and sorting.",
)
def discover_challenges(
    search: Optional[str] = Query(None, description="Search in title, challenge code, problem statement, or domain"),
    domain: Optional[str] = Query(None, description="Filter by domain/sector"),
    geography: Optional[str] = Query(None, description="Filter by geographical scope"),
    budget_min: Optional[float] = Query(None, description="Minimum pilot budget grant"),
    budget_max: Optional[float] = Query(None, description="Maximum pilot budget grant"),
    max_duration_days: Optional[int] = Query(None, description="Max pilot duration in days"),
    sort_by: str = Query("newest", description="Sorting options: newest, deadline, budget, title"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> ChallengePaginatedResponse:
    # Strictly filter for PUBLISHED challenges
    query = (
        db.query(Challenge)
        .outerjoin(Department, Challenge.department_id == Department.id)
        .filter(Challenge.status == ChallengeStatus.PUBLISHED.value)
    )

    if domain and domain.upper() != "ALL":
        query = query.filter(Challenge.domain.ilike(f"%{domain}%"))

    if geography and geography.upper() != "ALL":
        query = query.filter(Challenge.geographical_scope.ilike(f"%{geography}%"))

    if budget_min is not None:
        query = query.filter(Challenge.budget_max >= budget_min)

    if budget_max is not None:
        query = query.filter(Challenge.budget_min <= budget_max)

    if max_duration_days is not None:
        query = query.filter(Challenge.pilot_duration_days <= max_duration_days)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Challenge.title.ilike(pattern),
                Challenge.challenge_code.ilike(pattern),
                Challenge.problem_statement.ilike(pattern),
                Challenge.domain.ilike(pattern),
                Department.name.ilike(pattern),
            )
        )

    # Sorting
    if sort_by == "deadline":
        query = query.order_by(asc(Challenge.application_deadline))
    elif sort_by == "budget":
        query = query.order_by(desc(Challenge.budget_max))
    elif sort_by == "title":
        query = query.order_by(asc(Challenge.title))
    else:
        query = query.order_by(desc(Challenge.published_at), desc(Challenge.created_at))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Convert to ChallengeResponse
    results = [ChallengeService.format_challenge_response(c) for c in items]

    return ChallengePaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        challenges=results,
    )


@router.get(
    "/challenges/{challenge_id}",
    response_model=ChallengeResponse,
    summary="Get published challenge detail",
)
def get_challenge_detail(
    challenge_id: str,
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    challenge = (
        db.query(Challenge)
        .filter(
            Challenge.id == challenge_id,
            Challenge.status == ChallengeStatus.PUBLISHED.value,
        )
        .first()
    )
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published challenge not found.",
        )
    return ChallengeService.format_challenge_response(challenge)


# ==============================================================================
# Eligibility Screening Endpoint
# ==============================================================================

@router.post(
    "/challenges/{challenge_id}/eligibility-check",
    response_model=EligibilityCheckResponse,
    summary="Evaluate startup eligibility for challenge",
    description="Screens startup profile against challenge criteria (DPIIT, product stage, domain, security).",
)
def screen_eligibility(
    challenge_id: str,
    current_user: User = Depends(require_role(UserRole.STARTUP, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> EligibilityCheckResponse:
    return StartupService.screen_eligibility(db, current_user, challenge_id)
