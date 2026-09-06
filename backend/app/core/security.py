import enum
from datetime import datetime, timedelta, timezone
from typing import Optional, Set, Dict, Any
import bcrypt
import jwt
from app.core.config import settings


class UserRole(str, enum.Enum):
    """
    Role-Based Access Control (RBAC) definitions for GovInnovate.
    Represents all 6 recognized stakeholders in the government innovation lifecycle.
    """
    GOVERNMENT = "GOVERNMENT"                        # Government department / nodal officers
    STARTUP = "STARTUP"                              # DPIIT-recognized startups & innovators
    EXPERT = "EXPERT"                                # Domain & technical evaluators
    VALIDATOR = "VALIDATOR"                          # Third-party testing & verification agencies
    PROCUREMENT_OFFICER = "PROCUREMENT_OFFICER"      # GeM / Ministry finance & procurement authorities
    ADMIN = "ADMIN"                                  # System & platform administrators

    # Backward compatibility aliases
    EXPERT_EVALUATOR = "EXPERT"
    INDEPENDENT_VALIDATOR = "VALIDATOR"

    @classmethod
    def from_str(cls, val: Any) -> "UserRole":
        if isinstance(val, UserRole):
            return val
        if not isinstance(val, str):
            raise ValueError(f"Invalid role: {val}")
        s = val.strip().upper()
        if s in ("EXPERT_EVALUATOR", "EXPERT"):
            return cls.EXPERT
        if s in ("INDEPENDENT_VALIDATOR", "VALIDATOR"):
            return cls.VALIDATOR
        return cls(s)


# Role groupings for authorization checks
ROLES_CAN_POST_CHALLENGES: Set[UserRole] = {UserRole.GOVERNMENT, UserRole.ADMIN}
ROLES_CAN_APPLY_CHALLENGES: Set[UserRole] = {UserRole.STARTUP}
ROLES_CAN_EVALUATE: Set[UserRole] = {UserRole.EXPERT, UserRole.ADMIN}
ROLES_CAN_VALIDATE: Set[UserRole] = {UserRole.VALIDATOR, UserRole.ADMIN}
ROLES_CAN_PROCURE: Set[UserRole] = {UserRole.PROCUREMENT_OFFICER, UserRole.ADMIN}
ROLES_SUPER_ADMIN: Set[UserRole] = {UserRole.ADMIN}


# ------------------------------------------------------------------------------
# Password Hashing Utilities using bcrypt
# ------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt salt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ------------------------------------------------------------------------------
# JWT Token Generation and Decoding
# ------------------------------------------------------------------------------
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a signed JWT access token containing user identity and role claims.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire_minutes = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a signed JWT refresh token for long-term session renewal.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire_days = getattr(settings, "JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7)
        expire = datetime.now(timezone.utc) + timedelta(days=expire_days)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    })
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode an access JWT token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") and payload.get("type") != "access":
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode a refresh JWT token.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None
