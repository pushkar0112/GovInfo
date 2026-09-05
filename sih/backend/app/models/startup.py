import enum
from sqlalchemy import Column, String, Boolean, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ProductStage(str, enum.Enum):
    IDEA = "IDEA"
    PROTOTYPE = "PROTOTYPE"
    MVP = "MVP"
    PRODUCTION = "PRODUCTION"
    SCALED = "SCALED"


class RecognitionStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    NOT_VERIFIED = "NOT_VERIFIED"
    EXPIRED = "EXPIRED"


class Startup(Base, BaseModelMixin):
    """
    Startup entity participating in government challenges, pilots, and procurement.
    Maintains DPIIT recognition status, product readiness, and compliance attributes.
    """
    __tablename__ = "startups"

    # User association (primary founder / administrator)
    user_id = Column(
        String(36),
        ForeignKey("users.id", use_alter=True, name="fk_startups_user_id"),
        nullable=True,
        index=True,
    )

    # Organization profile
    startup_name = Column(String(255), nullable=True, index=True)
    company_name = Column(String(255), nullable=True, index=True)  # Legacy column maintained for compatibility
    legal_name = Column(String(255), nullable=True)
    founded_year = Column(Integer, nullable=True)
    website = Column(String(255), nullable=True)
    headquarters = Column(String(255), nullable=True)
    team_size = Column(String(50), nullable=True)  # e.g., "1-10", "11-50", "51-200"

    # DPIIT / Statutory Recognition
    dpiit_recognition_number = Column(String(100), nullable=True, index=True)
    dpiit_number = Column(String(100), nullable=True)  # Legacy column
    recognition_status = Column(String(50), default="PENDING", nullable=False, index=True)
    dpiit_recognized = Column(Boolean, default=False, nullable=False)  # Legacy column
    cin_number = Column(String(50), nullable=True)

    # Solution & Technology
    description = Column(Text, nullable=True)
    technology_domains = Column(Text, nullable=True)  # JSON-encoded list of domains (e.g., ["WaterTech", "AI"])
    solution_categories = Column(Text, nullable=True)  # JSON-encoded list of categories
    product_stage = Column(String(50), default="MVP", nullable=False, index=True)
    stage = Column(String(50), default="MVP", nullable=True)  # Legacy column
    sector = Column(String(100), default="CivicTech", nullable=True)  # Legacy column

    # Operating Scope & Experience
    operating_regions = Column(Text, nullable=True)  # JSON-encoded list of states/regions
    previous_deployments = Column(Text, nullable=True)
    government_experience = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)
    cybersecurity_certifications = Column(Text, nullable=True)

    # Contact Details
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)

    # Relationships
    users = relationship("User", back_populates="startup", foreign_keys="User.startup_id")
    applications = relationship("Application", back_populates="startup", cascade="all, delete-orphan")
    procurement_records = relationship("ProcurementRecord", back_populates="startup")

    # ==========================================================================
    # Backward Compatibility Harmonizers
    # ==========================================================================

    @property
    def display_name(self) -> str:
        return self.startup_name or self.company_name or "Unnamed Startup"

    def sync_legacy_fields(self):
        """Synchronize new and legacy columns to prevent drift."""
        if self.startup_name and not self.company_name:
            self.company_name = self.startup_name
        elif self.company_name and not self.startup_name:
            self.startup_name = self.company_name

        if self.dpiit_recognition_number and not self.dpiit_number:
            self.dpiit_number = self.dpiit_recognition_number
        elif self.dpiit_number and not self.dpiit_recognition_number:
            self.dpiit_recognition_number = self.dpiit_number

        if self.product_stage:
            self.stage = self.product_stage
        elif self.stage:
            self.product_stage = self.stage

        if self.recognition_status == RecognitionStatus.VERIFIED.value:
            self.dpiit_recognized = True
        elif self.dpiit_recognized:
            self.recognition_status = RecognitionStatus.VERIFIED.value
