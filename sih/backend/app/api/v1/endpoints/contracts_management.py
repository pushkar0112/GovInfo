from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_role,
    require_authenticated_user,
)
from app.schemas.procurement_contracts import (
    ContractResponse,
    ContractSuspendRequest,
    ContractTerminateRequest,
    ContractMilestoneResponse,
    ContractMilestoneReviewRequest,
    PaymentTrancheResponse,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()

require_gov_or_procure = require_role(
    UserRole.GOVERNMENT,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ADMIN,
)


@router.get(
    "/contracts",
    response_model=List[ContractResponse],
    summary="List departmental and platform contracts",
)
def list_contracts(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.list_contracts(db, current_user, status)


@router.get(
    "/contracts/{contract_id}",
    response_model=ContractResponse,
    summary="Get comprehensive contract dossier",
)
def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.get_contract(db, current_user, contract_id)


@router.post(
    "/contracts/{contract_id}/activate",
    response_model=ContractResponse,
    summary="Activate approved contract for operational execution",
)
def activate_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.activate_contract(db, current_user, contract_id)


@router.post(
    "/contracts/{contract_id}/suspend",
    response_model=ContractResponse,
    summary="Temporarily suspend contract with reason",
)
def suspend_contract(
    contract_id: str,
    payload: ContractSuspendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.suspend_contract(db, current_user, contract_id, payload)


@router.post(
    "/contracts/{contract_id}/resume",
    response_model=ContractResponse,
    summary="Resume active execution of suspended contract",
)
def resume_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.resume_contract(db, current_user, contract_id)


@router.post(
    "/contracts/{contract_id}/complete",
    response_model=ContractResponse,
    summary="Formally close out and complete contract",
)
def complete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.complete_contract(db, current_user, contract_id)


@router.post(
    "/contracts/{contract_id}/terminate",
    response_model=ContractResponse,
    summary="Terminate contract with statutory justification",
)
def terminate_contract(
    contract_id: str,
    payload: ContractTerminateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.terminate_contract(db, current_user, contract_id, payload)


# ------------------------------------------------------------------------------
# Contract Milestones
# ------------------------------------------------------------------------------

@router.get(
    "/contracts/{contract_id}/milestones",
    response_model=List[ContractMilestoneResponse],
    summary="List contract milestones",
)
def list_contract_milestones(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    contract = ProcurementContractService.get_contract(db, current_user, contract_id)
    return contract.milestones


@router.post(
    "/contracts/{contract_id}/milestones/{milestone_id}/review",
    response_model=ContractMilestoneResponse,
    summary="Review contract milestone with acceptance or rejection",
)
def review_contract_milestone_action(
    contract_id: str,
    milestone_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    act = payload.get("action") or payload.get("status") or "ACCEPT"
    remarks = payload.get("acceptance_notes") or payload.get("remarks")
    rej = payload.get("rejection_reason") or remarks
    req = ContractMilestoneReviewRequest(
        action=act,
        remarks=remarks,
        rejection_reason=rej,
    )
    return ProcurementContractService.review_contract_milestone(
        db, current_user, contract_id, milestone_id, req
    )


@router.post(
    "/contracts/{contract_id}/milestones/{milestone_id}/accept",
    response_model=ContractMilestoneResponse,
    summary="Accept contract milestone (transitions linked payment tranche to ELIGIBLE)",
)
def accept_contract_milestone(
    contract_id: str,
    milestone_id: str,
    remarks: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = ContractMilestoneReviewRequest(action="ACCEPT", remarks=remarks)
    return ProcurementContractService.review_contract_milestone(
        db, current_user, contract_id, milestone_id, payload
    )


@router.post(
    "/contracts/{contract_id}/milestones/{milestone_id}/reject",
    response_model=ContractMilestoneResponse,
    summary="Reject contract milestone with specific feedback",
)
def reject_contract_milestone(
    contract_id: str,
    milestone_id: str,
    rejection_reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = ContractMilestoneReviewRequest(action="REJECT", rejection_reason=rejection_reason)
    return ProcurementContractService.review_contract_milestone(
        db, current_user, contract_id, milestone_id, payload
    )


@router.get(
    "/contracts/{contract_id}/payments",
    response_model=List[PaymentTrancheResponse],
    summary="List payment tranches tied to contract milestones",
)
def list_contract_payment_tranches(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    contract = ProcurementContractService.get_contract(db, current_user, contract_id)
    return contract.payment_tranches
