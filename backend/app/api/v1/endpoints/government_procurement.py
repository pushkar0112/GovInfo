from typing import List, Optional
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
from app.schemas.procurement_contracts import (
    ProcurementDecisionCreateRequest,
    ProcurementDecisionUpdateRequest,
    ProcurementDecisionResponse,
    ProcurementRecordCreateRequest,
    ProcurementRecordUpdateRequest,
    ProcurementRecordResponse,
    ProcurementApprovalActionRequest,
    ContractCreateRequest,
    ContractResponse,
    ProcurementTraceabilityResponse,
    ProcurementDashboardStatsResponse,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()

require_gov_or_procure = require_role(
    UserRole.GOVERNMENT,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ADMIN,
)


# ------------------------------------------------------------------------------
# Procurement Decisions
# ------------------------------------------------------------------------------

@router.post(
    "/pilots/{pilot_id}/procurement-decision",
    response_model=ProcurementDecisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record post-validation procurement decision",
)
@router.post(
    "/pilots/{pilot_id}/procurement/decisions",
    response_model=ProcurementDecisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record post-validation procurement decision (plural alias)",
)
def create_procurement_decision(
    pilot_id: str,
    payload: ProcurementDecisionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    """
    Step 8 Gate: Records an official procurement decision for a completed and validated pilot.
    Enforces eligibility (COMPLETED, confirmed validation, SUCCESSFUL or PARTIALLY_SUCCESSFUL).
    """
    return ProcurementContractService.create_procurement_decision(db, current_user, pilot_id, payload)


@router.get(
    "/pilots/{pilot_id}/procurement-decision",
    response_model=Optional[ProcurementDecisionResponse],
    summary="Get procurement decision for pilot",
)
def get_procurement_decision(
    pilot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ProcurementContractService.get_procurement_decision_by_pilot(db, current_user, pilot_id)


@router.post(
    "/procurement-decisions/{decision_id}/submit",
    response_model=ProcurementDecisionResponse,
    summary="Submit procurement decision for departmental review",
)
def submit_procurement_decision(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.submit_procurement_decision(db, current_user, decision_id)


@router.post(
    "/procurement-decisions/{decision_id}/approve",
    response_model=ProcurementDecisionResponse,
    summary="Approve procurement decision",
)
def approve_procurement_decision(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.approve_procurement_decision(db, current_user, decision_id)


@router.post(
    "/procurement-decisions/{decision_id}/reject",
    response_model=ProcurementDecisionResponse,
    summary="Reject procurement decision",
)
def reject_procurement_decision(
    decision_id: str,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.reject_procurement_decision(db, current_user, decision_id, reason)


# ------------------------------------------------------------------------------
# Procurement Records & Approvals
# ------------------------------------------------------------------------------

@router.get(
    "/procurement/stats",
    response_model=ProcurementDashboardStatsResponse,
    summary="Get procurement dashboard metrics",
)
def get_procurement_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.get_dashboard_stats(db, current_user)


@router.get(
    "/procurement",
    response_model=List[ProcurementRecordResponse],
    summary="List government procurement transitions",
)
def list_procurements(
    status: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    startup_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.list_procurements(
        db, current_user, status, department_id, startup_id
    )


@router.post(
    "/procurement",
    response_model=ProcurementRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize formal procurement record from approved decision",
)
@router.post(
    "/procurement/records",
    response_model=ProcurementRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize formal procurement record from approved decision (records alias)",
)
def create_procurement_record(
    payload: ProcurementRecordCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.create_procurement_record(db, current_user, payload)


@router.get(
    "/procurement/{procurement_id}",
    response_model=ProcurementRecordResponse,
    summary="Get procurement record details and approvals",
)
def get_procurement_record(
    procurement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.get_procurement_record(db, current_user, procurement_id)


@router.post(
    "/procurement/{procurement_id}/approvals/{approval_id}",
    response_model=ProcurementRecordResponse,
    summary="Execute procurement approval action",
)
def action_procurement_approval(
    procurement_id: str,
    approval_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    act = payload.get("action") or payload.get("status") or "APPROVE"
    comments = payload.get("comments")
    req = ProcurementApprovalActionRequest(action=act, comments=comments)
    return ProcurementContractService.record_approval_action(
        db, current_user, procurement_id, approval_id, req
    )


@router.post(
    "/procurement/{procurement_id}/approvals/{approval_id}/approve",
    response_model=ProcurementRecordResponse,
    summary="Approve procurement approval task",
)
def approve_procurement_task(
    procurement_id: str,
    approval_id: str,
    comments: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = ProcurementApprovalActionRequest(action="APPROVE", comments=comments)
    return ProcurementContractService.record_approval_action(
        db, current_user, procurement_id, approval_id, payload
    )


@router.post(
    "/procurement/{procurement_id}/approvals/{approval_id}/reject",
    response_model=ProcurementRecordResponse,
    summary="Reject procurement approval task",
)
def reject_procurement_task(
    procurement_id: str,
    approval_id: str,
    comments: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = ProcurementApprovalActionRequest(action="REJECT", comments=comments)
    return ProcurementContractService.record_approval_action(
        db, current_user, procurement_id, approval_id, payload
    )


@router.post(
    "/procurement/{procurement_id}/contract",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create public procurement contract from approved procurement record",
)
@router.post(
    "/procurement/{procurement_id}/contracts",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create public procurement contract from approved procurement record (contracts alias)",
)
def create_contract(
    procurement_id: str,
    payload: ContractCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.create_contract_from_procurement(
        db, current_user, procurement_id, payload
    )


@router.post(
    "/procurement/{procurement_id}/complete",
    response_model=ProcurementRecordResponse,
    summary="Mark procurement completed once contract and milestones are settled",
)
def complete_procurement(
    procurement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.complete_procurement(db, current_user, procurement_id)


@router.get(
    "/procurement/{procurement_id}/traceability",
    response_model=ProcurementTraceabilityResponse,
    summary="Get 10-stage end-to-end GovInnovate traceability timeline",
)
def get_traceability(
    procurement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    return ProcurementContractService.build_traceability(db, current_user, procurement_id)
