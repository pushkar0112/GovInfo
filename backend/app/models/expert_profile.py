import enum
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ExpertAvailability(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    INACTIVE = "INACTIVE"


class ExpertProfile(Base, BaseModelMixin):
    """
    Independent Expert Evaluator profile information.
    Maintained directly by EXPERT users and viewed by GOVERNMENT/ADMIN users.
    """
    __tablename__ = "expert_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    organization = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    expertise_domains = Column(Text, nullable=True)  # JSON array string, e.g. '["AI", "IoT", "CleanTech"]'
    years_of_experience = Column(Integer, default=0, nullable=False)
    professional_summary = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    availability_status = Column(String(50), default="AVAILABLE", nullable=False)

    # Relationships
    user = relationship("User", back_populates="expert_profile")

    def __repr__(self) -> str:
        return f"<ExpertProfile user_id={self.user_id} org={self.organization} status={self.availability_status}>"
