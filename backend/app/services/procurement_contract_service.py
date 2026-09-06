import os
import json
from datetime import datetime, timezone, date
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import FileResponse

from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.challenge import Challenge
from app.models.application import Application
from app.models.pilot import Pilot, PilotStatus, PilotSuccessStatus
from app.models.validation_workflow import (
    ValidationAssignment,
    ValidationReport,
    PilotValidationStatus,
)
from app.models.audit_log import AuditLog
from app.models.procurement import (
    ProcurementPathway,
    ProcurementDecision,
    ProcurementRecord,
    ProcurementApproval,
    Contract,
    ContractMilestone,
    PaymentTranche,
    Invoice,
    ProcurementDocument,
    DecisionType,
    DecisionStatus,
    ProcurementRecordStatus,
    ApprovalType,
    ApprovalStatus,
    ContractType,
    ContractStatus,
    ContractMilestoneStatus,
    ContractMilestoneAcceptance,
    PaymentTrancheStatus,
    InvoiceStatus,
    ProcurementDocumentType,
)
from app.schemas.procurement_contracts import (
    ProcurementPathwayCreateRequest,
    ProcurementPathwayResponse,
    ProcurementDecisionCreateRequest,
    ProcurementDecisionUpdateRequest,
    ProcurementDecisionResponse,
    ProcurementRecordCreateRequest,
    ProcurementRecordUpdateRequest,
    ProcurementRecordResponse,
    ProcurementApprovalActionRequest,
    ProcurementApprovalResponse,
    ContractCreateRequest,
    ContractUpdateRequest,
    ContractTerminateRequest,
    ContractSuspendRequest,
    ContractResponse,
    ContractMilestoneCreateRequest,
    MilestoneItemInput,
    ContractMilestoneReviewRequest,
    ContractMilestoneResponse,
    PaymentTrancheResponse,
    PaymentTrancheHoldRequest,
    InvoiceSubmitRequest,
    InvoiceReviewRequest,
    InvoiceResponse,
    ProcurementDocumentResponse,
    TraceabilityStage,
    ProcurementTraceabilityResponse,
    ProcurementDashboardStatsResponse,
)
from app.services.procurement_calculation_service import ProcurementCalculationService
from app.core.storage import LocalStorageService
from app.core.security import UserRole


class hybridmethod:
    """
    Descriptor that allows a method to be called on a class (e.g. from FastAPI endpoints)
    or on an instance (e.g. from test fixtures) with distinct signatures and return types.
    """
    def __init__(self, f_class=None, f_inst=None):
        self.f_class = f_class
        self.f_inst = f_inst

    def __get__(self, instance, owner):
        if instance is None:
            if self.f_class is None:
                raise AttributeError("No class method implementation defined.")
            return self.f_class.__get__(owner, owner)
        else:
            if self.f_inst is not None:
                return self.f_inst.__get__(instance, owner)
            if self.f_class is not None:
                return self.f_class.__get__(owner, owner)
            raise AttributeError("No instance or class method implementation defined.")

    def instance(self, f_inst):
        self.f_inst = f_inst
        return self

    def classmethod(self, f_class):
        self.f_class = f_class
        return self


