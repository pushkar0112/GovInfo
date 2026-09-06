from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from app.models.procurement import (
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


# ==============================================================================
# Procurement Pathway Schemas
# ==============================================================================

class ProcurementPathwayCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10)
    authority_level: str = Field(..., min_length=2, max_length=100)
    requires_competitive_process: bool = False
    requires_financial_approval: bool = True
    requires_legal_review: bool = True
    active: bool = True


class ProcurementPathwayResponse(BaseModel):
    id: str
    name: str
    code: str
    description: str
    authority_level: str
    requires_competitive_process: bool
    requires_financial_approval: bool
    requires_legal_review: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Procurement Decision Schemas
# ==============================================================================

class ProcurementDecisionCreateRequest(BaseModel):
    decision_type: DecisionType
    rationale: Optional[str] = Field(None, description="Statutory justification and rationale")
    justification: Optional[str] = None
    divergence_justification: Optional[str] = None
    conditional_scope: Optional[str] = None
    outcome_summary: Optional[str] = None
    estimated_value: Optional[float] = Field(None, ge=0.0)
    currency: str = Field("INR", max_length=10)
    quantity: int = Field(1, ge=1)
    intended_scope: Optional[str] = None

    @field_validator("rationale", mode="before")
    @classmethod
    def fallback_rationale(cls, v: Any, info) -> Any:
        return v

    def model_post_init(self, __context: Any) -> None:
        if not self.rationale and self.justification:
            self.rationale = self.justification
        if not self.rationale:
            self.rationale = "Statutory procurement progression rationale as validated in pilot sandbox."


class ProcurementDecisionUpdateRequest(BaseModel):
    decision_type: Optional[DecisionType] = None
    rationale: Optional[str] = Field(None, min_length=10)
    outcome_summary: Optional[str] = None
    estimated_value: Optional[float] = Field(None, ge=0.0)
    currency: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=1)
    intended_scope: Optional[str] = None


class ProcurementDecisionResponse(BaseModel):
    id: str
    procurement_code: str
    pilot_id: str
    application_id: str
    challenge_id: str
    startup_id: str
    government_department_id: str
    decision_type: str
    decision_status: str
    rationale: str
    outcome_summary: Optional[str]
    estimated_value: Optional[float]
    currency: str
    quantity: int
    intended_scope: Optional[str]
    created_by: str
    reviewed_by: Optional[str]
    decided_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Supplemental details
    pilot_code: Optional[str] = None
    pilot_title: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    challenge_title: Optional[str] = None
    validator_assessment: Optional[str] = None
    pilot_success_status: Optional[str] = None
    decision_code: Optional[str] = None
    pilot_validation_assessment: Optional[str] = None

    class Config:
        from_attributes = True


# ==============================================================================
# Procurement Record Schemas
# ==============================================================================

class ProcurementRecordCreateRequest(BaseModel):
    procurement_decision_id: Optional[str] = None
    decision_id: Optional[str] = None
    pathway_id: Optional[str] = None
    pathway_code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    estimated_value: float = Field(..., gt=0.0)
    approved_value: Optional[float] = Field(None, ge=0.0)
    currency: str = Field("INR", max_length=10)
    quantity: int = Field(1, ge=1)
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    acknowledgement_confirmed: Optional[bool] = None
    statutory_rules_acknowledged: Optional[bool] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.procurement_decision_id and self.decision_id:
            self.procurement_decision_id = self.decision_id
        if self.statutory_rules_acknowledged is not None and self.acknowledgement_confirmed is None:
            self.acknowledgement_confirmed = self.statutory_rules_acknowledged
        if not self.title:
            self.title = f"Procurement Record ({self.pathway_code or 'Direct'})"
        if not self.scope:
            self.scope = "Full operational procurement deployment as validated in pilot."


class ProcurementRecordUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    estimated_value: Optional[float] = Field(None, gt=0.0)
    approved_value: Optional[float] = Field(None, ge=0.0)
    start_date: Optional[date] = None
    planned_end_date: Optional[date] = None


