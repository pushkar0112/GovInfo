import enum
from sqlalchemy import Column, String, Text, Numeric, Integer, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class PilotStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    AGREEMENT_SIGNED = "AGREEMENT_SIGNED"
    ACTIVE = "ACTIVE"
    UNDER_INDEPENDENT_AUDIT = "UNDER_INDEPENDENT_AUDIT"
    SUCCESSFULLY_VALIDATED = "SUCCESSFULLY_VALIDATED"
    FAILED_VALIDATION = "FAILED_VALIDATION"
    TERMINATED = "TERMINATED"


class Pilot(Base, BaseModelMixin):
    """
    Structured pilot project deployed in a real-world public department environment.
    """
    __tablename__ = "pilots"

    application_id = Column(String(36), ForeignKey("applications.id"), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    scope_of_work = Column(Text, nullable=False)
    duration_weeks = Column(Integer, default=12, nullable=False)
    sandbox_location = Column(String(255), nullable=False)  # e.g., "District Hospital Jaipur"
    approved_budget = Column(Numeric(14, 2), nullable=False)

    status = Column(
        SQLEnum(PilotStatus, name="pilot_status_enum", native_enum=False),
        default=PilotStatus.INITIATED,
        nullable=False,
        index=True,
    )
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="pilot")
    milestones = relationship("Milestone", back_populates="pilot")
    kpis = relationship("KPI", back_populates="pilot")
    validation = relationship("Validation", back_populates="pilot", uselist=False)
