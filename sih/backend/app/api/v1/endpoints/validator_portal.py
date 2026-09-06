from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.models.validation_workflow import ValidatorProfile
from app.schemas.kpi_validation import (
    ValidatorProfileCreateRequest,
    ValidatorProfileResponse,
    ValidationAssignmentResponse,
    ValidationAssignmentRespondRequest,
    COIDeclarationRequest,
    COIDeclarationResponse,
    ValidationReportDraftRequest,
    ValidationReportSubmitRequest,
    ValidationReportResponse,
)
from app.services.kpi_validation_service import KPIValidationService

router = APIRouter(prefix="/validator", tags=["Independent Validator Portal"])


@router.get(
    "/profile/me",
    response_model=Optional[ValidatorProfileResponse],
    summary="Get Current Validator Profile",
    description="Retrieve the profile, organization, accreditation, and metrics for the authenticated validator.",
)
def get_current_validator_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[ValidatorProfileResponse]:
    profile = db.query(ValidatorProfile).filter(ValidatorProfile.user_id == current_user.id).first()
    if not profile:
        return None
    return KPIValidationService._format_validator_profile_response(profile)


@router.post(
    "/profile",
    response_model=ValidatorProfileResponse,
    summary="Create or Update Validator Profile",
    description="Set or update organizational details, accreditations, and domain expertise.",
)
def update_validator_profile(
    payload: ValidatorProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidatorProfileResponse:
    return KPIValidationService.create_or_update_validator_profile(db, payload, current_user)


@router.get(
    "/assignments",
    response_model=List[ValidationAssignmentResponse],
    summary="List Validator Assignments",
    description="Retrieve all pilots assigned to the current validator for independent evaluation.",
)
def list_validator_assignments(
    status: Optional[str] = Query(None, description="Filter by status (ASSIGNED, ACCEPTED, DECLINED, IN_PROGRESS, COMPLETED)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ValidationAssignmentResponse]:
    return KPIValidationService.get_validator_assignments(db, current_user, status_filter=status)


@router.post(
    "/assignments/{assignment_id}/respond",
    response_model=ValidationAssignmentResponse,
    summary="Accept or Decline Assignment",
    description="Accept or decline an assigned pilot validation with an optional reason.",
)
def respond_to_assignment(
    assignment_id: str,
    payload: ValidationAssignmentRespondRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidationAssignmentResponse:
    return KPIValidationService.respond_to_assignment(db, assignment_id, payload, current_user)


@router.post(
    "/assignments/{assignment_id}/coi",
    response_model=COIDeclarationResponse,
    summary="Declare Conflict of Interest",
    description="Legally binding conflict of interest declaration (financial, employment, personal, or competitive).",
)
def declare_coi(
    assignment_id: str,
    payload: COIDeclarationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> COIDeclarationResponse:
    return KPIValidationService.declare_conflict_of_interest(db, assignment_id, payload, current_user)


@router.get(
    "/assignments/{assignment_id}/workspace",
    summary="Get Validation Workspace",
    description="Full workspace data containing pilot metadata, all KPIs with evidence & telemetry, COI status, and current report draft.",
)
def get_validation_workspace(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return KPIValidationService.get_validation_workspace(db, assignment_id, current_user)


@router.post(
    "/assignments/{assignment_id}/report/draft",
    response_model=ValidationReportResponse,
    summary="Save Draft Validation Report",
    description="Save working draft of validation findings, quantitative scores, and recommendations without locking.",
)
def save_draft_report(
    assignment_id: str,
    payload: ValidationReportDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidationReportResponse:
    return KPIValidationService.save_draft_report(db, assignment_id, payload, current_user)


@router.post(
    "/assignments/{assignment_id}/report/submit",
    response_model=ValidationReportResponse,
    summary="Submit Official Validation Report",
    description="Lock and submit final immutable validation report with overall assessment (SUCCESSFUL, PARTIALLY_SUCCESSFUL, UNSUCCESSFUL, INCONCLUSIVE).",
)
def submit_validation_report(
    assignment_id: str,
    payload: ValidationReportSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ValidationReportResponse:
    return KPIValidationService.submit_validation_report(db, assignment_id, payload, current_user)


@router.get(
    "/reports/{report_id}/export-pdf",
    summary="Export Validation Report PDF",
    description="Generate and stream audit-grade PDF validation report.",
)
def export_validator_report_pdf(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pdf_buffer = KPIValidationService.generate_validation_pdf(db, report_id, current_user)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=validation_report_{report_id[:8]}.pdf"},
    )
