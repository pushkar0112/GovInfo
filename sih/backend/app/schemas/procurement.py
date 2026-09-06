from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.procurement import ProcurementPathwayLegacy as ProcurementPathway, ProcurementStatus


class ValidationCreateRequest(BaseModel):
    """
    Payload for independent testing agencies (STQC, IITs) to certify pilot evidence.
    """
    pilot_id: str
    independent_agency_name: str = Field(..., min_length=3, description="e.g. STQC / IIT Delhi")
    validation_report_summary: str = Field(..., min_length=20)
    outcomes_satisfied: bool = Field(default=True)
    recommended_for_procurement: bool = Field(default=True)


class ValidationResponse(BaseModel):
    id: str
    pilot_id: str
    pilot_title: Optional[str] = None
    startup_name: Optional[str] = None
    department_name: Optional[str] = None
    independent_agency_name: str
    validation_report_summary: str
    outcomes_satisfied: bool
    recommended_for_procurement: bool
    certificate_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProcurementCreateRequest(BaseModel):
    """
    Payload for procurement officers to execute a direct purchase sanction.
    """
    validation_id: str
    sanction_order_number: str = Field(..., min_length=3, description="e.g., SANCTION-2024-MOHFW-008")
    gem_contract_number: Optional[str] = Field(default=None, description="e.g., GEMC-5116877-092")
    procurement_pathway: ProcurementPathway = Field(default=ProcurementPathway.GEM_STARTUP_RUNWAY)
    total_order_value: float = Field(..., gt=0.0)
    order_date: Optional[date] = None
    notes: Optional[str] = None


class ProcurementResponse(BaseModel):
    id: str
    validation_id: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    startup_id: str
    startup_name: Optional[str] = None
    sanction_order_number: Optional[str] = None
    gem_contract_number: Optional[str] = None
    procurement_pathway: Optional[str] = None
    total_order_value: float
    status: Optional[str] = None
    order_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
