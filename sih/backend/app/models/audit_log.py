from sqlalchemy import Column, String, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class AuditLog(Base, BaseModelMixin):
    """
    Immutable audit trail recording every state transition, score submission,
    authentication event, and administrative decision for complete governance transparency.
    """
    __tablename__ = "audit_logs"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "USER_REGISTERED", "USER_LOGGED_IN", "USER_LOGGED_OUT"
    entity_type = Column(String(100), nullable=False, index=True)  # e.g., "User", "Challenge", "Pilot"
    entity_id = Column(String(36), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON-encoded metadata

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Backward compatibility property for details_json
    @property
    def details_json(self) -> str:
        return self.metadata_json or ""

    @details_json.setter
    def details_json(self, value: str):
        self.metadata_json = value
