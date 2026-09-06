from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.procurement import (
    ProcurementRecord,
    ProcurementApproval,
    Contract,
    Invoice,
    ApprovalStatus,
    InvoiceStatus,
    ContractStatus,
    ProcurementRecordStatus,
)
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_role,
)
from app.schemas.procurement_contracts import (
    ProcurementRecordResponse,
    ProcurementApprovalResponse,
    ContractResponse,
    InvoiceResponse,
    ProcurementDashboardStatsResponse,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()

require_procurement_officer = require_role(
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ADMIN,
)


@router.get(
    "/dashboard",
    summary="Procurement Officer Portal command center data",
)
def get_procurement_officer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_procurement_officer),
) -> Dict[str, Any]:
    stats = ProcurementContractService.get_dashboard_stats(db, current_user)

    # Pending approvals requiring action
    pending_approvals = (
        db.query(ProcurementApproval)
        .filter(ProcurementApproval.status == ApprovalStatus.PENDING.value)
        .order_by(ProcurementApproval.created_at.desc())
        .limit(10)
        .all()
    )

    # Active contracts
    active_contracts = (
        db.query(Contract)
        .filter(Contract.status == ContractStatus.ACTIVE.value)
        .order_by(Contract.created_at.desc())
        .limit(10)
        .all()
    )

    # Invoices awaiting review
    invoices_pending = (
        db.query(Invoice)
        .filter(Invoice.status.in_([InvoiceStatus.SUBMITTED.value, InvoiceStatus.UNDER_REVIEW.value]))
        .order_by(Invoice.created_at.desc())
        .limit(10)
        .all()
    )

    # Recent procurements
    recent_procurements = (
        db.query(ProcurementRecord)
        .order_by(ProcurementRecord.created_at.desc())
        .limit(10)
        .all()
    )

    # Recent contracts
    recent_contracts = (
        db.query(Contract)
        .order_by(Contract.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "stats": stats.model_dump(),
        "recent_procurements": [
            ProcurementContractService._format_procurement_response(p).model_dump()
            for p in recent_procurements
        ],
        "recent_contracts": [
            ProcurementContractService._format_contract_response(c).model_dump()
            for c in recent_contracts
        ],
        "pending_approvals": [
            {
                "id": a.id,
                "procurement_id": a.procurement_id,
                "procurement_code": a.procurement.procurement_code if a.procurement else None,
                "procurement_title": a.procurement.title if a.procurement else None,
                "approval_type": a.approval_type,
                "status": a.status,
                "created_at": a.created_at,
            }
            for a in pending_approvals
        ],
        "active_contracts": [
            ProcurementContractService._format_contract_response(c).model_dump()
            for c in active_contracts
        ],
        "invoices_awaiting_review": [
            ProcurementContractService._format_invoice_response(inv).model_dump()
            for inv in invoices_pending
        ],
    }
