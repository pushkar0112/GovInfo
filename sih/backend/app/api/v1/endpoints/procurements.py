from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import UserRole
from app.api.deps import require_role
from app.models.user import User
from app.schemas.procurement import (
    ValidationCreateRequest,
    ValidationResponse,
    ProcurementCreateRequest,
    ProcurementResponse,
)
from app.services.procurement_service import ProcurementService

router = APIRouter()


# ------------------------------------------------------------------------------
# Independent Validation Endpoints
# ------------------------------------------------------------------------------
@router.post(
    "/validations",
    response_model=ValidationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue 3rd-party independent validation certificate",
    description="Allows accredited testing agencies (STQC, IITs) to certify pilot empirical outcomes with SHA-256 hash.",
)
def create_validation(
    payload: ValidationCreateRequest,
    current_user: User = Depends(
        require_role(UserRole.INDEPENDENT_VALIDATOR, UserRole.ADMIN)
    ),
    db: Session = Depends(get_db),
) -> ValidationResponse:
    return ProcurementService.create_validation(db, current_user, payload)


@router.get(
    "/validations",
    response_model=List[ValidationResponse],
    summary="Public independent validation certificate registry",
    description="Returns all verified pilot certificates with SHA-256 hashes.",
)
def list_validations(
    db: Session = Depends(get_db),
) -> List[ValidationResponse]:
    return ProcurementService.list_validations(db)


@router.get(
    "/validations/pilot/{pilot_id}",
    response_model=ValidationResponse,
    summary="Get validation certificate for specific pilot",
    description="Returns accredited test report and certificate hash for a given pilot sandbox.",
)
def get_validation_for_pilot(
    pilot_id: str,
    db: Session = Depends(get_db),
) -> ValidationResponse:
    return ProcurementService.get_validation_by_pilot(db, pilot_id)


# ------------------------------------------------------------------------------
# Direct Procurement & GeM Scale-Up Endpoints
# ------------------------------------------------------------------------------
@router.post(
    "/procurements",
    response_model=ProcurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute direct procurement sanction order",
    description="Allows Procurement / Department Officers to issue sanction orders under GFR Rule 149 / GeM.",
)
def issue_procurement(
    payload: ProcurementCreateRequest,
    current_user: User = Depends(
        require_role(UserRole.PROCUREMENT_OFFICER, UserRole.GOVERNMENT, UserRole.ADMIN)
    ),
    db: Session = Depends(get_db),
) -> ProcurementResponse:
    return ProcurementService.issue_procurement_order(db, current_user, payload)


@router.get(
    "/procurements",
    response_model=List[ProcurementResponse],
    summary="Public procurement transparency registry",
    description="Returns all executed public procurement sanction orders and GeM contract numbers.",
)
def list_procurements(
    db: Session = Depends(get_db),
) -> List[ProcurementResponse]:
    return ProcurementService.list_procurement_records(db)
