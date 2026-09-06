import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Date,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base
from app.models.base import BaseModelMixin


# ==============================================================================
# Step 8 Enums
# ==============================================================================

class DecisionType(str, enum.Enum):
    PROCEED_TO_PROCUREMENT = "PROCEED_TO_PROCUREMENT"
    RE_PILOT = "RE_PILOT"
    DO_NOT_PROCEED = "DO_NOT_PROCEED"
    FURTHER_REVIEW = "FURTHER_REVIEW"


class DecisionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class ProcurementRecordStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    INITIATED = "INITIATED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVAL_PENDING = "APPROVAL_PENDING"
    APPROVED = "APPROVED"
    CONTRACTING = "CONTRACTING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ApprovalType(str, enum.Enum):
    GOVERNMENT_REVIEW = "GOVERNMENT_REVIEW"
    FINANCIAL_REVIEW = "FINANCIAL_REVIEW"
    LEGAL_REVIEW = "LEGAL_REVIEW"
    PROCUREMENT_APPROVAL = "PROCUREMENT_APPROVAL"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REQUESTED_CHANGES = "REQUESTED_CHANGES"


class ContractType(str, enum.Enum):
    SERVICE = "SERVICE"
    SUPPLY = "SUPPLY"
    IMPLEMENTATION = "IMPLEMENTATION"
    SOFTWARE = "SOFTWARE"
    OTHER = "OTHER"


class ContractStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_SIGNATURE = "PENDING_SIGNATURE"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"


class ContractMilestoneStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


