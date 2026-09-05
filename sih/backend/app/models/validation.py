from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Validation(Base, BaseModelMixin):
    """
    Independent 3rd-party validation and audit of pilot outcomes and KPI metrics.
    Serves as legal proof for direct procurement exemption pathways (e.g. GeM, Rule 194/149).
    """
    __tablename__ = "validations"

    pilot_id = Column(String(36), ForeignKey("pilots.id"), unique=True, nullable=False, index=True)
    validator_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    independent_agency_name = Column(String(255), nullable=False)  # e.g., "IIT Delhi Dept of CS / STQC"
    validation_report_summary = Column(Text, nullable=False)
    outcomes_satisfied = Column(Boolean, default=False, nullable=False)
    recommended_for_procurement = Column(Boolean, default=False, nullable=False)
    certificate_hash = Column(String(128), nullable=True)  # SHA-256 integrity hash of audit proof

    # Relationships
    pilot = relationship("Pilot", back_populates="validation")
    validator = relationship("User", foreign_keys=[validator_id])
    procurement_record = relationship("ProcurementRecord", back_populates="validation", uselist=False)
