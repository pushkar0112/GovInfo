from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Department(Base, BaseModelMixin):
    """
    Government Ministry or Department that posts problem statements
    and initiates innovation challenges.
    """
    __tablename__ = "departments"

    name = Column(String(255), nullable=False, unique=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)  # e.g., "MOHFW-01"
    ministry = Column(String(255), nullable=False)
    state_or_central = Column(String(50), default="Central", nullable=False)
    state = Column(String(100), nullable=True)
    contact_email = Column(String(255), nullable=False)
    nodal_officer_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    officers = relationship("User", back_populates="department", foreign_keys="User.department_id")
    challenges = relationship("Challenge", back_populates="department")
    procurement_records = relationship("ProcurementRecord", back_populates="department")
