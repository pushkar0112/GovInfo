from typing import Callable, List, Optional, Union, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import UserRole, decode_access_token
from app.core.config import settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and validate JWT access token from Bearer header.
    Returns authenticated active User instance or raises 401 Unauthorized.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account. Access is disabled.",
        )

    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Extract JWT access token if present. Returns None if unauthenticated.
    """
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None


def require_authenticated_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency ensuring request is authenticated by any active platform user.
    """
    return current_user


def require_role(*allowed_roles: Union[UserRole, str]) -> Callable[[User], User]:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces that current authenticated user holds at least one of the specified roles.
    Accepts UserRole enum instances or role string representations.
    """
    normalized_allowed_roles = [UserRole.from_str(r) for r in allowed_roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = UserRole.from_str(current_user.role)
        if user_role not in normalized_allowed_roles:
            role_names = ", ".join([r.value for r in normalized_allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of the following roles: [{role_names}]. Current role: {user_role.value}",
            )
        return current_user

    return role_checker


# Convenient role shortcut dependencies
require_government = require_role(UserRole.GOVERNMENT)
require_startup = require_role(UserRole.STARTUP)
require_expert = require_role(UserRole.EXPERT)
require_validator = require_role(UserRole.VALIDATOR)
require_procurement_officer = require_role(UserRole.PROCUREMENT_OFFICER)
require_admin = require_role(UserRole.ADMIN)
