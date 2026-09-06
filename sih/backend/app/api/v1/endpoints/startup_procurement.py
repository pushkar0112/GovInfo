import os
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, UploadFile, File, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.procurement import Contract, Invoice, PaymentTranche, ProcurementRecord
from app.core.security import UserRole
from app.api.deps import (
    get_current_user,
    require_startup,
)
from app.schemas.procurement_contracts import (
    ContractResponse,
    ContractMilestoneResponse,
    InvoiceResponse,
    ProcurementRecordResponse,
)
from app.services.procurement_contract_service import ProcurementContractService

router = APIRouter()


@router.get(
    "/procurement",
    response_model=List[ProcurementRecordResponse],
    summary="List procurement transitions awarded to authenticated startup",
)
def list_startup_procurements(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.list_procurements(db, current_user)


@router.get(
    "/contracts",
    response_model=List[ContractResponse],
    summary="List public contracts awarded to authenticated startup",
)
def list_startup_contracts(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.list_contracts(db, current_user, status)


@router.get(
    "/contracts/{contract_id}",
    response_model=ContractResponse,
    summary="Get startup contract workspace with milestone roadmap",
)
def get_startup_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.get_contract(db, current_user, contract_id)


@router.post(
    "/contracts/{contract_id}/milestones/{milestone_id}/submit",
    response_model=ContractMilestoneResponse,
    summary="Submit milestone completion report by startup",
)
def submit_contract_milestone_completion(
    contract_id: str,
    milestone_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.submit_contract_milestone(
        db, current_user, contract_id, milestone_id, payload
    )


@router.post(
    "/invoices",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit tax invoice for an eligible tranche via JSON",
)
def submit_startup_invoice_json(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.submit_startup_invoice_json(
        db, current_user, payload
    )


@router.get(
    "/invoices",
    response_model=List[InvoiceResponse],
    summary="List all invoices submitted by authenticated startup",
)
def list_startup_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    query = db.query(Invoice).filter(Invoice.startup_id == current_user.startup_id)
    if status:
        query = query.filter(Invoice.status == status)
    invoices = query.order_by(Invoice.created_at.desc()).all()
    return [ProcurementContractService._format_invoice_response(inv) for inv in invoices]


@router.post(
    "/payment-tranches/{tranche_id}/invoice",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit invoice against an ELIGIBLE payment tranche with supporting document",
)
def submit_invoice(
    tranche_id: str,
    invoice_number: str = Form(...),
    amount: float = Form(...),
    tax_amount: float = Form(0.0),
    invoice_date: date = Form(...),
    due_date: Optional[date] = Form(None),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_startup),
):
    return ProcurementContractService.submit_startup_invoice(
        db=db,
        current_user=current_user,
        tranche_id=tranche_id,
        invoice_number=invoice_number,
        amount=amount,
        tax_amount=tax_amount,
        invoice_date=invoice_date,
        due_date=due_date,
        description=description,
        file=file,
    )


@router.get(
    "/invoices/{invoice_id}/download",
    summary="Download uploaded invoice document",
)
def download_invoice_document(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv or not inv.file_storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice file not found.")

    # Authorization: Startup owner or government/admin/procurement officer
    if current_user.role == UserRole.STARTUP and inv.startup_id != current_user.startup_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this invoice.")

    file_path = ProcurementContractService.storage_service.get_file_path(inv.file_storage_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical document not found in storage.")

    return FileResponse(
        path=file_path,
        filename=inv.invoice_file or f"invoice_{inv.invoice_number}.pdf",
        media_type="application/octet-stream",
    )