class ContractMilestoneAcceptance(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PaymentTrancheStatus(str, enum.Enum):
    LOCKED = "LOCKED"
    SCHEDULED = "SCHEDULED"
    ELIGIBLE = "ELIGIBLE"
    INVOICE_PENDING = "INVOICE_PENDING"
    INVOICE_SUBMITTED = "INVOICE_SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class ProcurementDocumentType(str, enum.Enum):
    JUSTIFICATION = "JUSTIFICATION"
    APPROVAL_NOTE = "APPROVAL_NOTE"
    CONTRACT_AGREEMENT = "CONTRACT_AGREEMENT"
    SANCTION_ORDER = "SANCTION_ORDER"
    INVOICE_SUPPORTING = "INVOICE_SUPPORTING"
    OTHER = "OTHER"


# Backward compatibility aliases for legacy imports
class ProcurementPathwayLegacy(str, enum.Enum):
    GEM_STARTUP_RUNWAY = "GEM_STARTUP_RUNWAY"
    INNOVATION_EXEMPTION = "INNOVATION_EXEMPTION"
    LIMITED_TENDER = "LIMITED_TENDER"
    RATE_CONTRACT = "RATE_CONTRACT"
    SCALE_UP_EXPANSION = "SCALE_UP_EXPANSION"


class ProcurementStatus(str, enum.Enum):
    DRAFT_PURCHASE_INTENT = "DRAFT_PURCHASE_INTENT"
    SANCTION_ORDER_ISSUED = "SANCTION_ORDER_ISSUED"
    CONTRACT_EXECUTED = "CONTRACT_EXECUTED"
    FULFILLMENT_IN_PROGRESS = "FULFILLMENT_IN_PROGRESS"
    DELIVERED_AND_SETTLED = "DELIVERED_AND_SETTLED"


ProcurementPathwayType = ProcurementPathwayLegacy
ProcurementDecisionType = DecisionType
TrancheStatus = PaymentTrancheStatus
PilotValidationAssessment = DecisionType


# ==============================================================================
# Models
# ==============================================================================

class ProcurementPathway(Base, BaseModelMixin):
    """
    Configurable government procurement pathway label and approval rules.
    Workflow labels only — not universal legal determinations.
    """
    __tablename__ = "procurement_pathways"

    name = Column(String(255), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    authority_level = Column(String(100), nullable=False)
    requires_competitive_process = Column(Boolean, default=False, nullable=False)
    requires_financial_approval = Column(Boolean, default=True, nullable=False)
    requires_legal_review = Column(Boolean, default=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    procurement_records = relationship("ProcurementRecord", back_populates="pathway")

    @property
    def financial_threshold_ceiling(self):
        ceilings = {
            "DIRECT_GEM_L1": 500000.0,
            "DIRECT_PURCHASE": 500000.0,
            "L1_BIDDING_GEM": 5000000.0,
        }
        return ceilings.get(self.code, None)


class ProcurementDecision(Base, BaseModelMixin):
    """
    Official government post-validation procurement decision record.
    Connects completed and validated pilots to the procurement decision gate.
    """
    __tablename__ = "procurement_decisions"

    procurement_code = Column(String(50), unique=True, nullable=False, index=True)

    # Foreign keys
    pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id"), nullable=False, index=True)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)
    government_department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)

    decision_type = Column(String(50), nullable=False, index=True)
    decision_status = Column(String(50), default="DRAFT", nullable=False, index=True)
    rationale = Column(Text, nullable=False)
    outcome_summary = Column(Text, nullable=True)
    estimated_value = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    intended_scope = Column(Text, nullable=True)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)

    # Relationships
    pilot = relationship("Pilot", foreign_keys=[pilot_id])
    application = relationship("Application", foreign_keys=[application_id])
    challenge = relationship("Challenge", foreign_keys=[challenge_id])
    startup = relationship("Startup", foreign_keys=[startup_id])
    department = relationship("Department", foreign_keys=[government_department_id])
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    procurement_records = relationship("ProcurementRecord", back_populates="decision", cascade="all, delete-orphan")

    @property
    def decision_code(self):
        return self.procurement_code


class ProcurementRecord(Base, BaseModelMixin):
    """
    Formal government procurement transition for successfully validated innovations.
    Connects validated pilot outcomes to multi-tier approvals and contracting.
    Supports both Step 8 multi-stage procurement and Step 7 direct validation scale-up.
    """
    __tablename__ = "procurement_records"

    procurement_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: f"PROC-{uuid.uuid4().hex[:8].upper()}",
    )

    # Step 8 Foreign keys (nullable for Step 7 direct procurement)
    procurement_decision_id = Column(String(36), ForeignKey("procurement_decisions.id"), nullable=True, index=True)
    pilot_id = Column(String(36), ForeignKey("pilots.id"), nullable=True, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)
    government_department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)
    pathway_id = Column(String(36), ForeignKey("procurement_pathways.id"), nullable=True, index=True)

    # Legacy attributes for Step 7 direct procurement compatibility
    validation_id = Column(String(36), ForeignKey("validations.id"), unique=True, nullable=True, index=True)
    sanction_order_number = Column(String(100), unique=True, nullable=True)
    gem_contract_number = Column(String(100), nullable=True)
    procurement_pathway = Column(String(50), nullable=True)
    total_order_value = Column(Numeric(14, 2), nullable=True)
    order_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Core attributes (nullable/defaults for legacy backward compatibility)
    title = Column(String(255), nullable=True, default="Procurement Order")
    description = Column(Text, nullable=True)
    scope = Column(Text, nullable=True, default="")
    estimated_value = Column(Numeric(14, 2), nullable=True)
    approved_value = Column(Numeric(14, 2), nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)

    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    approval_status = Column(String(50), default="PENDING", nullable=False)
    acknowledgement_confirmed = Column(Boolean, default=False, nullable=False)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Synonym for backward compatibility with legacy department_id attribute
    department_id = synonym("government_department_id")

    def __init__(self, **kwargs):
        if "department_id" in kwargs and "government_department_id" not in kwargs:
            kwargs["government_department_id"] = kwargs.pop("department_id")
        if "procurement_code" not in kwargs or not kwargs["procurement_code"]:
            kwargs["procurement_code"] = f"PROC-{uuid.uuid4().hex[:8].upper()}"
        if "title" not in kwargs:
            kwargs["title"] = "Procurement Order"
        if "scope" not in kwargs:
            kwargs["scope"] = kwargs.get("notes") or "Direct Procurement"
        if "estimated_value" not in kwargs and "total_order_value" in kwargs:
            kwargs["estimated_value"] = kwargs["total_order_value"]
        super().__init__(**kwargs)

    # Relationships
    decision = relationship("ProcurementDecision", back_populates="procurement_records")
    pilot = relationship("Pilot", back_populates="procurement_records", foreign_keys=[pilot_id])
    startup = relationship("Startup", back_populates="procurement_records", foreign_keys=[startup_id])
    department = relationship("Department", back_populates="procurement_records", foreign_keys=[government_department_id])
    pathway = relationship("ProcurementPathway", back_populates="procurement_records")
    creator = relationship("User", foreign_keys=[created_by])
    validation = relationship("Validation", foreign_keys=[validation_id])

    approvals = relationship("ProcurementApproval", back_populates="procurement", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="procurement")
    documents = relationship("ProcurementDocument", back_populates="procurement", cascade="all, delete-orphan")


class ProcurementApproval(Base, BaseModelMixin):
    """
    Audit log of approvals required by the configured procurement pathway.
    """
    __tablename__ = "procurement_approvals"

    procurement_id = Column(String(36), ForeignKey("procurement_records.id"), nullable=False, index=True)
    approval_tier = Column(Integer, default=1, nullable=False)
    approval_type = Column(String(50), nullable=False, index=True)
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Relationships
    procurement = relationship("ProcurementRecord", back_populates="approvals")
    approver = relationship("User", foreign_keys=[approver_id])


