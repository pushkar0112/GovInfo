import enum
from sqlalchemy import Column, String, Text, Numeric, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ProcurementPathway(str, enum.Enum):
    GEM_STARTUP_RUNWAY = "GEM_STARTUP_RUNWAY"          # Government e-Marketplace direct pathway
    INNOVATION_EXEMPTION = "INNOVATION_EXEMPTION"      # Rule 149 / Rule 194 exemption based on validation
    LIMITED_TENDER = "LIMITED_TENDER"
    RATE_CONTRACT = "RATE_CONTRACT"
    SCALE_UP_EXPANSION = "SCALE_UP_EXPANSION"


class ProcurementStatus(str, enum.Enum):
    DRAFT_PURCHASE_INTENT = "DRAFT_PURCHASE_INTENT"
    SANCTION_ORDER_ISSUED = "SANCTION_ORDER_ISSUED"
    CONTRACT_EXECUTED = "CONTRACT_EXECUTED"
    FULFILLMENT_IN_PROGRESS = "FULFILLMENT_IN_PROGRESS"
    DELIVERED_AND_SETTLED = "DELIVERED_AND_SETTLED"


class ProcurementRecord(Base, BaseModelMixin):
    """
    Formal government procurement transition for successfully validated innovations.
    Connects to GeM / ministry financial sanctions.
    """
    __tablename__ = "procurement_records"

    validation_id = Column(String(36), ForeignKey("validations.id"), unique=True, nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False, index=True)
    startup_id = Column(String(36), ForeignKey("startups.id"), nullable=False, index=True)

    sanction_order_number = Column(String(100), unique=True, nullable=True)
    gem_contract_number = Column(String(100), nullable=True)
    procurement_pathway = Column(
        SQLEnum(ProcurementPathway, name="procurement_pathway_enum", native_enum=False),
        default=ProcurementPathway.GEM_STARTUP_RUNWAY,
        nullable=False,
    )
    total_order_value = Column(Numeric(14, 2), nullable=False)
    status = Column(
        SQLEnum(ProcurementStatus, name="procurement_status_enum", native_enum=False),
        default=ProcurementStatus.DRAFT_PURCHASE_INTENT,
        nullable=False,
    )
    order_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    validation = relationship("Validation", back_populates="procurement_record")
    department = relationship("Department", back_populates="procurement_records")
    startup = relationship("Startup", back_populates="procurement_records")