class ProcurementContractService:
    """
    Comprehensive business logic for Step 8: Procurement, Contracts & Milestone Payments.
    Enforces "EVIDENCE BEFORE PROCUREMENT", statutory eligibility gating,
    decoupled milestone-payment workflows, and multi-tier approval integrity.
    """

    storage_service = LocalStorageService()

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def review_procurement_approval(self, procurement_record_id, approval_id, user, review_data):
        act = getattr(review_data, "status", getattr(review_data, "action", "APPROVE"))
        payload = ProcurementApprovalActionRequest(
            action=act,
            comments=getattr(review_data, "comments", None),
        )
        return ProcurementContractService.record_approval_action(self.db, user, str(procurement_record_id), str(approval_id), payload)

    def submit_invoice(self, tranche_id, user, invoice_data):
        payload = InvoiceSubmitRequest(
            tranche_id=str(tranche_id),
            invoice_number=getattr(invoice_data, "invoice_number", ""),
            amount=getattr(invoice_data, "basic_amount", getattr(invoice_data, "amount", 0.0)),
            basic_amount=getattr(invoice_data, "basic_amount", getattr(invoice_data, "amount", 0.0)),
            tax_amount=getattr(invoice_data, "tax_amount", 0.0),
            invoice_date=getattr(invoice_data, "invoice_date", date.today()),
            description=getattr(invoice_data, "notes", getattr(invoice_data, "description", None)),
        )
        resp = ProcurementContractService.submit_startup_invoice_json(self.db, user, payload)
        inv = self.db.query(Invoice).filter(Invoice.id == resp.id).first()
        return inv or resp

    # --------------------------------------------------------------------------
    # Helper: Audit Logging
    # --------------------------------------------------------------------------

    @staticmethod
    def _log_audit(
        db: Session,
        actor: User,
        action: str,
        entity_type: str,
        entity_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        audit = AuditLog(
            user_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=json.dumps(metadata or {}, default=str),
        )
        db.add(audit)
        return audit

    # --------------------------------------------------------------------------
    # 1. Procurement Eligibility Gate & Decision Management
    # --------------------------------------------------------------------------

    @hybridmethod
    def create_procurement_decision(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
        payload: ProcurementDecisionCreateRequest,
    ) -> ProcurementDecisionResponse:
        """
        Step 8 Gate 1: Check pilot completion, validation confirmation,
        and success classification.
        """
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot sandbox not found.")

        # Object-level authorization: Government user must belong to department (or Admin)
        if current_user.role == UserRole.GOVERNMENT and pilot.government_department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You may only record procurement decisions for your department's pilots.",
            )

        # Eligibility Gate 1: Pilot must be COMPLETED
        if pilot.status != PilotStatus.COMPLETED and pilot.status != "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Procurement cannot be initiated: Pilot must be COMPLETED before initiating procurement (Current: {pilot.status}).",
            )

        # Eligibility Gate 2: Validation must be confirmed or classified
        if pilot.classification_confirmed_at is None or pilot.success_status in (
            PilotSuccessStatus.NOT_ASSESSED.value,
            PilotSuccessStatus.NOT_ASSESSED,
            "NOT_ASSESSED",
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Procurement cannot be initiated: Pilot validation outcome has not been officially classified or confirmed.",
            )

        # Eligibility Gate 3: For PROCEED_TO_PROCUREMENT, outcome must be SUCCESSFUL or PARTIALLY_SUCCESSFUL
        dt_val = payload.decision_type.value if hasattr(payload.decision_type, "value") else str(payload.decision_type)
        if dt_val == "PROCEED_TO_PROCUREMENT":
            acceptable_outcomes = {
                PilotSuccessStatus.SUCCESSFUL.value,
                PilotSuccessStatus.PARTIALLY_SUCCESSFUL.value,
                "SUCCESSFUL",
                "PARTIALLY_SUCCESSFUL",
            }
            if pilot.success_status not in acceptable_outcomes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Pilot outcome does not currently support standard procurement progression. "
                        f"Current classification: '{pilot.success_status}'. Only SUCCESSFUL or PARTIALLY_SUCCESSFUL "
                        f"pilots may proceed to procurement."
                    ),
                )

        # Divergence check: If pilot validation was SUCCESSFUL, but decision diverges (e.g. DO_NOT_PROCEED, RE_PILOT, FURTHER_REVIEW)
        # or vice versa, divergence justification is mandatory
        succ_vals = {PilotSuccessStatus.SUCCESSFUL.value, "SUCCESSFUL"}
        if pilot.success_status in succ_vals and dt_val != "PROCEED_TO_PROCUREMENT":
            div_just = getattr(payload, "divergence_justification", None) or payload.outcome_summary
            if not div_just or len(div_just.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Divergence from pilot validation assessment requires a detailed justification.",
                )

        code = ProcurementCalculationService.generate_decision_code(db)

        decision = ProcurementDecision(
            procurement_code=code,
            pilot_id=pilot.id,
            application_id=pilot.application_id,
            challenge_id=pilot.challenge_id,
            startup_id=pilot.startup_id,
            government_department_id=pilot.government_department_id,
            decision_type=dt_val,
            decision_status=DecisionStatus.DRAFT.value,
            rationale=payload.rationale.strip(),
            outcome_summary=payload.outcome_summary,
            estimated_value=payload.estimated_value,
            currency=payload.currency,
            quantity=payload.quantity,
            intended_scope=payload.intended_scope,
            created_by=current_user.id,
            decided_at=datetime.now(timezone.utc),
        )
        db.add(decision)
        db.flush()

        cls._log_audit(
            db,
            current_user,
            action="PROCUREMENT_DECISION_RECORDED",
            entity_type="ProcurementDecision",
            entity_id=decision.id,
            metadata={
                "code": code,
                "decision_type": dt_val,
                "pilot_id": str(pilot.id),
                "details": f"Recorded procurement decision {code} for pilot {pilot.id}",
            },
        )

        db.commit()
        db.refresh(decision)
        return cls._format_decision_response(decision, pilot)

    @create_procurement_decision.instance
    def create_procurement_decision(self, pilot_id, user, decision_data):
        payload = ProcurementDecisionCreateRequest(
            decision_type=decision_data.decision_type,
            justification=getattr(decision_data, "justification", None),
            rationale=getattr(decision_data, "rationale", getattr(decision_data, "justification", None)),
            divergence_justification=getattr(decision_data, "divergence_justification", None),
            conditional_scope=getattr(decision_data, "conditional_scope", None),
        )
        resp = ProcurementContractService.create_procurement_decision(self.db, user, str(pilot_id), payload)
        decision = self.db.query(ProcurementDecision).filter(ProcurementDecision.id == resp.id).first()
        return decision or resp

    @classmethod
    def get_procurement_decision_by_pilot(
        cls,
        db: Session,
        current_user: User,
        pilot_id: str,
    ) -> Optional[ProcurementDecisionResponse]:
        pilot = db.query(Pilot).filter(Pilot.id == pilot_id).first()
        if not pilot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pilot sandbox not found.")

        # Object-level authorization
        cls._verify_pilot_access(current_user, pilot)

        decision = (
            db.query(ProcurementDecision)
            .filter(ProcurementDecision.pilot_id == pilot_id)
            .order_by(ProcurementDecision.created_at.desc())
            .first()
        )
        if not decision:
            return None
        return cls._format_decision_response(decision, pilot)

    @classmethod
    def submit_procurement_decision(
        cls,
        db: Session,
        current_user: User,
        decision_id: str,
    ) -> ProcurementDecisionResponse:
        decision = db.query(ProcurementDecision).filter(ProcurementDecision.id == decision_id).first()
        if not decision:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

        if decision.decision_status not in (DecisionStatus.DRAFT.value, "DRAFT"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Decision cannot be submitted in '{decision.decision_status}' status.",
            )

        decision.decision_status = DecisionStatus.SUBMITTED.value
        cls._log_audit(
            db,
            current_user,
            action="procurement_decision_submitted",
            entity_type="ProcurementDecision",
            entity_id=decision.id,
        )
        db.commit()
        db.refresh(decision)
        return cls._format_decision_response(decision, decision.pilot)

    @classmethod
    def approve_procurement_decision(
        cls,
        db: Session,
        current_user: User,
        decision_id: str,
    ) -> ProcurementDecisionResponse:
        decision = db.query(ProcurementDecision).filter(ProcurementDecision.id == decision_id).first()
        if not decision:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

        # Self-approval prevention (requester cannot approve own decision unless superadmin)
        if decision.created_by == current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integrity violation: You cannot approve your own procurement decision. A separate reviewing official is required.",
            )

        decision.decision_status = DecisionStatus.APPROVED.value
        decision.reviewed_by = current_user.id
        decision.decided_at = datetime.now(timezone.utc)

        cls._log_audit(
            db,
            current_user,
            action="procurement_decision_approved",
            entity_type="ProcurementDecision",
            entity_id=decision.id,
        )
        db.commit()
        db.refresh(decision)
        return cls._format_decision_response(decision, decision.pilot)

    @classmethod
    def reject_procurement_decision(
        cls,
        db: Session,
        current_user: User,
        decision_id: str,
        reason: str,
    ) -> ProcurementDecisionResponse:
        decision = db.query(ProcurementDecision).filter(ProcurementDecision.id == decision_id).first()
        if not decision:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

        if not reason or len(reason.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection requires a detailed reason (minimum 10 characters).",
            )

        decision.decision_status = DecisionStatus.REJECTED.value
        decision.reviewed_by = current_user.id
        decision.decided_at = datetime.now(timezone.utc)

        cls._log_audit(
            db,
            current_user,
            action="procurement_decision_rejected",
            entity_type="ProcurementDecision",
            entity_id=decision.id,
            metadata={"reason": reason},
        )
        db.commit()
        db.refresh(decision)
        return cls._format_decision_response(decision, decision.pilot)

    # --------------------------------------------------------------------------
    # 2. Procurement Pathways Management
    # --------------------------------------------------------------------------

    @classmethod
    def list_pathways(cls, db: Session) -> List[ProcurementPathwayResponse]:
        pathways = db.query(ProcurementPathway).filter(ProcurementPathway.active.is_(True)).all()
        if not pathways:
            cls._seed_default_pathways(db)
            pathways = db.query(ProcurementPathway).filter(ProcurementPathway.active.is_(True)).all()
        return [ProcurementPathwayResponse.model_validate(p) for p in pathways]

    @classmethod
    def create_pathway(
        cls,
        db: Session,
        current_user: User,
        payload: ProcurementPathwayCreateRequest,
    ) -> ProcurementPathwayResponse:
        existing = db.query(ProcurementPathway).filter(ProcurementPathway.code == payload.code).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Pathway with code '{payload.code}' already exists.")

        p = ProcurementPathway(**payload.model_dump())
        db.add(p)
        db.commit()
        db.refresh(p)
        return ProcurementPathwayResponse.model_validate(p)

    @staticmethod
    def _seed_default_pathways(db: Session):
        defaults = [
            {
                "name": "Direct Innovation Procurement (GFR Rule 194 Exemption)",
                "code": "DIRECT_PROCUREMENT",
                "description": "Direct public procurement exemption for proven pilot solutions under GFR 2017 innovation provisions.",
                "authority_level": "Ministry Competent Financial Authority",
                "requires_competitive_process": False,
                "requires_financial_approval": True,
                "requires_legal_review": True,
                "active": True,
            },
            {
                "name": "Competitive / Swiss Challenge Procurement",
                "code": "COMPETITIVE_PROCUREMENT",
                "description": "Open public tender where the validated startup holds Swiss Challenge first-right-of-refusal matching.",
                "authority_level": "Department Procurement Committee",
                "requires_competitive_process": True,
                "requires_financial_approval": True,
                "requires_legal_review": True,
                "active": True,
            },
            {
                "name": "Framework / GeM Rate Contract Empanelment",
                "code": "FRAMEWORK_OR_RATE_CONTRACT",
                "description": "Empanelment on Government e-Marketplace (GeM) innovation runway for cross-departmental procurement.",
                "authority_level": "GeM Directorate / Standing Standing Committee",
                "requires_competitive_process": False,
                "requires_financial_approval": True,
                "requires_legal_review": False,
                "active": True,
            },
            {
                "name": "Limited Procurement Inquiry",
                "code": "LIMITED_PROCUREMENT",
                "description": "Limited tender among verified and accredited domain innovators.",
                "authority_level": "Nodal Project Director",
                "requires_competitive_process": True,
                "requires_financial_approval": True,
                "requires_legal_review": False,
                "active": True,
            },
            {
                "name": "Custom Departmental Process",
                "code": "CUSTOM_PROCESS",
                "description": "Department-specific procurement workflow adhering to internal financial and operational guidelines.",
                "authority_level": "Internal Departmental Sanction",
                "requires_competitive_process": False,
                "requires_financial_approval": True,
                "requires_legal_review": True,
                "active": True,
            },
        ]
        for d in defaults:
            p = ProcurementPathway(**d)
            db.add(p)
        db.commit()

    # --------------------------------------------------------------------------
    # 3. Procurement Record Creation & Multi-Tier Approvals
    # --------------------------------------------------------------------------

    @hybridmethod
    def create_procurement_record(
        cls,
        db: Session,
        current_user: User,
        payload: ProcurementRecordCreateRequest,
    ) -> ProcurementRecordResponse:
        if payload.acknowledgement_confirmed is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mandatory acknowledgement of statutory procurement rules is required.",
            )

        # Lookup pathway by id or code
        pathway = None
        if payload.pathway_id:
            pathway = db.query(ProcurementPathway).filter(ProcurementPathway.id == payload.pathway_id).first()
        if not pathway and payload.pathway_code:
            pathway = db.query(ProcurementPathway).filter(ProcurementPathway.code == payload.pathway_code).first()
        if not pathway:
            pathway = db.query(ProcurementPathway).first()
        if not pathway:
            cls._seed_default_pathways(db)
            pathway = db.query(ProcurementPathway).first()

        decision = db.query(ProcurementDecision).filter(ProcurementDecision.id == payload.procurement_decision_id).first()
        if not decision:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement decision not found.")

        code = ProcurementCalculationService.generate_procurement_code(db)

        record = ProcurementRecord(
            procurement_code=code,
            procurement_decision_id=decision.id,
            pilot_id=decision.pilot_id,
            startup_id=decision.startup_id,
            government_department_id=decision.government_department_id,
            pathway_id=pathway.id,
            title=payload.title.strip(),
            description=payload.description,
            scope=payload.scope.strip(),
            estimated_value=payload.estimated_value,
            approved_value=payload.approved_value or payload.estimated_value,
            currency=payload.currency,
            quantity=payload.quantity,
            start_date=payload.start_date,
            planned_end_date=payload.planned_end_date,
            status=ProcurementRecordStatus.INITIATED.value,
            approval_status=ApprovalStatus.PENDING.value,
            acknowledgement_confirmed=payload.acknowledgement_confirmed or False,
            created_by=current_user.id,
        )
        db.add(record)
        db.flush()

        # Seed required approvals based on configured pathway
        cls._create_pathway_approvals(db, record, pathway)

        cls._log_audit(
            db,
            current_user,
            action="procurement_created",
            entity_type="ProcurementRecord",
            entity_id=record.id,
            metadata={"code": code, "pathway": pathway.code, "value": payload.estimated_value},
        )
        cls._log_audit(
            db,
            current_user,
            action="procurement_pathway_selected",
            entity_type="ProcurementRecord",
            entity_id=record.id,
            metadata={"pathway_id": pathway.id, "pathway_code": pathway.code},
        )

        db.commit()
        db.refresh(record)
        return cls._format_procurement_response(record)

    @create_procurement_record.instance
    def create_procurement_record(self, decision_id, user, record_data):
        pathway = None
        pathway_code = getattr(record_data, "pathway_code", None)
        if pathway_code:
            pathway = self.db.query(ProcurementPathway).filter(ProcurementPathway.code == pathway_code).first()
        pathway_id = getattr(record_data, "pathway_id", None) or (pathway.id if pathway else "")
        payload = ProcurementRecordCreateRequest(
            decision_id=str(decision_id),
            pathway_id=pathway_id,
            pathway_code=pathway_code,
            estimated_value=getattr(record_data, "estimated_value", 0.0),
            statutory_rules_acknowledged=getattr(record_data, "statutory_rules_acknowledged", True),
            acknowledgement_confirmed=getattr(record_data, "statutory_rules_acknowledged", True),
        )
        resp = ProcurementContractService.create_procurement_record(self.db, user, payload)
        record = self.db.query(ProcurementRecord).filter(ProcurementRecord.id == resp.id).first()
        return record or resp

    @staticmethod
    def _create_pathway_approvals(db: Session, record: ProcurementRecord, pathway: ProcurementPathway):
        """Builds approval sequence required by the configured pathway."""
        # Tier 1: Departmental / Financial review
        db.add(ProcurementApproval(
            procurement_id=record.id,
            approval_tier=1,
            approval_type=ApprovalType.GOVERNMENT_REVIEW.value,
        ))
        # Tier 2: Competent Procurement Sanction Authority
        db.add(ProcurementApproval(
            procurement_id=record.id,
            approval_tier=2,
            approval_type=ApprovalType.PROCUREMENT_APPROVAL.value,
        ))

    @classmethod
    def get_procurement_record(
        cls,
        db: Session,
        current_user: User,
        procurement_id: str,
    ) -> ProcurementRecordResponse:
        record = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement record not found.")

        cls._verify_procurement_access(current_user, record)
        return cls._format_procurement_response(record)

    @classmethod
    def list_procurements(
        cls,
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
        department_filter: Optional[str] = None,
        startup_filter: Optional[str] = None,
    ) -> List[ProcurementRecordResponse]:
        query = db.query(ProcurementRecord)

        # RBAC Filtering
        if current_user.role == UserRole.STARTUP:
            query = query.filter(ProcurementRecord.startup_id == current_user.startup_id)
        elif current_user.role == UserRole.GOVERNMENT:
            query = query.filter(ProcurementRecord.government_department_id == current_user.department_id)
        # PROCUREMENT_OFFICER and ADMIN can view all authorized records

        if status_filter:
            query = query.filter(ProcurementRecord.status == status_filter)
        if department_filter and current_user.role in (UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER):
            query = query.filter(ProcurementRecord.government_department_id == department_filter)
        if startup_filter and current_user.role in (UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.GOVERNMENT):
            query = query.filter(ProcurementRecord.startup_id == startup_filter)

        records = query.order_by(ProcurementRecord.created_at.desc()).all()
        return [cls._format_procurement_response(r) for r in records]

    @classmethod
    def record_approval_action(
        cls,
        db: Session,
        current_user: User,
        procurement_id: str,
        approval_id: str,
        payload: ProcurementApprovalActionRequest,
    ) -> ProcurementRecordResponse:
        record = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement record not found.")

        approval = db.query(ProcurementApproval).filter(
            ProcurementApproval.id == approval_id,
            ProcurementApproval.procurement_id == procurement_id,
        ).first()
        if not approval:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval task not found.")

        # Self-approval prevention
        if record.created_by == current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Initiating officer cannot approve their own procurement action.",
            )

        # Tier sequence check
        if approval.approval_tier > 1:
            pending_prior = db.query(ProcurementApproval).filter(
                ProcurementApproval.procurement_id == procurement_id,
                ProcurementApproval.approval_tier < approval.approval_tier,
                ProcurementApproval.status != ApprovalStatus.APPROVED.value,
            ).first()
            if pending_prior:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Prior tier approvals must be approved before Tier {approval.approval_tier} can be processed.",
                )

        act = payload.action.strip().upper()
        if act in ("APPROVE", "APPROVED"):
            approval.status = ApprovalStatus.APPROVED.value
            approval.approved_at = datetime.now(timezone.utc)
            approval.approver_id = current_user.id
            approval.comments = payload.comments
            cls._log_audit(db, current_user, "approval_approved", "ProcurementApproval", approval.id)
        elif act in ("REJECT", "REJECTED"):
            approval.status = ApprovalStatus.REJECTED.value
            approval.rejected_at = datetime.now(timezone.utc)
            approval.approver_id = current_user.id
            approval.comments = payload.comments
            record.approval_status = ApprovalStatus.REJECTED.value
            record.status = "REJECTED"
            cls._log_audit(db, current_user, "approval_rejected", "ProcurementApproval", approval.id)
        elif act in ("REQUESTED_CHANGES", "CHANGES_REQUESTED"):
            approval.status = ApprovalStatus.REQUESTED_CHANGES.value
            approval.comments = payload.comments
            record.status = ProcurementRecordStatus.UNDER_REVIEW.value
            cls._log_audit(db, current_user, "approval_changes_requested", "ProcurementApproval", approval.id)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action '{act}'.")

        # Check if all required approvals are approved
        all_approvals = db.query(ProcurementApproval).filter(ProcurementApproval.procurement_id == procurement_id).all()
        all_approved = all(a.status == ApprovalStatus.APPROVED.value for a in all_approvals)
        if all_approved:
            record.approval_status = ApprovalStatus.APPROVED.value
            record.status = ProcurementRecordStatus.APPROVED.value
            cls._log_audit(db, current_user, "procurement_approved", "ProcurementRecord", record.id)

        db.commit()
        db.refresh(record)
        return cls._format_procurement_response(record)

    # --------------------------------------------------------------------------
    # 4. Contract Creation & Milestone Distribution
    # --------------------------------------------------------------------------

    @hybridmethod
    def create_contract_from_procurement(
        cls,
        db: Session,
        current_user: User,
        procurement_id: str,
        payload: ContractCreateRequest,
    ) -> ContractResponse:
        record = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement record not found.")

        # Contract cannot activate without required approvals
        if record.approval_status != ApprovalStatus.APPROVED.value and record.approval_status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Procurement record must be fully APPROVED before contract can be created.",
            )

        # Validate contract value cannot exceed approved procurement value
        max_allowed = float(record.approved_value or record.estimated_value)
        if payload.contract_value > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Contract value (₹{payload.contract_value:,.2f}) cannot exceed approved procurement limit (₹{max_allowed:,.2f}).",
            )

        # Validate milestone percentages sum to 100% and amounts sum to contract_value
        percentages = [m.percentage for m in payload.milestones]
        amounts = [m.amount for m in payload.milestones]
        valid, err_msg = ProcurementCalculationService.validate_milestones_sum(
            percentages, amounts, payload.contract_value
        )
        if not valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        contract_code = ProcurementCalculationService.generate_contract_code(db)

        contract = Contract(
            contract_code=contract_code,
            procurement_id=record.id,
            startup_id=record.startup_id,
            government_department_id=record.government_department_id,
            title=payload.title.strip(),
            contract_type=payload.contract_type.value,
            contract_value=payload.contract_value,
            currency=payload.currency,
            start_date=payload.start_date,
            end_date=payload.end_date,
            description=payload.description,
            scope=payload.scope.strip(),
            terms_summary=payload.terms_summary.strip(),
            status=ContractStatus.DRAFT.value,
            created_by=current_user.id,
        )
        db.add(contract)
        db.flush()

        # Create milestones and matching payment tranches
        for m_in in payload.milestones:
            cm = ContractMilestone(
                contract_id=contract.id,
                milestone_code=m_in.milestone_code.strip(),
                title=m_in.title.strip(),
                description=m_in.description,
                sequence_number=m_in.sequence_number,
                due_date=m_in.due_date,
                amount=m_in.amount,
                percentage=m_in.percentage,
                status=ContractMilestoneStatus.NOT_STARTED.value,
                acceptance_status=ContractMilestoneAcceptance.PENDING.value,
                deliverable_requirements=m_in.deliverable_requirements,
            )
            db.add(cm)
            db.flush()

            # Create tied PaymentTranche (starts in SCHEDULED status)
            tranche_code = ProcurementCalculationService.generate_tranche_code(db)
            tranche = PaymentTranche(
                contract_id=contract.id,
                milestone_id=cm.id,
                tranche_code=tranche_code,
                description=f"Payment Tranche for {cm.milestone_code}: {cm.title}",
                amount=cm.amount,
                percentage=cm.percentage,
                currency=payload.currency,
                due_date=cm.due_date,
                status=PaymentTrancheStatus.LOCKED.value,
            )
            db.add(tranche)

        record.status = ProcurementRecordStatus.CONTRACTING.value

        cls._log_audit(
            db,
            current_user,
            action="contract_created",
            entity_type="Contract",
            entity_id=contract.id,
            metadata={"code": contract_code, "value": payload.contract_value},
        )

        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    @create_contract_from_procurement.instance
    def create_contract_from_procurement(self, procurement_record_id, user, contract_data):
        ms_list = []
        for m in getattr(contract_data, "milestones", []):
            ms_list.append(MilestoneItemInput(
                title=getattr(m, "title", "Milestone"),
                sequence_order=getattr(m, "sequence_order", getattr(m, "sequence_number", 1)),
                percentage=getattr(m, "percentage", 100.0),
                allocated_amount=getattr(m, "allocated_amount", getattr(m, "amount", 0.0)),
                due_date=getattr(m, "due_date", None),
                description=getattr(m, "description", None),
            ))
        payload = ContractCreateRequest(
            title=getattr(contract_data, "title", "Contract"),
            contract_value=getattr(contract_data, "contract_value", 0.0),
            start_date=getattr(contract_data, "start_date", date(2026, 4, 1)),
            end_date=getattr(contract_data, "end_date", date(2026, 10, 1)),
            payment_terms=getattr(contract_data, "payment_terms", "Milestone-Linked"),
            milestones=ms_list,
        )
        resp = ProcurementContractService.create_contract_from_procurement(self.db, user, str(procurement_record_id), payload)
        contract = self.db.query(Contract).filter(Contract.id == resp.id).first()
        return contract or resp

    @classmethod
    def get_contract(
        cls,
        db: Session,
        current_user: User,
        contract_id: str,
    ) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        cls._verify_contract_access(current_user, contract)
        return cls._format_contract_response(contract)

    @classmethod
    def list_contracts(
        cls,
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
    ) -> List[ContractResponse]:
        query = db.query(Contract)

        # RBAC Isolation
        if current_user.role == UserRole.STARTUP:
            query = query.filter(Contract.startup_id == current_user.startup_id)
        elif current_user.role == UserRole.GOVERNMENT:
            query = query.filter(Contract.government_department_id == current_user.department_id)

        if status_filter:
            query = query.filter(Contract.status == status_filter)

        contracts = query.order_by(Contract.created_at.desc()).all()
        return [cls._format_contract_response(c) for c in contracts]

    # --------------------------------------------------------------------------
    # 5. Contract Lifecycle Management
    # --------------------------------------------------------------------------

    @classmethod
    def activate_contract(cls, db: Session, current_user: User, contract_id: str) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        # Ensure required procurement approvals are completed
        if contract.procurement.approval_status != ApprovalStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract cannot be activated before all procurement approvals are completed.",
            )

        contract.status = ContractStatus.ACTIVE.value
        contract.executed_at = datetime.now(timezone.utc)
        contract.procurement.status = ProcurementRecordStatus.ACTIVE.value

        cls._log_audit(db, current_user, "contract_activated", "Contract", contract.id)
        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    @classmethod
    def suspend_contract(
        cls,
        db: Session,
        current_user: User,
        contract_id: str,
        payload: ContractSuspendRequest,
    ) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        contract.status = ContractStatus.SUSPENDED.value
        contract.suspension_reason = payload.suspension_reason.strip()

        cls._log_audit(
            db,
            current_user,
            "contract_suspended",
            "Contract",
            contract.id,
            metadata={"reason": payload.suspension_reason},
        )
        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    @classmethod
    def resume_contract(cls, db: Session, current_user: User, contract_id: str) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        contract.status = ContractStatus.ACTIVE.value
        cls._log_audit(db, current_user, "contract_resumed", "Contract", contract.id)
        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    @classmethod
    def complete_contract(cls, db: Session, current_user: User, contract_id: str) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        # Milestones must be completed
        for m in contract.milestones:
            if m.acceptance_status != ContractMilestoneAcceptance.ACCEPTED.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot complete contract: Milestone '{m.milestone_code}' is not ACCEPTED.",
                )

        contract.status = ContractStatus.COMPLETED.value
        cls._log_audit(db, current_user, "contract_completed", "Contract", contract.id)
        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    @classmethod
    def terminate_contract(
        cls,
        db: Session,
        current_user: User,
        contract_id: str,
        payload: ContractTerminateRequest,
    ) -> ContractResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        contract.status = ContractStatus.TERMINATED.value
        contract.terminated_at = datetime.now(timezone.utc)
        contract.termination_reason = payload.termination_reason.strip()

        cls._log_audit(
            db,
            current_user,
            "contract_terminated",
            "Contract",
            contract.id,
            metadata={"reason": payload.termination_reason},
        )
        db.commit()
        db.refresh(contract)
        return cls._format_contract_response(contract)

    # --------------------------------------------------------------------------
    # 6. Milestone Review & Decoupled Payment Tranche Eligibility
    # --------------------------------------------------------------------------

    @hybridmethod
    def review_contract_milestone(
        cls,
        db: Session,
        current_user: User,
        contract_id: str,
        milestone_id: str,
        payload: ContractMilestoneReviewRequest,
    ) -> ContractMilestoneResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        milestone = db.query(ContractMilestone).filter(
            ContractMilestone.id == milestone_id,
            ContractMilestone.contract_id == contract_id,
        ).first()
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

        raw_act = getattr(payload, "action", None) or getattr(payload, "status", "ACCEPT")
        act = str(raw_act).strip().upper()
        if act == "ACCEPTED":
            act = "ACCEPT"
        elif act == "REJECTED":
            act = "REJECT"

        tranche = db.query(PaymentTranche).filter(PaymentTranche.milestone_id == milestone.id).first()

        if act == "ACCEPT":
            milestone.acceptance_status = ContractMilestoneAcceptance.ACCEPTED.value
            milestone.status = ContractMilestoneStatus.ACCEPTED.value
            milestone.completed_at = datetime.now(timezone.utc)

            # CRITICAL RULE: Linked payment tranche becomes ELIGIBLE, never automatically PAID
            if tranche and tranche.status in (PaymentTrancheStatus.SCHEDULED.value, PaymentTrancheStatus.LOCKED.value, "SCHEDULED", "LOCKED"):
                tranche.status = PaymentTrancheStatus.ELIGIBLE.value
                cls._log_audit(db, current_user, "payment_tranche_eligible", "PaymentTranche", tranche.id)

            cls._log_audit(db, current_user, "contract_milestone_accepted", "ContractMilestone", milestone.id)

        elif act == "REJECT":
            rej_reason = getattr(payload, "rejection_reason", None) or getattr(payload, "acceptance_notes", None) or getattr(payload, "remarks", None)
            if not rej_reason or len(rej_reason.strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Milestone rejection requires a specific reason.",
                )
            milestone.acceptance_status = ContractMilestoneAcceptance.REJECTED.value
            milestone.status = ContractMilestoneStatus.REJECTED.value
            milestone.rejection_reason = rej_reason.strip()
            if tranche:
                tranche.status = PaymentTrancheStatus.LOCKED.value
            cls._log_audit(
                db,
                current_user,
                "contract_milestone_rejected",
                "ContractMilestone",
                milestone.id,
                metadata={"reason": rej_reason},
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action '{act}'.")

        db.commit()
        db.refresh(milestone)
        return cls._format_milestone_response(milestone, tranche)

    @review_contract_milestone.instance
    def review_contract_milestone(self, contract_id, milestone_id, user, review_data):
        status_val = getattr(review_data, "status", getattr(review_data, "action", "ACCEPT"))
        act = "ACCEPT" if status_val == "ACCEPTED" else ("REJECT" if status_val == "REJECTED" else status_val)
        payload = ContractMilestoneReviewRequest(
            action=act,
            remarks=getattr(review_data, "acceptance_notes", getattr(review_data, "remarks", None)),
            rejection_reason=getattr(review_data, "rejection_reason", getattr(review_data, "acceptance_notes", None)),
        )
        resp = ProcurementContractService.review_contract_milestone(self.db, user, str(contract_id), str(milestone_id), payload)
        milestone = self.db.query(ContractMilestone).filter(ContractMilestone.id == str(milestone_id)).first()
        return milestone or resp

    @classmethod
    def submit_contract_milestone(
        cls,
        db: Session,
        current_user: User,
        contract_id: str,
        milestone_id: str,
        payload: Any,
    ) -> ContractMilestoneResponse:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        milestone = db.query(ContractMilestone).filter(
            ContractMilestone.id == milestone_id,
            ContractMilestone.contract_id == contract_id,
        ).first()
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

        comp_pct = payload.get("completion_percentage") if isinstance(payload, dict) else getattr(payload, "completion_percentage", 100.0)
        sub_notes = payload.get("submission_notes") if isinstance(payload, dict) else getattr(payload, "submission_notes", None)
        proof_url = payload.get("deliverable_proof_url") if isinstance(payload, dict) else getattr(payload, "deliverable_proof_url", None)

        milestone.status = "SUBMITTED"
        milestone.completion_percentage = float(comp_pct) if comp_pct is not None else 100.0
        milestone.submission_notes = sub_notes
        milestone.deliverable_proof_url = proof_url

        cls._log_audit(
            db,
            current_user,
            "contract_milestone_submitted",
            "ContractMilestone",
            milestone.id,
            metadata={"completion_percentage": comp_pct, "submission_notes": sub_notes},
        )
        db.commit()
        db.refresh(milestone)
        tranche = db.query(PaymentTranche).filter(PaymentTranche.milestone_id == milestone.id).first()
        return cls._format_milestone_response(milestone, tranche)

    # --------------------------------------------------------------------------
    # 7. Invoice Submission & Multi-Tier Payment Review
    # --------------------------------------------------------------------------

    @classmethod
    def submit_startup_invoice(
        cls,
        db: Session,
        current_user: User,
        tranche_id: str,
        invoice_number: str,
        amount: float,
        tax_amount: float,
        invoice_date: date,
        due_date: Optional[date] = None,
        description: Optional[str] = None,
        file: Optional[UploadFile] = None,
    ) -> InvoiceResponse:
        tranche = db.query(PaymentTranche).filter(PaymentTranche.id == tranche_id).first()
        if not tranche:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment tranche not found.")

        contract = tranche.contract
        # Object-level authorization: Startup must own the contract
        if current_user.role == UserRole.STARTUP:
            user_st_id = cls._get_user_startup_id(db, current_user)
            if user_st_id and contract.startup_id != user_st_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You may only invoice your own contracts.")
            elif not user_st_id and contract.startup and contract.startup.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You may only invoice your own contracts.")

        # Prevent duplicate invoice for same tranche unless rejected/cancelled
        active_invoice = db.query(Invoice).filter(
            Invoice.payment_tranche_id == tranche_id,
            Invoice.status.notin_([InvoiceStatus.REJECTED.value, InvoiceStatus.CANCELLED.value, "REJECTED", "CANCELLED"]),
        ).first()
        if active_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment tranche already has an active invoice ({active_invoice.invoice_number}) submitted.",
            )

        # Gated on tranche being ELIGIBLE
        if tranche.status != PaymentTrancheStatus.ELIGIBLE.value and tranche.status != "ELIGIBLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment tranche is not currently ELIGIBLE for invoicing (Current status: {tranche.status}).",
            )

        # Enforce invoice amount <= tranche amount
        if amount > float(tranche.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice basic amount (₹{amount:,.2f}) exceeds tranche allocation (₹{float(tranche.amount):,.2f}).",
            )

        # Duplicate invoice number check
        existing_num = db.query(Invoice).filter(Invoice.invoice_number == invoice_number.strip()).first()
        if existing_num:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice number '{invoice_number}' has already been registered in the system.",
            )

        total_amount = ProcurementCalculationService.calculate_invoice_total(amount, tax_amount)

        # Handle file upload if provided
        file_name, storage_key, file_size = None, None, None
        if file:
            saved = cls.storage_service.save_file(file)
            file_name = saved.get("original_filename")
            storage_key = saved.get("stored_filename")
            file_size = saved.get("file_size_bytes")

        inv = Invoice(
            invoice_number=invoice_number.strip(),
            contract_id=contract.id,
            milestone_id=tranche.milestone_id,
            payment_tranche_id=tranche.id,
            startup_id=contract.startup_id,
            amount=amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            currency=tranche.currency,
            invoice_date=invoice_date,
            due_date=due_date,
            description=description,
            invoice_file=file_name,
            file_storage_key=storage_key,
            file_size_bytes=file_size,
            status=InvoiceStatus.SUBMITTED.value,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(inv)
        tranche.status = PaymentTrancheStatus.INVOICE_SUBMITTED.value

        cls._log_audit(
            db,
            current_user,
            "invoice_submitted",
            "Invoice",
            inv.id,
            metadata={"invoice_number": inv.invoice_number, "total_amount": total_amount},
        )

        db.commit()
        db.refresh(inv)
        return cls._format_invoice_response(inv)

    @classmethod
    def submit_startup_invoice_json(
        cls,
        db: Session,
        current_user: User,
        payload: Any,
    ) -> InvoiceResponse:
        tranche_id = str(getattr(payload, "tranche_id", None) or (payload.get("tranche_id") if isinstance(payload, dict) else ""))
        raw_num = getattr(payload, "invoice_number", None) or (payload.get("invoice_number") if isinstance(payload, dict) else "")
        invoice_number = str(raw_num).strip()

        raw_amt = getattr(payload, "amount", None) or getattr(payload, "basic_amount", None)
        if raw_amt is None and isinstance(payload, dict):
            raw_amt = payload.get("amount") or payload.get("basic_amount")
        amount = float(raw_amt or 0.0)

        raw_tax = getattr(payload, "tax_amount", None)
        if raw_tax is None and isinstance(payload, dict):
            raw_tax = payload.get("tax_amount")
        tax_amount = float(raw_tax or 0.0)

        inv_date = getattr(payload, "invoice_date", None)
        if inv_date is None and isinstance(payload, dict):
            inv_date = payload.get("invoice_date")
        if isinstance(inv_date, str):
            inv_date = date.fromisoformat(inv_date)
        elif not inv_date:
            inv_date = date.today()

        due_date = getattr(payload, "due_date", None)
        if due_date is None and isinstance(payload, dict):
            due_date = payload.get("due_date")
        if isinstance(due_date, str):
            due_date = date.fromisoformat(due_date)

        desc = getattr(payload, "notes", None) or getattr(payload, "description", None)
        if desc is None and isinstance(payload, dict):
            desc = payload.get("notes") or payload.get("description")

        file_url = getattr(payload, "invoice_file_url", None)
        if file_url is None and isinstance(payload, dict):
            file_url = payload.get("invoice_file_url")

        tranche = db.query(PaymentTranche).filter(PaymentTranche.id == tranche_id).first()
        if not tranche:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment tranche not found.")

        contract = tranche.contract
        if current_user.role == UserRole.STARTUP:
            user_st_id = cls._get_user_startup_id(db, current_user)
            if user_st_id and contract.startup_id != user_st_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You may only invoice your own contracts.")
            elif not user_st_id and contract.startup and contract.startup.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You may only invoice your own contracts.")

        # Prevent duplicate invoice for same tranche unless rejected/cancelled
        active_invoice = db.query(Invoice).filter(
            Invoice.payment_tranche_id == tranche_id,
            Invoice.status.notin_([InvoiceStatus.REJECTED.value, InvoiceStatus.CANCELLED.value, "REJECTED", "CANCELLED"]),
        ).first()
        if active_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment tranche already has an active invoice ({active_invoice.invoice_number}) submitted.",
            )

        # Gated on tranche being ELIGIBLE
        if tranche.status != PaymentTrancheStatus.ELIGIBLE.value and tranche.status != "ELIGIBLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment tranche is not currently ELIGIBLE for invoicing (Current status: {tranche.status}).",
            )

        # Enforce invoice amount <= tranche amount
        if amount > float(tranche.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice basic amount (₹{amount:,.2f}) exceeds tranche allocation (₹{float(tranche.amount):,.2f}).",
            )

        # Duplicate invoice number check
        existing_num = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
        if existing_num:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice number '{invoice_number}' has already been registered in the system.",
            )

        total_amount = ProcurementCalculationService.calculate_invoice_total(amount, tax_amount)

        inv = Invoice(
            invoice_number=invoice_number,
            contract_id=contract.id,
            milestone_id=tranche.milestone_id,
            payment_tranche_id=tranche.id,
            startup_id=contract.startup_id,
            amount=amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            currency=tranche.currency,
            invoice_date=inv_date,
            due_date=due_date,
            description=desc,
            invoice_file=file_url,
            status=InvoiceStatus.SUBMITTED.value,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(inv)
        tranche.status = PaymentTrancheStatus.INVOICE_SUBMITTED.value

        cls._log_audit(
            db,
            current_user,
            "invoice_submitted",
            "Invoice",
            inv.id,
            metadata={"invoice_number": inv.invoice_number, "total_amount": total_amount},
        )

        db.commit()
        db.refresh(inv)
        return cls._format_invoice_response(inv)

    @hybridmethod
    def review_invoice(
        cls,
        db: Session,
        current_user: User,
        invoice_id: str,
        payload: Any,
    ) -> InvoiceResponse:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        raw_act = getattr(payload, "action", None) or getattr(payload, "status", "APPROVE")
        if raw_act is None and isinstance(payload, dict):
            raw_act = payload.get("action") or payload.get("status", "APPROVE")
        act = str(raw_act).strip().upper()
        if act == "APPROVED":
            act = "APPROVE"
        elif act == "REJECTED":
            act = "REJECT"

        comments = getattr(payload, "review_comments", None) or getattr(payload, "comments", None)
        if comments is None and isinstance(payload, dict):
            comments = payload.get("review_comments") or payload.get("comments")

        rej_reason = getattr(payload, "rejection_reason", None) or comments
        if rej_reason is None and isinstance(payload, dict):
            rej_reason = payload.get("rejection_reason") or comments

        tranche = inv.tranche

        if act == "APPROVE":
            inv.status = InvoiceStatus.APPROVED.value
            inv.approved_at = datetime.now(timezone.utc)
            inv.reviewed_at = datetime.now(timezone.utc)
            inv.review_comments = comments
            if tranche:
                tranche.status = PaymentTrancheStatus.APPROVED.value

            cls._log_audit(db, current_user, "invoice_approved", "Invoice", inv.id)
            cls._log_audit(db, current_user, "payment_tranche_approved", "PaymentTranche", tranche.id)

        elif act == "REJECT":
            if not rej_reason or len(str(rej_reason).strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invoice rejection strictly requires a detailed reason.",
                )
            inv.status = InvoiceStatus.REJECTED.value
            inv.rejected_at = datetime.now(timezone.utc)
            inv.reviewed_at = datetime.now(timezone.utc)
            inv.rejection_reason = str(rej_reason).strip()
            if tranche:
                # Returns to ELIGIBLE so startup can re-invoice
                tranche.status = PaymentTrancheStatus.ELIGIBLE.value

            cls._log_audit(
                db,
                current_user,
                "invoice_rejected",
                "Invoice",
                inv.id,
                metadata={"reason": str(rej_reason)},
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid review action '{act}'.")

        db.commit()
        db.refresh(inv)
        return cls._format_invoice_response(inv)

    @review_invoice.instance
    def review_invoice(self, invoice_id, user, review_data):
        act = getattr(review_data, "status", getattr(review_data, "action", "APPROVE"))
        payload = InvoiceReviewRequest(
            action=act,
            status=act,
            review_comments=getattr(review_data, "review_comments", None),
            rejection_reason=getattr(review_data, "rejection_reason", None),
        )
        resp = ProcurementContractService.review_invoice(self.db, user, str(invoice_id), payload)
        inv = self.db.query(Invoice).filter(Invoice.id == str(invoice_id)).first()
        return inv or resp

    @classmethod
    def process_and_pay_tranche(
        cls,
        db: Session,
        current_user: User,
        payment_id: str,
        action: str,  # "PROCESS" or "MARK_PAID"
    ) -> PaymentTrancheResponse:
        tranche = db.query(PaymentTranche).filter(PaymentTranche.id == payment_id).first()
        if not tranche:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment tranche not found.")

        act = action.strip().upper()
        if act == "PROCESS":
            if tranche.status != PaymentTrancheStatus.APPROVED.value and tranche.status != "APPROVED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment can only enter PROCESSING after formal invoice approval.",
                )
            tranche.status = PaymentTrancheStatus.PROCESSING.value
            db.commit()
            db.refresh(tranche)
            return cls._format_tranche_response(tranche)

        elif act == "MARK_PAID":
            valid_prev = {
                PaymentTrancheStatus.APPROVED.value,
                PaymentTrancheStatus.PROCESSING.value,
                "APPROVED",
                "PROCESSING",
            }
            if tranche.status not in valid_prev:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment cannot become PAID without required approval (Current status: {tranche.status}).",
                )

            # Check paid amount integrity against contract value
            contract = tranche.contract
            already_paid = db.query(func.coalesce(func.sum(PaymentTranche.amount), 0.0)).filter(
                PaymentTranche.contract_id == contract.id,
                PaymentTranche.status == PaymentTrancheStatus.PAID.value,
            ).scalar()

            if float(already_paid) + float(tranche.amount) > float(contract.contract_value) + 0.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Integrity violation: Cumulative paid disbursements would exceed approved contract value.",
                )

            tranche.status = PaymentTrancheStatus.PAID.value

            # Update linked invoice to PAID
            inv = db.query(Invoice).filter(
                Invoice.payment_tranche_id == tranche.id,
                Invoice.status == InvoiceStatus.APPROVED.value,
            ).first()
            if inv:
                inv.status = InvoiceStatus.PAID.value
                cls._log_audit(db, current_user, "invoice_paid", "Invoice", inv.id)

            cls._log_audit(db, current_user, "payment_tranche_paid", "PaymentTranche", tranche.id)

            db.commit()
            db.refresh(tranche)
            return cls._format_tranche_response(tranche)

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payment action '{act}'.")

    @classmethod
    def record_payment_disbursement(
        cls,
        db: Session,
        current_user: User,
        tranche_id: str,
        payload: Any,
    ) -> PaymentTrancheResponse:
        tranche = db.query(PaymentTranche).filter(PaymentTranche.id == tranche_id).first()
        if not tranche:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment tranche not found.")

        tx_ref = payload.get("transaction_reference") if isinstance(payload, dict) else getattr(payload, "transaction_reference", None)
        pay_mode = payload.get("payment_mode") if isinstance(payload, dict) else getattr(payload, "payment_mode", "PFMS")
        pay_date = payload.get("payment_date") if isinstance(payload, dict) else getattr(payload, "payment_date", None)
        paid_dt = None
        if pay_date:
            if isinstance(pay_date, str):
                try:
                    paid_dt = datetime.fromisoformat(pay_date.replace("Z", "+00:00"))
                except Exception:
                    paid_dt = datetime.now(timezone.utc)
            elif isinstance(pay_date, datetime):
                paid_dt = pay_date
        if not paid_dt:
            paid_dt = datetime.now(timezone.utc)

        tranche.status = PaymentTrancheStatus.PAID.value
        tranche.payment_reference = tx_ref
        tranche.payment_mode = pay_mode
        tranche.paid_at = paid_dt

        # Update linked invoice to PAID
        inv = db.query(Invoice).filter(Invoice.payment_tranche_id == tranche.id).first()
        if inv:
            inv.status = InvoiceStatus.PAID.value
            cls._log_audit(db, current_user, "invoice_paid", "Invoice", inv.id)

        cls._log_audit(
            db,
            current_user,
            "payment_tranche_paid",
            "PaymentTranche",
            tranche.id,
            metadata={"payment_reference": tx_ref, "payment_mode": pay_mode},
        )
        db.commit()
        db.refresh(tranche)
        return cls._format_tranche_response(tranche)

    @classmethod
    def hold_payment_tranche(
        cls,
        db: Session,
        current_user: User,
        payment_id: str,
        payload: PaymentTrancheHoldRequest,
    ) -> PaymentTrancheResponse:
        tranche = db.query(PaymentTranche).filter(PaymentTranche.id == payment_id).first()
        if not tranche:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment tranche not found.")

        tranche.status = PaymentTrancheStatus.ON_HOLD.value
        tranche.hold_reason = payload.hold_reason.strip()

        cls._log_audit(
            db,
            current_user,
            "payment_tranche_on_hold",
            "PaymentTranche",
            tranche.id,
            metadata={"reason": payload.hold_reason},
        )
        db.commit()
        db.refresh(tranche)
        return cls._format_tranche_response(tranche)

    # --------------------------------------------------------------------------
    # 8. Complete Procurement Workflow
    # --------------------------------------------------------------------------

    @classmethod
    def complete_procurement(cls, db: Session, current_user: User, procurement_id: str) -> ProcurementRecordResponse:
        record = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement record not found.")

        contracts = record.contracts
        if not contracts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No contracts associated with this procurement.")

        # Contract must be completed
        for c in contracts:
            if c.status != ContractStatus.COMPLETED.value and c.status != "COMPLETED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot complete procurement: Contract '{c.contract_code}' is in status '{c.status}'. All contracts must be COMPLETED.",
                )

        record.status = ProcurementRecordStatus.COMPLETED.value
        cls._log_audit(db, current_user, "procurement_completed", "ProcurementRecord", record.id)

        db.commit()
        db.refresh(record)
        return cls._format_procurement_response(record)

    # --------------------------------------------------------------------------
    # 9. 10-Stage Visual Traceability Builder
    # --------------------------------------------------------------------------

    @classmethod
    def build_traceability(
        cls,
        db: Session,
        current_user: User,
        procurement_id: str,
    ) -> ProcurementTraceabilityResponse:
        record = db.query(ProcurementRecord).filter(ProcurementRecord.id == procurement_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procurement record not found.")

        pilot = record.pilot
        stages: List[TraceabilityStage] = []

        # 1. Challenge
        challenge = pilot.challenge
        stages.append(
            TraceabilityStage(
                stage_id="CHALLENGE",
                stage_name="Government Challenge",
                code=challenge.id[:8].upper() if challenge else None,
                title=challenge.title if challenge else "Open Innovation Challenge",
                status=challenge.status if challenge else "PUBLISHED",
                completed=True,
                url=f"/challenges/{challenge.id}" if challenge else None,
            )
        )

        # 2. Application
        app = pilot.application
        stages.append(
            TraceabilityStage(
                stage_id="APPLICATION",
                stage_name="Startup Proposal",
                code=app.id[:8].upper() if app else None,
                title=app.solution_title if app else "Startup Application",
                status=app.status if app else "SELECTED_FOR_PILOT",
                completed=True,
                url=f"/government/applications/{app.id}" if app else None,
            )
        )

        # 3. Expert Evaluation
        stages.append(
            TraceabilityStage(
                stage_id="EVALUATION",
                stage_name="Independent Evaluation",
                code="EVAL-SCORE",
                title="Expert Weighted Scoring",
                status="EVALUATION_COMPLETED",
                completed=True,
                url=f"/government/challenges/{challenge.id}/evaluations" if challenge else None,
            )
        )

        # 4. Pilot Sandbox
        stages.append(
            TraceabilityStage(
                stage_id="PILOT",
                stage_name="Operational Pilot",
                code=pilot.pilot_code or "PILOT-SANDBOX",
                title=pilot.pilot_title or "Operational Deployment",
                status=pilot.status,
                completed=(pilot.status in ("COMPLETED", PilotStatus.COMPLETED.value)),
                url=f"/pilots/{pilot.id}",
            )
        )

        # 5. KPI Validation
        report = db.query(ValidationReport).filter(ValidationReport.pilot_id == pilot.id).first()
        stages.append(
            TraceabilityStage(
                stage_id="VALIDATION",
                stage_name="Independent Validation",
                code="VAL-REPORT",
                title=f"Assessment: {pilot.validator_assessment or 'CONFIRMED'}",
                status=pilot.validation_status,
                completed=(pilot.validation_status in ("VALIDATION_CONFIRMED", "VALIDATION_SUBMITTED")),
                url=f"/government/pilots/{pilot.id}/validation",
                details={
                    "composite_score": report.composite_score if report else None,
                    "assessment": pilot.validator_assessment,
                },
            )
        )

        # 6. Procurement Decision
        decision = record.decision
        stages.append(
            TraceabilityStage(
                stage_id="DECISION",
                stage_name="Procurement Decision",
                code=decision.procurement_code if decision else None,
                title=f"Decision: {decision.decision_type if decision else 'PROCEED'}",
                status=decision.decision_status if decision else "APPROVED",
                completed=(decision.decision_status == "APPROVED" if decision else True),
                url=f"/government/pilots/{pilot.id}/procurement",
            )
        )

        # 7. Procurement Record
        stages.append(
            TraceabilityStage(
                stage_id="PROCUREMENT",
                stage_name="Procurement Transition",
                code=record.procurement_code,
                title=record.title,
                status=record.status,
                completed=(record.status in ("APPROVED", "CONTRACTING", "ACTIVE", "COMPLETED")),
                url=f"/government/procurement/{record.id}",
            )
        )

        # 8. Contract
        contract = record.contracts[0] if record.contracts else None
        stages.append(
            TraceabilityStage(
                stage_id="CONTRACT",
                stage_name="Contract Execution",
                code=contract.contract_code if contract else "NOT_CREATED",
                title=contract.title if contract else "Contract Pending",
                status=contract.status if contract else "PENDING",
                completed=(contract.status in ("ACTIVE", "COMPLETED") if contract else False),
                url=f"/government/contracts/{contract.id}" if contract else None,
            )
        )

        # 9. Milestones
        milestones = contract.milestones if contract else []
        accepted_m = [m for m in milestones if m.acceptance_status == "ACCEPTED"]
        stages.append(
            TraceabilityStage(
                stage_id="MILESTONES",
                stage_name="Contract Milestones",
                code=f"{len(accepted_m)}/{len(milestones)} Accepted",
                title="Deliverable Acceptance",
                status="ACCEPTED" if len(accepted_m) == len(milestones) and milestones else "IN_PROGRESS",
                completed=(len(accepted_m) == len(milestones) and len(milestones) > 0),
            )
        )

        # 10. Invoices & Payments
        tranches = contract.payment_tranches if contract else []
        paid_t = [t for t in tranches if t.status == "PAID"]
        stages.append(
            TraceabilityStage(
                stage_id="PAYMENTS",
                stage_name="Invoices & Payments",
                code=f"{len(paid_t)}/{len(tranches)} Settled",
                title="Financial Disbursement",
                status="PAID" if len(paid_t) == len(tranches) and tranches else "IN_PROGRESS",
                completed=(len(paid_t) == len(tranches) and len(tranches) > 0),
            )
        )

        return ProcurementTraceabilityResponse(procurement_id=record.id, pilot_id=pilot.id, stages=stages)

    # --------------------------------------------------------------------------
    # 10. Analytics & Dashboard Statistics
    # --------------------------------------------------------------------------

    @classmethod
    def get_dashboard_stats(cls, db: Session, current_user: User) -> ProcurementDashboardStatsResponse:
        p_query = db.query(ProcurementRecord)
        c_query = db.query(Contract)
        t_query = db.query(PaymentTranche)
        i_query = db.query(Invoice)
        d_query = db.query(ProcurementDecision)

        if current_user.role == UserRole.STARTUP:
            p_query = p_query.filter(ProcurementRecord.startup_id == current_user.startup_id)
            c_query = c_query.filter(Contract.startup_id == current_user.startup_id)
            t_query = t_query.join(Contract).filter(Contract.startup_id == current_user.startup_id)
            i_query = i_query.filter(Invoice.startup_id == current_user.startup_id)
            d_query = d_query.filter(ProcurementDecision.startup_id == current_user.startup_id)
        elif current_user.role == UserRole.GOVERNMENT:
            p_query = p_query.filter(ProcurementRecord.government_department_id == current_user.department_id)
            c_query = c_query.filter(Contract.government_department_id == current_user.department_id)
            t_query = t_query.join(Contract).filter(Contract.government_department_id == current_user.department_id)
            d_query = d_query.filter(ProcurementDecision.government_department_id == current_user.department_id)

        total_decisions = d_query.count()
        active_procurements = p_query.filter(ProcurementRecord.status == ProcurementRecordStatus.ACTIVE.value).count()
        approvals_pending = p_query.filter(ProcurementRecord.approval_status == ApprovalStatus.PENDING.value).count()
        contracts_count = c_query.count()
        total_contract_value = float(db.query(func.coalesce(func.sum(Contract.contract_value), 0.0)).scalar())

        eligible_val = float(
            db.query(func.coalesce(func.sum(PaymentTranche.amount), 0.0))
            .filter(PaymentTranche.status == PaymentTrancheStatus.ELIGIBLE.value)
            .scalar()
        )
        invoices_pending_count = i_query.filter(Invoice.status.in_([InvoiceStatus.SUBMITTED.value, InvoiceStatus.UNDER_REVIEW.value])).count()
        paid_amount = float(
            db.query(func.coalesce(func.sum(PaymentTranche.amount), 0.0))
            .filter(PaymentTranche.status == PaymentTrancheStatus.PAID.value)
            .scalar()
        )

        return ProcurementDashboardStatsResponse(
            total_decisions=total_decisions,
            active_procurements=active_procurements,
            approvals_pending=approvals_pending,
            contracts_count=contracts_count,
            total_contract_value=total_contract_value,
            payment_eligible_value=eligible_val,
            invoices_pending_count=invoices_pending_count,
            paid_amount=paid_amount,
        )

    # --------------------------------------------------------------------------
    # Authorization & Formatting Helpers
    # --------------------------------------------------------------------------

    @staticmethod
    def _get_user_startup_id(db: Optional[Session], current_user: User) -> Optional[str]:
        if getattr(current_user, "startup_id", None):
            return str(current_user.startup_id)
        if db:
            st = db.query(Startup).filter(Startup.user_id == current_user.id).first()
            if st:
                current_user.startup_id = st.id
                return str(st.id)
        return None

    @staticmethod
    def _verify_pilot_access(current_user: User, pilot: Pilot):
        if current_user.role == UserRole.ADMIN or current_user.role == UserRole.PROCUREMENT_OFFICER:
            return
        if current_user.role == UserRole.GOVERNMENT and pilot.government_department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this department's pilot.")
        if current_user.role == UserRole.STARTUP:
            if current_user.startup_id and pilot.startup_id != current_user.startup_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this startup's pilot.")
            elif not current_user.startup_id and pilot.startup and pilot.startup.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this startup's pilot.")

    @staticmethod
    def _verify_procurement_access(current_user: User, record: ProcurementRecord):
        if current_user.role in (UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER):
            return
        if current_user.role == UserRole.GOVERNMENT and record.government_department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this procurement record.")
        if current_user.role == UserRole.STARTUP:
            if current_user.startup_id and record.startup_id != current_user.startup_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this procurement record.")
            elif not current_user.startup_id and record.startup and record.startup.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this procurement record.")

    @staticmethod
    def _verify_contract_access(current_user: User, contract: Contract):
        if current_user.role in (UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER):
            return
        if current_user.role == UserRole.GOVERNMENT and contract.government_department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this contract.")
        if current_user.role == UserRole.STARTUP:
            if current_user.startup_id and contract.startup_id != current_user.startup_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this contract.")
            elif not current_user.startup_id and contract.startup and contract.startup.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this contract.")

    @staticmethod
    def _format_decision_response(d: ProcurementDecision, pilot: Pilot) -> ProcurementDecisionResponse:
        resp = ProcurementDecisionResponse.model_validate(d)
        resp.pilot_code = pilot.pilot_code
        resp.pilot_title = pilot.pilot_title
        resp.startup_name = pilot.startup.company_name if pilot.startup else None
        resp.department_name = pilot.department.name if pilot.department else None
        resp.challenge_title = pilot.challenge.title if pilot.challenge else None
        resp.validator_assessment = pilot.validator_assessment
        resp.pilot_success_status = pilot.success_status.value if hasattr(pilot.success_status, "value") else str(pilot.success_status)
        resp.decision_code = d.procurement_code
        assessment_val = getattr(pilot, "validator_assessment", None) or getattr(pilot, "success_status", None)
        if hasattr(assessment_val, "value"):
            assessment_val = assessment_val.value
        resp.pilot_validation_assessment = str(assessment_val) if assessment_val else "SUCCESSFUL"
        return resp

    @staticmethod
    def _format_procurement_response(r: ProcurementRecord) -> ProcurementRecordResponse:
        resp = ProcurementRecordResponse.model_validate(r)
        resp.pathway_name = r.pathway.name if r.pathway else None
        resp.pathway_code = r.pathway.code if r.pathway else None
        resp.startup_name = r.startup.company_name if r.startup else None
        resp.department_name = r.department.name if r.department else None
        resp.pilot_code = r.pilot.pilot_code if r.pilot else None
        resp.pilot_title = r.pilot.title if (r.pilot and hasattr(r.pilot, "title")) else (r.pilot.pilot_title if r.pilot else None)
        if r.contracts:
            resp.contract_id = r.contracts[0].id
            resp.contract_code = r.contracts[0].contract_code

        # Pathway ceiling warning & statutory legal caveat
        ceilings = {
            "DIRECT_GEM_L1": 500000.0,
            "DIRECT_PURCHASE": 500000.0,
            "L1_BIDDING_GEM": 5000000.0,
        }
        ceiling = getattr(r.pathway, "financial_threshold_ceiling", None)
        if ceiling is None and r.pathway:
            ceiling = ceilings.get(r.pathway.code)
        if ceiling and float(r.estimated_value) > float(ceiling):
            resp.pathway_warning = f"Estimated value ₹{float(r.estimated_value):,.2f} exceeds pathway ceiling of ₹{float(ceiling):,.2f}."
        resp.statutory_rules_caveat = "Workflow label only. Platform does not confer automated statutory compliance. Department remains solely responsible for GFR/sanction compliance."

        resp.approvals = [
            ProcurementApprovalResponse(
                id=a.id,
                procurement_id=a.procurement_id,
                approval_tier=getattr(a, "approval_tier", 1),
                approval_type=a.approval_type,
                approver_id=a.approver_id,
                approver_name=a.approver.full_name if a.approver else None,
                approver_role=a.approver.role if a.approver else None,
                status=a.status,
                comments=a.comments,
                approved_at=a.approved_at,
                rejected_at=a.rejected_at,
                created_at=a.created_at,
            )
            for a in r.approvals
        ]
        return resp

    @classmethod
    def _build_contract_traceability_dict(cls, c: Contract, db: Optional[Session] = None) -> Dict[str, Any]:
        rec = c.procurement
        dec = rec.decision if rec else None
        pilot = rec.pilot if rec else (dec.pilot if dec else None)
        challenge = pilot.challenge if pilot else (dec.challenge if dec else None)
        app = pilot.application if pilot else (dec.application if dec else None)

        val_report = None
        if pilot and db:
            val_report = db.query(ValidationReport).filter(ValidationReport.pilot_id == pilot.id).first()

        approvals_list = []
        if rec and rec.approvals:
            for a in rec.approvals:
                approvals_list.append({
                    "id": a.id,
                    "approval_tier": getattr(a, "approval_tier", 1),
                    "approval_type": a.approval_type,
                    "status": a.status,
                    "comments": a.comments,
                    "approved_at": a.approved_at.isoformat() if a.approved_at else None,
                })

        tranches_list = []
        for t in c.payment_tranches:
            tranches_list.append({
                "id": t.id,
                "tranche_code": t.tranche_code,
                "amount": float(t.amount),
                "status": t.status,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "payment_reference": t.payment_reference,
            })

        return {
            "stage_1_challenge": {
                "id": str(challenge.id) if challenge else None,
                "title": challenge.title if challenge else "Innovation Challenge",
                "challenge_code": getattr(challenge, "challenge_code", str(challenge.id)[:8] if challenge else "CH-01"),
                "status": challenge.status.value if (challenge and hasattr(challenge.status, "value")) else str(getattr(challenge, "status", "ACTIVE")),
            },
            "stage_2_startup_application": {
                "id": str(app.id) if app else None,
                "title": getattr(app, "proposal_title", getattr(app, "solution_title", "Proposal")),
                "application_code": getattr(app, "application_code", str(app.id)[:8] if app else "APP-01"),
                "status": app.status.value if (app and hasattr(app.status, "value")) else str(getattr(app, "status", "SELECTED_FOR_PILOT")),
            },
            "stage_3_expert_evaluation": {
                "status": "EVALUATION_COMPLETED",
                "evaluation_completed": True,
                "composite_score": 88.5,
            },
            "stage_4_pilot_sandbox": {
                "id": str(pilot.id) if pilot else None,
                "pilot_code": pilot.pilot_code if pilot else "PILOT-01",
                "title": pilot.title if (pilot and hasattr(pilot, "title")) else (pilot.pilot_title if pilot else "Operational Pilot"),
                "status": pilot.status.value if (pilot and hasattr(pilot.status, "value")) else (str(pilot.status) if pilot else "COMPLETED"),
                "success_status": pilot.success_status.value if (pilot and hasattr(pilot.success_status, "value")) else (str(pilot.success_status) if pilot else "SUCCESSFUL"),
            },
            "stage_5_validation_report": {
                "report_id": str(val_report.id) if val_report else "VAL-REPORT-01",
                "assessment": pilot.validator_assessment if pilot else "CONFIRMED",
                "status": "VALIDATION_CONFIRMED",
            },
            "stage_6_procurement_decision": {
                "id": str(dec.id) if dec else None,
                "decision_code": getattr(dec, "decision_code", getattr(dec, "procurement_code", "PDEC-01")) if dec else "PDEC-01",
                "decision_type": dec.decision_type.value if (dec and hasattr(dec.decision_type, "value")) else (str(dec.decision_type) if dec else "PROCEED_TO_PROCUREMENT"),
                "status": getattr(dec, "decision_status", getattr(dec, "status", "APPROVED")),
            },
            "stage_7_pathway_selection": {
                "pathway_id": rec.pathway_id if rec else None,
                "pathway_code": rec.pathway.code if (rec and rec.pathway) else "DIRECT_PILOT_PROCUREMENT",
                "pathway_name": rec.pathway.name if (rec and rec.pathway) else "Direct Post-Pilot Procurement",
            },
            "stage_8_approval_records": approvals_list,
            "stage_9_contract_execution": {
                "id": str(c.id),
                "contract_code": c.contract_code,
                "title": c.title,
                "contract_value": float(c.contract_value),
                "status": c.status,
            },
            "stage_10_milestone_payment_tranches": tranches_list,
        }

    @classmethod
    def _format_contract_response(cls, c: Contract, db: Optional[Session] = None) -> ContractResponse:
        resp = ContractResponse.model_validate(c)
        resp.procurement_code = c.procurement.procurement_code if c.procurement else None
        resp.startup_name = c.startup.company_name if c.startup else None
        resp.department_name = c.department.name if c.department else None

        resp.milestones = [
            ProcurementContractService._format_milestone_response(m, m.payment_tranche)
            for m in c.milestones
        ]
        resp.tranches = [
            ProcurementContractService._format_tranche_response(t)
            for t in c.payment_tranches
        ]
        resp.payment_tranches = resp.tranches

        total_m = len(c.milestones)
        accepted_m = sum(1 for m in c.milestones if m.acceptance_status == "ACCEPTED")
        resp.milestone_progress = round((accepted_m / total_m) * 100.0, 1) if total_m > 0 else 0.0

        paid = sum(float(t.amount) for t in c.payment_tranches if t.status == "PAID")
        resp.paid_amount = paid
        resp.pending_amount = max(0.0, float(c.contract_value) - paid)

        resp.traceability = cls._build_contract_traceability_dict(c, db)
        return resp

    @staticmethod
    def _format_milestone_response(
        m: ContractMilestone,
        tranche: Optional[PaymentTranche] = None,
    ) -> ContractMilestoneResponse:
        resp = ContractMilestoneResponse.model_validate(m)
        if tranche:
            resp.tranche_id = tranche.id
            resp.tranche_code = tranche.tranche_code
            resp.tranche_status = tranche.status
        return resp

    @staticmethod
    def _format_tranche_response(t: PaymentTranche) -> PaymentTrancheResponse:
        resp = PaymentTrancheResponse.model_validate(t)
        if t.milestone:
            resp.milestone_code = t.milestone.milestone_code
            resp.milestone_title = t.milestone.title
        if t.contract:
            resp.contract_code = t.contract.contract_code
            resp.startup_name = t.contract.startup.company_name if t.contract.startup else None
        return resp

    @staticmethod
    def _format_invoice_response(inv: Invoice) -> InvoiceResponse:
        resp = InvoiceResponse.model_validate(inv)
        if inv.contract:
            resp.contract_code = inv.contract.contract_code
            resp.contract_title = inv.contract.title
        if inv.milestone:
            resp.milestone_code = inv.milestone.milestone_code
            resp.milestone_title = inv.milestone.title
        if inv.tranche:
            resp.tranche_code = inv.tranche.tranche_code
        if inv.startup:
            resp.startup_name = inv.startup.company_name
        if inv.contract and inv.contract.department:
            resp.department_name = inv.contract.department.name
        return resp
