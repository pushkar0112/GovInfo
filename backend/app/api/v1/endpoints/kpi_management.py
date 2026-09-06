from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.schemas.kpi_validation import (
    PilotKPICreateRequest,
    PilotKPIUpdateRequest,
    PilotKPIResponse,
    KPIMeasurementCreateRequest,
    KPIMeasurementResponse,
    KPIEvidenceResponse,
)
from app.services.kpi_validation_service import KPIValidationService

router = APIRouter()


# -------------------------------------------------------------
# PILOT KPI ENDPOINTS
# -------------------------------------------------------------
@router.post(
    "/pilots/{pilot_id}/kpis",
    response_model=PilotKPIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Define Pilot KPI",
    description="Government officer or Admin defines a quantitative, verifiable KPI for a pilot sandbox.",
)
def create_pilot_kpi(
    pilot_id: str,
    payload: PilotKPICreateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotKPIResponse:
    return KPIValidationService.create_pilot_kpi(db, pilot_id, payload, current_user)


@router.get(
    "/pilots/{pilot_id}/kpis",
    response_model=List[PilotKPIResponse],
    summary="List Pilot KPIs",
    description="Retrieve all defined KPIs, targets, baseline values, and current progress for a pilot.",
)
def list_pilot_kpis(
    pilot_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PilotKPIResponse]:
    return KPIValidationService.get_pilot_kpis(db, pilot_id, current_user)


@router.get(
    "/kpis/{kpi_id}",
    response_model=PilotKPIResponse,
    summary="Get KPI Details",
    description="Retrieve full KPI details including historical measurements and uploaded evidence documents.",
)
def get_kpi_detail(
    kpi_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PilotKPIResponse:
    return KPIValidationService.get_kpi_detail(db, kpi_id, current_user)


@router.put(
    "/kpis/{kpi_id}",
    response_model=PilotKPIResponse,
    summary="Update KPI Definition",
    description="Update targets, direction, weight, or verification method for an existing KPI.",
)
def update_pilot_kpi(
    kpi_id: str,
    payload: PilotKPIUpdateRequest,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> PilotKPIResponse:
    return KPIValidationService.update_pilot_kpi(db, kpi_id, payload, current_user)


@router.delete(
    "/kpis/{kpi_id}",
    summary="Delete KPI Definition",
    description="Remove a KPI from a pilot.",
)
def delete_pilot_kpi(
    kpi_id: str,
    current_user: User = Depends(require_role(UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return KPIValidationService.delete_pilot_kpi(db, kpi_id, current_user)


# -------------------------------------------------------------
# MEASUREMENT RECORDING
# -------------------------------------------------------------
@router.post(
    "/kpis/{kpi_id}/measurements",
    response_model=KPIMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record KPI Measurement",
    description="Record an empirical data point, telemetry reading, or field metric for a KPI.",
)
def record_kpi_measurement(
    kpi_id: str,
    payload: KPIMeasurementCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KPIMeasurementResponse:
    return KPIValidationService.record_measurement(db, kpi_id, payload, current_user)


@router.get(
    "/kpis/{kpi_id}/measurements",
    response_model=List[KPIMeasurementResponse],
    summary="List KPI Measurements",
    description="Retrieve all time-series measurements recorded for a specific KPI.",
)
def list_kpi_measurements(
    kpi_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[KPIMeasurementResponse]:
    return KPIValidationService.get_kpi_measurements(db, kpi_id, current_user)


# -------------------------------------------------------------
# EVIDENCE UPLOAD & RETRIEVAL
# -------------------------------------------------------------
@router.post(
    "/kpis/{kpi_id}/evidence",
    response_model=KPIEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload KPI Evidence",
    description="Upload raw telemetry logs, sensor datasets, survey summaries, or photos proving KPI achievement.",
)
def upload_kpi_evidence(
    kpi_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    evidence_type: str = Form("DATASET"),
    measurement_id: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> KPIEvidenceResponse:
    return KPIValidationService.upload_evidence(
        db=db,
        kpi_id=kpi_id,
        upload_file=file,
        title=title,
        description=description,
        evidence_type=evidence_type,
        measurement_id=measurement_id,
        source=source,
        current_user=current_user,
    )


@router.get(
    "/kpis/{kpi_id}/evidence",
    response_model=List[KPIEvidenceResponse],
    summary="List KPI Evidence Files",
    description="Retrieve metadata and version history for all evidence files uploaded for a KPI.",
)
def list_kpi_evidence(
    kpi_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[KPIEvidenceResponse]:
    return KPIValidationService.get_kpi_evidences(db, kpi_id, current_user)


@router.get(
    "/kpi-evidence/{evidence_id}/download",
    summary="Download Evidence Document",
    description="Securely download physical evidence file.",
)
def download_kpi_evidence(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_path, file_name, mime_type = KPIValidationService.get_evidence_file(db, evidence_id, current_user)
    return FileResponse(
        path=str(file_path),
        filename=file_name,
        media_type=mime_type,
    )
