import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.core.database import Base


def generate_uuid() -> str:
    """Generate a standard UUID4 string."""
    return str(uuid.uuid4())


def utc_now() -> datetime:
    """Return timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


class BaseModelMixin:
    """
    Common base mixin providing UUID primary keys and timestamp tracking
    across all GovInnovate domain entities.
    """
    id = Column(
        String(36),
        primary_key=True,
        default=generate_uuid,
        index=True,
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
