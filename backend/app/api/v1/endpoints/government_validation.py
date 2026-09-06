from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.models.validation_workflow import ValidationReport
from app.schemas.kpi_validation import (
    ValidatorProfileResponse,
    ValidationAssignmentCreateRequest,
    ValidationAssignmentResponse,
    ValidationReportReopenRequest,
    ValidationReportResponse,
    PilotSuccessConfirmationRequest,
    PilotValidationSummaryResponse,
)
from app.services.kpi_validation_service import KPIValidationService

router = APIRouter(prefix="/government", tags=["Government Validation & Pilot Outcome Assessment"])


@router.get(
    "/validators",
    response_model=List[ValidatorProfileResponse],
    summary="List Accredited Validators",
    description="Browse accredited independent validation bodies and qualified technical experts.",
)
def list_accredited_validators(
    availability: Optional[str] = Query(None, description="AVAILABLE, BUSY, INACTIVE"),
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> List[ValidatorProfileResponse]:
    return KPIValidationService.list_validators(db, availability=availability)


@router.post(
    "/pilots/{pilot_id}/assign-validator",
    response_model=ValidationAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign Validator to Pilot",
    description="Formally commission an independent validation entity to review pilot outcomes and telemetry.",
)
def assign_pilot_validator(
    pilot_id: str,
    payload: ValidationAssignmentCreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ValidationAssignmentResponse:
    # Ensure pilot_id in route matches payload
    payload.pilot_id = pilot_id
    return KPIValidationService.assign_validator(db, payload, current_user)


@router.get(
    "/pilots/{pilot_id}/validation-summary",
    response_model=PilotValidationSummaryResponse,
    summary="Get Pilot Validation Summary",
    description="Retrieve live overview of validation status, active assignment, achieved KPIs, and confirmation records.",
)
def get_pilot_validation_summary(
    pilot_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotValidationSummaryResponse:
    return KPIValidationService.get_pilot_validation_summary(db, pilot_id, current_user)


@router.get(
    "/pilots/{pilot_id}/validation-report",
    response_model=Optional[ValidationReportResponse],
    summary="Get Submitted Validation Report",
    description="View the latest independent evaluation report submitted for this pilot.",
)
def get_pilot_validation_report(
    pilot_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Optional[ValidationReportResponse]:
    report = (
        db.query(ValidationReport)
        .filter(ValidationReport.pilot_id == pilot_id)
        .order_by(ValidationReport.created_at.desc())
        .first()
    )
    if not report:
        return None
    return KPIValidationService._format_report_response(report)


@router.post(
    "/validation-reports/{report_id}/reopen",
    response_model=ValidationReportResponse,
    summary="Request Revisions on Report",
    description="Reopen a submitted report requesting the validator clarify findings or re-examine evidence.",
)
def reopen_validation_report(
    report_id: str,
    payload: ValidationReportReopenRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> ValidationReportResponse:
    return KPIValidationService.reopen_validation_report(db, report_id, payload, current_user)


@router.post(
    "/pilots/{pilot_id}/confirm-success",
    response_model=PilotValidationSummaryResponse,
    summary="Confirm Pilot Success Classification",
    description="Government officer legally confirms the outcome status (SUCCESSFUL, PARTIALLY_SUCCESSFUL, UNSUCCESSFUL, INCONCLUSIVE). Divergence from validator assessment requires formal justification.",
)
def confirm_pilot_success(
    pilot_id: str,
    payload: PilotSuccessConfirmationRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotValidationSummaryResponse:
    return KPIValidationService.confirm_pilot_success_classification(db, pilot_id, payload, current_user)


@router.get(
    "/validation-reports/{report_id}/export-pdf",
    summary="Export Official Validation PDF",
    description="Stream publication-grade PDF report with full telemetry audit trail, scorecard, and signatures.",
)
def export_validation_report_pdf(
    report_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    pdf_buffer = KPIValidationService.generate_validation_pdf(db, report_id, current_user)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=gov_validation_report_{report_id[:8]}.pdf"},
    )


@router.get(
    "/validation/dashboard",
    summary="Validation Analytics Dashboard",
    description="High-level dashboard with validation metrics across all department pilots.",
)
def get_validation_dashboard(
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return KPIValidationService.get_validation_dashboard(db, current_user)
