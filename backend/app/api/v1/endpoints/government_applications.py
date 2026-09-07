from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.schemas.application import (
    ApplicationResponse,
    ApplicationListResponse,
    ApplicationStatusUpdateRequest,
)
from app.schemas.ai_assessment import AIAssessmentResponse
from app.services.application_service import ApplicationService
from app.services.ai_shortlisting_service import AIShortlistingService

router = APIRouter()


@router.get(
    "",
    response_model=ApplicationListResponse,
    summary="Government department application inbox",
    description="Lists submitted applications for challenges owned by the government officer's department.",
)
def list_department_applications(
    challenge_id: Optional[str] = Query(None, description="Filter by challenge ID"),
    status: Optional[str] = Query(None, description="Filter by status (SUBMITTED, UNDER_REVIEW, SHORTLISTED, REJECTED)"),
    search: Optional[str] = Query(None, description="Search keyword in code, title, or startup name"),
    sort_by: str = Query("newest", description="Sorting options: newest, oldest, budget"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationListResponse:
    return ApplicationService.list_government_applications(
        db,
        current_user,
        challenge_id=challenge_id,
        status_filter=status,
        search=search,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get application review dossier",
    description="Department nodal officer view of startup technical proposal, pilot plan, and budget.",
)
def get_department_application_detail(
    application_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.get_application_detail(db, current_user, application_id)


@router.get(
    "/{application_id}/ai-assessment",
    response_model=AIAssessmentResponse,
    summary="Get explainable AI shortlisting assessment",
    description="Calculates or retrieves the 6-factor AI Match Score, recommendation, positive reasons, and potential concerns.",
)
def get_application_ai_assessment(
    application_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> AIAssessmentResponse:
    # Validate permission to access application
    ApplicationService.get_application_detail(db, current_user, application_id)
    return AIShortlistingService.get_or_create_assessment(db, application_id, force_reanalyze=False)


@router.post(
    "/{application_id}/ai-assessment",
    response_model=AIAssessmentResponse,
    summary="Trigger/re-evaluate AI shortlisting assessment",
    description="Re-analyzes proposal against challenge requirements and returns an updated AI Match Score.",
)
def reanalyze_application_ai_assessment(
    application_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> AIAssessmentResponse:
    ApplicationService.get_application_detail(db, current_user, application_id)
    return AIShortlistingService.get_or_create_assessment(db, application_id, force_reanalyze=True)


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update application review status",
    description="Transitions application status (SUBMITTED -> UNDER_REVIEW -> SHORTLISTED / REJECTED).",
)
@router.post(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    include_in_schema=False,
)
def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    return ApplicationService.update_application_status(db, current_user, application_id, payload)

