from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserResponse,
    UserProfileUpdateRequest,
)
from app.services.auth_service import AuthService
from app.api.deps import get_current_user, require_authenticated_user, require_role
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new stakeholder user",
    description="Registers a new user (Government, Startup, Expert, Validator, Procurement Officer) and returns access and refresh tokens. Disallows ADMIN registration.",
)
def register(
    payload: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ip_address = request.client.host if request.client else None
    user, access_token, refresh_token = AuthService.register_user(
        db, payload, ip_address=ip_address
    )
    formatted_user = AuthService.format_user_response(user)
    expire_minutes = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=formatted_user,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login & token issuance",
    description="Authenticates user credentials, records audit log, updates last login, and issues access + refresh tokens.",
)
def login(
    payload: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ip_address = request.client.host if request.client else None
    user, access_token, refresh_token = AuthService.authenticate_user(
        db,
        payload.email,
        payload.password,
        ip_address=ip_address,
        remember_me=bool(payload.remember_me),
    )
    formatted_user = AuthService.format_user_response(user)
    expire_minutes = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=formatted_user,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Validates a refresh token and issues a new access token and refresh token pair.",
)
def refresh_token(
    payload: TokenRefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ip_address = request.client.host if request.client else None
    user, access_token, new_refresh_token = AuthService.refresh_session(
        db, payload.refresh_token, ip_address=ip_address
    )
    formatted_user = AuthService.format_user_response(user)
    expire_minutes = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=formatted_user,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User logout",
    description="Records user logout event in audit logs and invalidates client session context.",
)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    AuthService.logout_user(db, current_user, ip_address=ip_address)
    return {"message": "Successfully logged out.", "status": "success"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the authenticated stakeholder's sanitized profile and role permissions.",
)
def get_me(
    current_user: User = Depends(require_authenticated_user),
) -> UserResponse:
    return AuthService.format_user_response(current_user)


@router.patch(
    "/profile",
    response_model=UserResponse,
    summary="Update current user profile",
    description="Updates user-editable profile fields (full name, organization name, designation, phone, expertise). Role and account status cannot be altered.",
)
def update_profile(
    payload: UserProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    ip_address = request.client.host if request.client else None
    updated_user = AuthService.update_profile(
        db, current_user, payload, ip_address=ip_address
    )
    return AuthService.format_user_response(updated_user)


@router.get(
    "/admin/users",
    response_model=List[UserResponse],
    summary="Admin list all users",
    description="Protected administrative endpoint returning all registered platform users.",
)
def admin_list_users(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [AuthService.format_user_response(u) for u in users]


@router.get(
    "/admin/audit-logs",
    summary="Admin list audit logs",
    description="Protected administrative endpoint returning recent system audit logs.",
)
def admin_list_audit_logs(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "ip_address": log.ip_address,
            "metadata": log.metadata_json or log.details_json,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