class ProcurementApprovalResponse(BaseModel):
    id: str
    procurement_id: str
    approval_tier: int = 1
    approval_type: str
    approver_id: Optional[str]
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    status: str
    comments: Optional[str]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ProcurementApprovalActionRequest(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, or REQUESTED_CHANGES")
    comments: Optional[str] = None


class ProcurementRecordResponse(BaseModel):
    id: str
    procurement_code: str
    procurement_decision_id: str
    pilot_id: str
    startup_id: str
    government_department_id: str
    pathway_id: str
    title: str
    description: Optional[str]
    scope: str
    estimated_value: float
    approved_value: Optional[float]
    currency: str
    quantity: int
    start_date: Optional[date]
    planned_end_date: Optional[date]
    status: str
    approval_status: str
    acknowledgement_confirmed: bool
    created_by: str
    created_at: datetime
    updated_at: datetime

    # Expanded metadata
    pathway_name: Optional[str] = None
    pathway_code: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    pilot_code: Optional[str] = None
    pathway_warning: Optional[str] = None
    statutory_rules_caveat: Optional[str] = None
    approvals: List[ProcurementApprovalResponse] = []
    pilot_title: Optional[str] = None
    contract_id: Optional[str] = None
    contract_code: Optional[str] = None
    approvals: List[ProcurementApprovalResponse] = []

    class Config:
        from_attributes = True


# ==============================================================================
# Contract & Milestone Schemas
# ==============================================================================

class MilestoneItemInput(BaseModel):
    milestone_code: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sequence_number: Optional[int] = None
    sequence_order: Optional[int] = None
    due_date: Optional[date] = None
    amount: Optional[float] = None
    allocated_amount: Optional[float] = None
    percentage: float = Field(..., gt=0.0, le=100.0)
    deliverable_requirements: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.sequence_number is None and self.sequence_order is not None:
            self.sequence_number = self.sequence_order
        elif self.sequence_number is None:
            self.sequence_number = 1

        if self.amount is None and self.allocated_amount is not None:
            self.amount = self.allocated_amount
        elif self.amount is None:
            self.amount = 0.0

        if not self.milestone_code:
            self.milestone_code = f"M-{self.sequence_number}"


ContractMilestoneCreateRequest = MilestoneItemInput


class ContractCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    contract_type: ContractType = ContractType.SERVICE
    contract_value: float = Field(..., gt=0.0)
    currency: str = Field("INR", max_length=10)
    start_date: date
    end_date: date
    description: Optional[str] = None
    scope: Optional[str] = None
    terms_summary: Optional[str] = None
    payment_terms: Optional[str] = None
    milestones: List[MilestoneItemInput] = Field(..., min_length=1)

    def model_post_init(self, __context: Any) -> None:
        if not self.scope:
            self.scope = "Operational execution as validated in pilot sandbox."
        if not self.terms_summary:
            self.terms_summary = "Milestone-based delivery and verification."

    @field_validator("end_date")
    def validate_dates(cls, v, values):
        if "start_date" in values.data and v <= values.data["start_date"]:
            raise ValueError("Contract end date must be strictly after the start date.")
        return v


class ContractUpdateRequest(BaseModel):
    title: Optional[str] = None
    contract_type: Optional[ContractType] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    terms_summary: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ContractTerminateRequest(BaseModel):
    termination_reason: str = Field(..., min_length=10, description="Mandatory statutory justification for termination")


class ContractSuspendRequest(BaseModel):
    suspension_reason: str = Field(..., min_length=10, description="Mandatory reason for contract suspension")


class ContractMilestoneResponse(BaseModel):
    id: str
    contract_id: str
    milestone_code: str
    title: str
    description: Optional[str]
    sequence_number: int
    due_date: Optional[date] = None
    amount: float
    percentage: float
    status: str
    acceptance_status: str
    rejection_reason: Optional[str]
    deliverable_requirements: Optional[str]
    completion_percentage: Optional[float] = None
    submission_notes: Optional[str] = None
    deliverable_proof_url: Optional[str] = None
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Linked payment tranche info
    tranche_id: Optional[str] = None
    tranche_code: Optional[str] = None
    tranche_status: Optional[str] = None

    class Config:
        from_attributes = True


class ContractMilestoneReviewRequest(BaseModel):
    action: str = Field(..., description="ACCEPT or REJECT")
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None


class PaymentTrancheResponse(BaseModel):
    id: str
    contract_id: str
    milestone_id: str
    tranche_code: str
    description: Optional[str]
    amount: float
    percentage: float
    currency: str
    due_date: Optional[date]
    status: str
    hold_reason: Optional[str]
    payment_reference: Optional[str] = None
    payment_mode: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Supplemental info
    milestone_code: Optional[str] = None
    milestone_title: Optional[str] = None
    startup_name: Optional[str] = None
    contract_code: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentTrancheHoldRequest(BaseModel):
    hold_reason: str = Field(..., min_length=5, description="Reason for placing payment tranche on hold")


class ContractResponse(BaseModel):
    id: str
    contract_code: str
    procurement_id: str
    startup_id: str
    government_department_id: str
    title: str
    contract_type: str
    contract_value: float
    currency: str
    start_date: date
    end_date: date
    description: Optional[str]
    scope: str
    terms_summary: str
    status: str
    created_by: str
    executed_at: Optional[datetime]
    terminated_at: Optional[datetime]
    termination_reason: Optional[str]
    suspension_reason: Optional[str]
    created_at: datetime

    # Supplemental info
    procurement_code: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    milestones: List[ContractMilestoneResponse] = []
    tranches: List[PaymentTrancheResponse] = []
    payment_tranches: List[PaymentTrancheResponse] = []
    traceability: Optional[Dict[str, Any]] = None

    # Aggregates
    milestone_progress: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0

    class Config:
        from_attributes = True


# ==============================================================================
# Invoice Schemas
# ==============================================================================

class InvoiceSubmitRequest(BaseModel):
    tranche_id: Optional[str] = None
    invoice_number: str = Field(..., min_length=3, max_length=100)
    amount: Optional[float] = None
    basic_amount: Optional[float] = None
    tax_amount: float = Field(0.0, ge=0.0, description="Applicable GST/taxes")
    currency: str = Field("INR", max_length=10)
    invoice_date: date
    due_date: Optional[date] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    invoice_file_url: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.amount is None and self.basic_amount is not None:
            self.amount = self.basic_amount
        if not self.description and self.notes:
            self.description = self.notes


class InvoiceReviewRequest(BaseModel):
    action: Optional[str] = Field(None, description="APPROVE or REJECT")
    status: Optional[str] = None
    review_comments: Optional[str] = None
    rejection_reason: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.action and self.status:
            self.action = self.status


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    contract_id: str
    milestone_id: str
    payment_tranche_id: str
    startup_id: str
    amount: float
    tax_amount: float
    total_amount: float
    currency: str
    invoice_date: date
    due_date: Optional[date]
    description: Optional[str]
    invoice_file: Optional[str]
    file_storage_key: Optional[str]
    file_size_bytes: Optional[int]
    status: str
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    review_comments: Optional[str]
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Supplemental info
    contract_code: Optional[str] = None
    contract_title: Optional[str] = None
    milestone_code: Optional[str] = None
    milestone_title: Optional[str] = None
    tranche_code: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


# ==============================================================================
# Document Schemas
# ==============================================================================

class ProcurementDocumentResponse(BaseModel):
    id: str
    procurement_id: Optional[str]
    contract_id: Optional[str]
    document_type: str
    title: str
    file_name: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    uploaded_by: str
    uploader_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# Traceability & Analytics Schemas
# ==============================================================================

class TraceabilityStage(BaseModel):
    stage_id: str
    stage_name: str
    code: Optional[str]
    title: Optional[str]
    status: str
    completed: bool
    url: Optional[str] = None
    timestamp: Optional[datetime] = None
    details: Dict[str, Any] = {}


class ProcurementTraceabilityResponse(BaseModel):
    procurement_id: Optional[str] = None
    pilot_id: str
    stages: List[TraceabilityStage] = []


class ProcurementDashboardStatsResponse(BaseModel):
    total_decisions: int = 0
    active_procurements: int = 0
    approvals_pending: int = 0
    pending_approvals_count: int = 0
    contracts_count: int = 0
    active_contracts_count: int = 0
    total_contract_value: float = 0.0
    payment_eligible_value: float = 0.0
    invoices_pending_count: int = 0
    pending_invoices_count: int = 0
    paid_amount: float = 0.0
    disbursed_amount: float = 0.0
