import math
from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.procurement import (
    ProcurementDecision,
    ProcurementRecord,
    Contract,
    PaymentTranche,
    Invoice,
)


class ProcurementCalculationService:
    """
    Deterministic mathematical calculations and code generation
    for Step 8: Procurement, Contracts & Milestone Payments.
    """

    @staticmethod
    def validate_milestones_sum(
        percentages: List[float],
        amounts: List[float],
        contract_value: float,
        tolerance: float = 0.01,
    ) -> Tuple[bool, str]:
        """
        Validates that:
        1. All milestone percentages strictly sum to 100.0%
        2. All milestone amounts strictly sum to the approved contract_value
        3. No negative or zero values
        """
        if not percentages or not amounts or len(percentages) != len(amounts):
            return False, "Milestone counts and amount counts must be equal and non-empty."

        if contract_value <= 0:
            return False, "Contract value must be strictly greater than zero."

        for i, (pct, amt) in enumerate(zip(percentages, amounts), 1):
            if pct <= 0:
                return False, f"Milestone #{i} percentage must be greater than 0%."
            if amt <= 0:
                return False, f"Milestone #{i} amount must be greater than 0."

        total_pct = sum(percentages)
        if abs(total_pct - 100.0) > tolerance:
            return False, f"Contract milestone percentages must sum to 100% (Current sum: {total_pct:.2f}%)."

        total_amt = sum(amounts)
        if abs(total_amt - contract_value) > tolerance:
            return False, (
                f"Milestone amounts must equal contract value of ₹{contract_value:,.2f} "
                f"(Current sum: ₹{total_amt:,.2f})."
            )

        return True, "Valid"

    @staticmethod
    def calculate_invoice_total(base_amount: float, tax_amount: float) -> float:
        """
        Deterministic calculation: total_amount = base_amount + tax_amount.
        Validates non-negative constraints.
        """
        if base_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Base invoice amount must be strictly greater than zero.",
            )
        if tax_amount < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tax amount cannot be negative.",
            )
        return round(base_amount + tax_amount, 2)

    # --------------------------------------------------------------------------
    # Sequential Identifier Generators
    # --------------------------------------------------------------------------

    @staticmethod
    def generate_procurement_code(db: Session) -> str:
        """Generates human-readable sequential code: PROC-YYYY-XXXX"""
        year = datetime.now(timezone.utc).year
        prefix = f"PROC-{year}-"
        count = db.query(func.count(ProcurementRecord.id)).filter(
            ProcurementRecord.procurement_code.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def generate_decision_code(db: Session) -> str:
        """Generates human-readable sequential code: PDEC-YYYY-XXXX"""
        year = datetime.now(timezone.utc).year
        prefix = f"PDEC-{year}-"
        count = db.query(func.count(ProcurementDecision.id)).filter(
            ProcurementDecision.procurement_code.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def generate_contract_code(db: Session) -> str:
        """Generates human-readable sequential code: CONTRACT-YYYY-XXXX"""
        year = datetime.now(timezone.utc).year
        prefix = f"CONTRACT-{year}-"
        count = db.query(func.count(Contract.id)).filter(
            Contract.contract_code.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def generate_invoice_number(db: Session) -> str:
        """Generates human-readable sequential code: INV-YYYY-XXXX"""
        year = datetime.now(timezone.utc).year
        prefix = f"INV-{year}-"
        count = db.query(func.count(Invoice.id)).filter(
            Invoice.invoice_number.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def generate_tranche_code(db: Session) -> str:
        """Generates human-readable sequential code: TRN-YYYY-XXXX"""
        year = datetime.now(timezone.utc).year
        prefix = f"TRN-{year}-"
        count = db.query(func.count(PaymentTranche.id)).filter(
            PaymentTranche.tranche_code.like(f"{prefix}%")
        ).scalar() or 0
        return f"{prefix}{count + 1:04d}"
