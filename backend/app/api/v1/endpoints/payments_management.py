from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.procurement import PaymentTranche, Invoice
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_role,
)
from app.schemas.procurement_contracts import (
    PaymentTrancheResponse,
    PaymentTrancheHoldRequest,
    InvoiceResponse,
    InvoiceReviewRequest,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()

require_gov_or_procure = require_role(
    UserRole.GOVERNMENT,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ADMIN,
)


# ------------------------------------------------------------------------------
# Payment Tranches
# ------------------------------------------------------------------------------

@router.get(
    "/payments",
    response_model=List[PaymentTrancheResponse],
    summary="List milestone payment tranches across contracts",
)
def list_all_payment_tranches(
    status: Optional[str] = Query(None),
    contract_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    query = db.query(PaymentTranche)
    if status:
        query = query.filter(PaymentTranche.status == status)
    if contract_id:
        query = query.filter(PaymentTranche.contract_id == contract_id)

    tranches = query.order_by(PaymentTranche.created_at.desc()).all()
    return [ProcurementContractService._format_tranche_response(t) for t in tranches]


@router.post(
    "/payments/{payment_id}/hold",
    response_model=PaymentTrancheResponse,
    summary="Place payment tranche on administrative hold",
)
def hold_payment_tranche(
    payment_id: str,
    payload: PaymentTrancheHoldRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.hold_payment_tranche(db, current_user, payment_id, payload)


@router.post(
    "/payments/{payment_id}/process",
    response_model=PaymentTrancheResponse,
    summary="Transition approved payment tranche to PROCESSING",
)
def process_payment_tranche(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.process_and_pay_tranche(
        db, current_user, payment_id, action="PROCESS"
    )


@router.post(
    "/payments/{payment_id}/mark-paid",
    response_model=PaymentTrancheResponse,
    summary="Formally confirm financial disbursement (transitions status to PAID)",
)
def mark_payment_paid(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.process_and_pay_tranche(
        db, current_user, payment_id, action="MARK_PAID"
    )


@router.post(
    "/tranches/{tranche_id}/pay",
    response_model=PaymentTrancheResponse,
    summary="Record payment disbursement for tranche with transaction reference",
)
def pay_payment_tranche(
    tranche_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.record_payment_disbursement(
        db, current_user, tranche_id, payload
    )


# ------------------------------------------------------------------------------
# Invoices Review
# ------------------------------------------------------------------------------

@router.get(
    "/invoices",
    response_model=List[InvoiceResponse],
    summary="List startup invoices for review and sanction",
)
def list_invoices(
    status: Optional[str] = Query(None),
    contract_id: Optional[str] = Query(None),
    startup_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    query = db.query(Invoice)
    if status:
        query = query.filter(Invoice.status == status)
    if contract_id:
        query = query.filter(Invoice.contract_id == contract_id)
    if startup_id:
        query = query.filter(Invoice.startup_id == startup_id)

    invoices = query.order_by(Invoice.created_at.desc()).all()
    return [ProcurementContractService._format_invoice_response(inv) for inv in invoices]


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get invoice details",
)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    return ProcurementContractService._format_invoice_response(inv)


@router.post(
    "/invoices/{invoice_id}/review",
    response_model=InvoiceResponse,
    summary="Review submitted invoice for approval or rejection",
)
def review_invoice_submission(
    invoice_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    return ProcurementContractService.review_invoice(
        db, current_user, invoice_id, payload
    )


@router.post(
    "/invoices/{invoice_id}/approve",
    response_model=InvoiceResponse,
    summary="Approve startup invoice for payment disbursement",
)
def approve_invoice(
    invoice_id: str,
    review_comments: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = InvoiceReviewRequest(action="APPROVE", review_comments=review_comments)
    return ProcurementContractService.review_invoice(db, current_user, invoice_id, payload)


@router.post(
    "/invoices/{invoice_id}/reject",
    response_model=InvoiceResponse,
    summary="Reject startup invoice with mandatory reason",
)
def reject_invoice(
    invoice_id: str,
    rejection_reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gov_or_procure),
):
    payload = InvoiceReviewRequest(action="REJECT", rejection_reason=rejection_reason)
    return ProcurementContractService.review_invoice(db, current_user, invoice_id, payload)
