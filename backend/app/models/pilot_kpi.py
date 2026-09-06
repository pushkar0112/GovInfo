import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Numeric,
    Integer,
    Float,
    Boolean,
    Date,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin, utc_now


class KPICategory(str, enum.Enum):
    IMPACT = "IMPACT"
    EFFICIENCY = "EFFICIENCY"
    QUALITY = "QUALITY"
    COST = "COST"
    TIME = "TIME"
    ADOPTION = "ADOPTION"
    RELIABILITY = "RELIABILITY"
    SECURITY = "SECURITY"
    SUSTAINABILITY = "SUSTAINABILITY"
    USER_SATISFACTION = "USER_SATISFACTION"
    OTHER = "OTHER"


class KPIMeasurementType(str, enum.Enum):
    NUMBER = "NUMBER"
    PERCENTAGE = "PERCENTAGE"
    CURRENCY = "CURRENCY"
    TIME = "TIME"
    COUNT = "COUNT"
    RATIO = "RATIO"
    SCORE = "SCORE"
    BOOLEAN = "BOOLEAN"


class KPIDirection(str, enum.Enum):
    HIGHER_IS_BETTER = "HIGHER_IS_BETTER"
    LOWER_IS_BETTER = "LOWER_IS_BETTER"
    TARGET_VALUE = "TARGET_VALUE"


class TargetOperator(str, enum.Enum):
    GREATER_THAN = "GREATER_THAN"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN = "LESS_THAN"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
    EQUAL = "EQUAL"


class KPIStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    MEASUREMENT_IN_PROGRESS = "MEASUREMENT_IN_PROGRESS"
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    VALIDATED = "VALIDATED"
    NOT_ACHIEVED = "NOT_ACHIEVED"
    INCONCLUSIVE = "INCONCLUSIVE"


class MeasurementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"


class EvidenceType(str, enum.Enum):
    DATASET = "DATASET"
    TELEMETRY_LOG = "TELEMETRY_LOG"
    SURVEY_REPORT = "SURVEY_REPORT"
    REPORT = "REPORT"
    DASHBOARD_EXPORT = "DASHBOARD_EXPORT"
    SYSTEM_LOG = "SYSTEM_LOG"
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"
    SURVEY = "SURVEY"
    DATABASE_EXPORT = "DATABASE_EXPORT"
    DOCUMENT = "DOCUMENT"
    OTHER = "OTHER"


class EvidenceStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PilotKPI(Base, BaseModelMixin):
    """
    Quantitative performance indicator for validating operational pilot outcomes.
    """
    __tablename__ = "pilot_kpis"

    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default=KPICategory.IMPACT.value, nullable=False, index=True)
    measurement_type = Column(String(50), default=KPIMeasurementType.NUMBER.value, nullable=False)
    unit = Column(String(50), nullable=False)

    baseline_value = Column(Numeric(14, 4), nullable=True)
    baseline_date = Column(Date, nullable=True)
    baseline_source = Column(String(255), nullable=True)
    baseline_notes = Column(Text, nullable=True)

    target_value = Column(Numeric(14, 4), nullable=False)
    target_date = Column(Date, nullable=True)
    target_operator = Column(String(50), default=TargetOperator.GREATER_THAN_OR_EQUAL.value, nullable=False)
    direction = Column(String(50), default=KPIDirection.HIGHER_IS_BETTER.value, nullable=False)
    weight = Column(Numeric(5, 2), default=1.0, nullable=False)

    status = Column(String(50), default=KPIStatus.DRAFT.value, nullable=False, index=True)
    verification_method = Column(Text, nullable=True)
    data_source = Column(String(255), nullable=True)
    target_description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    pilot = relationship("Pilot", back_populates="pilot_kpis")
    creator = relationship("User", foreign_keys=[created_by])
    measurements = relationship(
        "KPIMeasurement",
        back_populates="kpi",
        cascade="all, delete-orphan",
        order_by="KPIMeasurement.measurement_date.desc()",
    )
    evidences = relationship(
        "KPIEvidence",
        back_populates="kpi",
        cascade="all, delete-orphan",
        order_by="KPIEvidence.submitted_at.desc()",
    )
    validations = relationship(
        "KPIValidation",
        back_populates="kpi",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_pilot_kpis_pilot_status", "pilot_id", "status"),
        Index("ix_pilot_kpis_cat", "category"),
    )


class KPIMeasurement(Base, BaseModelMixin):
    """
    Quantitative or empirical data point logged during or upon pilot completion.
    """
    __tablename__ = "kpi_measurements"

    kpi_id = Column(String(36), ForeignKey("pilot_kpis.id", ondelete="CASCADE"), nullable=False, index=True)
    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)

    measured_value = Column(Numeric(14, 4), nullable=False)
    measurement_date = Column(Date, nullable=False, index=True)
    reporting_period_start = Column(Date, nullable=True)
    reporting_period_end = Column(Date, nullable=True)

    measured_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    measurement_method = Column(Text, nullable=True)
    data_sources_used = Column(Text, nullable=True)
    sample_size = Column(Integer, nullable=True)
    calculation_notes = Column(Text, nullable=True)
    status = Column(String(50), default=MeasurementStatus.SUBMITTED.value, nullable=False, index=True)

    # Relationships
    kpi = relationship("PilotKPI", back_populates="measurements")
    pilot = relationship("Pilot")
    measurer = relationship("User", foreign_keys=[measured_by])
    evidences = relationship("KPIEvidence", back_populates="measurement")

    __table_args__ = (
        Index("ix_kpi_meas_kpi_date", "kpi_id", "measurement_date"),
    )


class KPIEvidence(Base, BaseModelMixin):
    """
    Auditable technical proof, telemetry archive, sensor logs, or survey report supporting KPI achievement.
    """
    __tablename__ = "kpi_evidences"

    kpi_id = Column(String(36), ForeignKey("pilot_kpis.id", ondelete="CASCADE"), nullable=False, index=True)
    measurement_id = Column(String(36), ForeignKey("kpi_measurements.id", ondelete="SET NULL"), nullable=True, index=True)
    pilot_id = Column(String(36), ForeignKey("pilots.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    evidence_type = Column(String(50), default=EvidenceType.DATASET.value, nullable=False)
    file_name = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    source = Column(String(255), nullable=True)

    status = Column(String(50), default=EvidenceStatus.UPLOADED.value, nullable=False, index=True)
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    kpi = relationship("PilotKPI", back_populates="evidences")
    measurement = relationship("KPIMeasurement", back_populates="evidences")
    pilot = relationship("Pilot")
    submitter = relationship("User", foreign_keys=[submitted_by])

    __table_args__ = (
        Index("ix_kpi_evid_kpi_ver", "kpi_id", "version"),
    )
