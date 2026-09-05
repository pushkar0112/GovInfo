from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.security import UserRole
from app.models.base import BaseModelMixin


class User(Base, BaseModelMixin):
    """
    Platform user entity supporting RBAC across government officials, startups,
    evaluators, validators, procurement officers, and admins.
    """
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(
        SQLEnum(UserRole, name="user_role_enum", native_enum=False),
        default=UserRole.STARTUP,
        nullable=False,
        index=True,
    )
    organization_name = Column(String(255), nullable=True)
    organization_id = Column(String(36), nullable=True, index=True)
    designation = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)
    domain_expertise = Column(String(500), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Optional association with a government department or startup
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    startup_id = Column(
        String(36),
        ForeignKey("startups.id", use_alter=True, name="fk_users_startup_id"),
        nullable=True,
    )

    # Relationships
    department = relationship("Department", back_populates="officers", foreign_keys=[department_id])
    startup = relationship("Startup", back_populates="users", foreign_keys=[startup_id])
    challenges_created = relationship("Challenge", back_populates="creator", foreign_keys="Challenge.created_by")

    # Backward compatibility property for hashed_password
    @property
    def hashed_password(self) -> str:
        return self.password_hash

    @hashed_password.setter
    def hashed_password(self, value: str):
        self.password_hash = value
