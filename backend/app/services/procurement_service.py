import hashlib
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.pilot import Pilot, PilotStatus
from app.models.validation import Validation
from app.models.procurement import ProcurementRecord, ProcurementStatus
from app.models.challenge import Challenge, ChallengeStatus
from app.models.audit_log import AuditLog
from app.schemas.procurement import (
    ValidationCreateRequest,
    ValidationResponse,
    ProcurementCreateRequest,
    ProcurementResponse,
)


class ProcurementService:
    """
    Business logic layer for independent 3rd-party validation and direct GeM procurement scale-up.
    """

    @classmethod
    def create_validation(
        cls,
        db: Session,
        current_user: User,
        payload: ValidationCreateRequest,
    ) -> ValidationResponse:
        pilot = db.query(Pilot).filter(Pilot.id == payload.pilot_id).first()
        if not pilot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pilot sandbox not found.",
            )

        existing = db.query(Validation).filter(Validation.pilot_id == payload.pilot_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A validation certificate has already been issued for this pilot.",
            )

        # Generate cryptographic SHA-256 certificate hash for anti-tamper legal compliance
        raw_token = f"{pilot.id}:{payload.independent_agency_name}:{datetime.now(timezone.utc).isoformat()}:{payload.outcomes_satisfied}"
        cert_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        validation = Validation(
            pilot_id=payload.pilot_id,
            validator_id=current_user.id,
            independent_agency_name=payload.independent_agency_name.strip(),
            validation_report_summary=payload.validation_report_summary.strip(),
            outcomes_satisfied=payload.outcomes_satisfied,
            recommended_for_procurement=payload.recommended_for_procurement,
            certificate_hash=cert_hash,
        )
        db.add(validation)

        # Update pilot status
        if payload.outcomes_satisfied and payload.recommended_for_procurement:
            pilot.status = PilotStatus.SUCCESSFULLY_VALIDATED
        else:
            pilot.status = PilotStatus.FAILED_VALIDATION

        audit = AuditLog(
            user_id=current_user.id,
            action="VALIDATION_CERTIFICATE_ISSUED",
            entity_type="Validation",
            entity_id=pilot.id,
            details_json=f'{{"agency": "{payload.independent_agency_name}", "certificate_hash": "{cert_hash}"}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(validation)

        return cls.format_validation_response(validation)

    @classmethod
    def list_validations(cls, db: Session) -> List[ValidationResponse]:
        certs = db.query(Validation).order_by(Validation.created_at.desc()).all()
        return [cls.format_validation_response(v) for v in certs]

    @classmethod
    def get_validation_by_pilot(cls, db: Session, pilot_id: str) -> ValidationResponse:
        v = db.query(Validation).filter(Validation.pilot_id == pilot_id).first()
        if not v:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No validation certificate found for this pilot.",
            )
        return cls.format_validation_response(v)

    @classmethod
    def issue_procurement_order(
        cls,
        db: Session,
        current_user: User,
        payload: ProcurementCreateRequest,
    ) -> ProcurementResponse:
        validation = db.query(Validation).filter(Validation.id == payload.validation_id).first()
        if not validation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Validation record not found.",
            )

        if not validation.recommended_for_procurement or not validation.outcomes_satisfied:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot issue procurement order: Innovation was not certified or recommended by the validator.",
            )

        # Ensure no prior procurement order for this validation
        existing = db.query(ProcurementRecord).filter(ProcurementRecord.validation_id == payload.validation_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A procurement order has already been executed for this validated innovation.",
            )

        pilot = validation.pilot
        dept_id = pilot.application.challenge.department_id
        startup_id = pilot.application.startup_id

        record = ProcurementRecord(
            validation_id=payload.validation_id,
            department_id=dept_id,
            startup_id=startup_id,
            sanction_order_number=payload.sanction_order_number.strip(),
            gem_contract_number=payload.gem_contract_number.strip() if payload.gem_contract_number else None,
            procurement_pathway=payload.procurement_pathway,
            total_order_value=payload.total_order_value,
            status=ProcurementStatus.CONTRACT_EXECUTED,
            order_date=payload.order_date or date.today(),
            notes=payload.notes,
        )
        db.add(record)
        db.flush()

        # Transition challenge status to PROCURED
        pilot.application.challenge.status = ChallengeStatus.PROCURED

        audit = AuditLog(
            user_id=current_user.id,
            action="PROCUREMENT_ORDER_EXECUTED",
            entity_type="ProcurementRecord",
            entity_id=record.id,
            details_json=f'{{"sanction_order": "{record.sanction_order_number}", "order_value": {payload.total_order_value}}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(record)

        return cls.format_procurement_response(record)

    @classmethod
    def list_procurement_records(cls, db: Session) -> List[ProcurementResponse]:
        records = (
            db.query(ProcurementRecord)
            .filter(ProcurementRecord.validation_id.isnot(None))
            .order_by(ProcurementRecord.created_at.desc())
            .all()
        )
        return [cls.format_procurement_response(r) for r in records]

    @staticmethod
    def format_validation_response(v: Validation) -> ValidationResponse:
        p_title = v.pilot.title if v.pilot else None
        st_name = (
            v.pilot.application.startup.company_name
            if v.pilot and v.pilot.application and v.pilot.application.startup
            else None
        )
        dp_name = (
            v.pilot.application.challenge.department.name
            if v.pilot and v.pilot.application and v.pilot.application.challenge and v.pilot.application.challenge.department
            else None
        )

        return ValidationResponse(
            id=v.id,
            pilot_id=v.pilot_id,
            pilot_title=p_title,
            startup_name=st_name,
            department_name=dp_name,
            independent_agency_name=v.independent_agency_name,
            validation_report_summary=v.validation_report_summary,
            outcomes_satisfied=v.outcomes_satisfied,
            recommended_for_procurement=v.recommended_for_procurement,
            certificate_hash=v.certificate_hash or "",
            created_at=v.created_at,
        )

    @staticmethod
    def format_procurement_response(r: ProcurementRecord) -> ProcurementResponse:
        dp_name = r.department.name if r.department else None
        st_name = r.startup.company_name if r.startup else None

        pathway = r.procurement_pathway
        if not pathway and hasattr(r, "pathway") and r.pathway:
            pathway = r.pathway.code
        if hasattr(pathway, "value"):
            pathway = pathway.value

        tot_val = float(r.total_order_value) if r.total_order_value is not None else float(r.estimated_value or 0.0)

        return ProcurementResponse(
            id=r.id,
            validation_id=r.validation_id or "",
            department_id=r.department_id or (r.government_department_id or ""),
            department_name=dp_name,
            startup_id=r.startup_id,
            startup_name=st_name,
            sanction_order_number=r.sanction_order_number,
            gem_contract_number=r.gem_contract_number,
            procurement_pathway=pathway,
            total_order_value=tot_val,
            status=r.status,
            order_date=r.order_date,
            notes=r.notes,
            created_at=r.created_at,
        )