class Contract(Base, BaseModelMixin):
    """
    Legally structured operational public procurement contract between
    a Government Department and an Awarded Startup.
    """
    __tablename__ = "contracts"

    contract_code = Column(String(50), unique=True, nullable=False, index=True)
    procurement_id = Column(String(36), ForeignKey("procurement_records.id"), nullable=False, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)
    government_department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    contract_type = Column(String(50), default="SERVICE", nullable=False)
    contract_value = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    description = Column(Text, nullable=True)
    scope = Column(Text, nullable=False)
    terms_summary = Column(Text, nullable=False)

    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)

    executed_at = Column(DateTime, nullable=True)
    terminated_at = Column(DateTime, nullable=True)
    termination_reason = Column(Text, nullable=True)
    suspension_reason = Column(Text, nullable=True)

    # Relationships
    procurement = relationship("ProcurementRecord", back_populates="contracts")
    startup = relationship("Startup", foreign_keys=[startup_id])
    department = relationship("Department", foreign_keys=[government_department_id])
    creator = relationship("User", foreign_keys=[created_by])

    milestones = relationship("ContractMilestone", back_populates="contract", cascade="all, delete-orphan", order_by="ContractMilestone.sequence_number.asc()")
    payment_tranches = relationship("PaymentTranche", back_populates="contract", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="contract")
    documents = relationship("ProcurementDocument", back_populates="contract", cascade="all, delete-orphan")

    @property
    def tranches(self):
        return self.payment_tranches

    @tranches.setter
    def tranches(self, val):
        self.payment_tranches = val


class ContractMilestone(Base, BaseModelMixin):
    """
    Deliverable milestone within a contract. Percentages must sum to 100%
    and amounts must sum to the approved contract value.
    """
    __tablename__ = "contract_milestones"

    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False, index=True)
    milestone_code = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_number = Column(Integer, default=1, nullable=False)

    due_date = Column(Date, nullable=True, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)

    status = Column(String(50), default="NOT_STARTED", nullable=False, index=True)
    acceptance_status = Column(String(50), default="PENDING", nullable=False)
    rejection_reason = Column(Text, nullable=True)
    deliverable_requirements = Column(Text, nullable=True)
    completion_percentage = Column(Numeric(5, 2), default=0.0, nullable=True)
    submission_notes = Column(Text, nullable=True)
    deliverable_proof_url = Column(String(500), nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    contract = relationship("Contract", back_populates="milestones")
    payment_tranche = relationship("PaymentTranche", back_populates="milestone", uselist=False, cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="milestone")


class PaymentTranche(Base, BaseModelMixin):
    """
    Financial payment tranche tied to a contract milestone.
    Transitions to ELIGIBLE when milestone is accepted (never auto-paid).
    """
    __tablename__ = "payment_tranches"

    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False, index=True)
    milestone_id = Column(String(36), ForeignKey("contract_milestones.id"), nullable=False, index=True)
    tranche_code = Column(String(50), unique=True, nullable=False, index=True)

    description = Column(Text, nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    due_date = Column(Date, nullable=True)

    status = Column(String(50), default="SCHEDULED", nullable=False, index=True)
    hold_reason = Column(Text, nullable=True)
    payment_reference = Column(String(100), nullable=True)
    payment_mode = Column(String(50), nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    contract = relationship("Contract", back_populates="payment_tranches")
    milestone = relationship("ContractMilestone", back_populates="payment_tranche")
    invoices = relationship("Invoice", back_populates="tranche")


class Invoice(Base, BaseModelMixin):
    """
    Invoice submitted by startup against an ELIGIBLE payment tranche.
    Reviewed, approved, processed, and marked PAID through explicit government actions.
    """
    __tablename__ = "invoices"

    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False, index=True)
    milestone_id = Column(String(36), ForeignKey("contract_milestones.id"), nullable=False, index=True)
    payment_tranche_id = Column(String(36), ForeignKey("payment_tranches.id"), nullable=False, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)

    amount = Column(Numeric(14, 2), nullable=False)  # Base amount
    tax_amount = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)  # Base + Tax
    currency = Column(String(10), default="INR", nullable=False)

    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True, index=True)
    description = Column(Text, nullable=True)

    invoice_file = Column(String(500), nullable=True)
    file_storage_key = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    status = Column(String(50), default="DRAFT", nullable=False, index=True)

    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    review_comments = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Relationships
    contract = relationship("Contract", back_populates="invoices")
    milestone = relationship("ContractMilestone", back_populates="invoices")
    tranche = relationship("PaymentTranche", back_populates="invoices")
    startup = relationship("Startup", foreign_keys=[startup_id])


class ProcurementDocument(Base, BaseModelMixin):
    """
    Secure document repository for procurement justifications, approvals, contracts, and invoices.
    """
    __tablename__ = "procurement_documents"

    procurement_id = Column(String(36), ForeignKey("procurement_records.id"), nullable=True, index=True)
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=True, index=True)

    document_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    storage_key = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)

    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    procurement = relationship("ProcurementRecord", back_populates="documents")
    contract = relationship("Contract", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])
