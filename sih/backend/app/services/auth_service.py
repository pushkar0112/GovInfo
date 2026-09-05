import json
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.department import Department
from app.models.startup import Startup
from app.models.audit_log import AuditLog
from app.core.security import (
    UserRole,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.schemas.auth import (
    UserRegisterRequest,
    UserResponse,
    TokenResponse,
    UserProfileUpdateRequest,
)
from app.core.config import settings


class AuthService:
    """
    Business logic layer for user registration, authentication, token lifecycle,
    audit tracking, and RBAC profile provisioning.
    """

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @classmethod
    def register_user(
        cls,
        db: Session,
        payload: UserRegisterRequest,
        ip_address: Optional[str] = None,
        is_admin_creation: bool = False,
    ) -> Tuple[User, str, str]:
        """
        Registers a new stakeholder user, provisions role-specific records,
        records an immutable audit entry, and issues access + refresh tokens.
        """
        # 1. Enforce admin restriction
        role = UserRole.from_str(payload.role)
        if role == UserRole.ADMIN and not is_admin_creation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ADMIN accounts cannot be registered publicly. Must be provisioned by a system administrator.",
            )

        # 2. Check for email uniqueness
        existing_user = cls.get_user_by_email(db, payload.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered.",
            )

        # 3. Hash password using bcrypt
        password_hash = hash_password(payload.password)

        # 4. Create user entity
        now = datetime.now(timezone.utc)
        user = User(
            email=payload.email.lower().strip(),
            password_hash=password_hash,
            full_name=payload.full_name.strip(),
            role=role,
            organization_name=payload.organization_name or payload.department_name or payload.company_name,
            designation=payload.designation,
            phone_number=payload.phone_number,
            domain_expertise=payload.domain_expertise or payload.sector,
            is_active=True,
            is_verified=False,
            last_login=now,
        )

        db.add(user)
        db.flush()  # Generate user.id

        # 5. Role-specific profile linking / provisioning
        if role == UserRole.GOVERNMENT and payload.department_name:
            dept = (
                db.query(Department)
                .filter(Department.name == payload.department_name.strip())
                .first()
            )
            if not dept:
                dept_code = (
                    payload.department_code
                    or f"DEPT-{payload.department_name[:4].upper()}"
                )
                dept = Department(
                    name=payload.department_name.strip(),
                    code=dept_code,
                    ministry=payload.ministry or "Ministry of Electronics and IT",
                    contact_email=user.email,
                    nodal_officer_name=user.full_name,
                )
                db.add(dept)
                db.flush()
            user.department_id = dept.id
            user.organization_id = dept.id

        elif role == UserRole.STARTUP and payload.company_name:
            startup = (
                db.query(Startup)
                .filter(Startup.company_name == payload.company_name.strip())
                .first()
            )
            if not startup:
                startup = Startup(
                    company_name=payload.company_name.strip(),
                    dpiit_recognized=bool(payload.dpiit_number),
                    dpiit_number=payload.dpiit_number,
                    sector=payload.sector or "Technology",
                )
                db.add(startup)
                db.flush()
            user.startup_id = startup.id
            user.organization_id = startup.id

        # 6. Record immutable audit log
        audit = AuditLog(
            user_id=user.id,
            action="USER_REGISTERED",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
            metadata_json=json.dumps({"role": user.role.value, "email": user.email}),
        )
        db.add(audit)

        db.commit()
        db.refresh(user)

        # 7. Generate tokens
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": user.id})

        return user, access_token, refresh_token

    @classmethod
    def authenticate_user(
        cls,
        db: Session,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        remember_me: bool = False,
    ) -> Tuple[User, str, str]:
        """
        Authenticates user credentials, tracks login failure/success in audit logs,
        updates last_login timestamp, and issues signed tokens.
        """
        normalized_email = email.lower().strip()
        user = cls.get_user_by_email(db, normalized_email)

        if not user or not verify_password(password, user.password_hash):
            # Record failed login attempt in audit log
            audit = AuditLog(
                user_id=user.id if user else None,
                action="USER_LOGIN_FAILED",
                entity_type="User",
                entity_id=user.id if user else "UNKNOWN",
                ip_address=ip_address,
                metadata_json=json.dumps({"attempted_email": normalized_email}),
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Please verify email and password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Please contact your nodal administrator.",
            )

        # Update last_login
        user.last_login = datetime.now(timezone.utc)

        # Record audit log for login
        audit = AuditLog(
            user_id=user.id,
            action="USER_LOGIN_SUCCESS",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
            metadata_json=json.dumps({"remember_me": remember_me}),
        )
        db.add(audit)
        db.commit()
        db.refresh(user)

        # Generate tokens
        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": user.id})

        return user, access_token, refresh_token

    @classmethod
    def refresh_session(
        cls, db: Session, refresh_token: str, ip_address: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Validates refresh token and issues fresh access and refresh tokens.
        """
        payload = decode_refresh_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token claims.",
            )

        user = cls.get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is invalid or inactive.",
            )

        # Record audit log
        audit = AuditLog(
            user_id=user.id,
            action="TOKEN_REFRESHED",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )
        db.add(audit)
        db.commit()

        token_data = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
        }
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token({"sub": user.id})

        return user, new_access_token, new_refresh_token

    @classmethod
    def logout_user(
        cls, db: Session, user: User, ip_address: Optional[str] = None
    ) -> None:
        """
        Records user logout in audit log.
        """
        audit = AuditLog(
            user_id=user.id,
            action="USER_LOGGED_OUT",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )
        db.add(audit)
        db.commit()

    @classmethod
    def update_profile(
        cls,
        db: Session,
        user: User,
        payload: UserProfileUpdateRequest,
        ip_address: Optional[str] = None,
    ) -> User:
        """
        Updates user-editable fields. Disallows self-role elevation.
        """
        changes: Dict[str, Any] = {}
        if payload.full_name is not None and payload.full_name.strip():
            changes["full_name"] = payload.full_name.strip()
            user.full_name = payload.full_name.strip()

        if payload.organization_name is not None:
            changes["organization_name"] = payload.organization_name.strip()
            user.organization_name = payload.organization_name.strip()

        if payload.designation is not None:
            changes["designation"] = payload.designation.strip()
            user.designation = payload.designation.strip()

        if payload.phone_number is not None:
            changes["phone_number"] = payload.phone_number.strip()
            user.phone_number = payload.phone_number.strip()

        if payload.domain_expertise is not None:
            changes["domain_expertise"] = payload.domain_expertise.strip()
            user.domain_expertise = payload.domain_expertise.strip()

        user.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            user_id=user.id,
            action="USER_PROFILE_UPDATED",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
            metadata_json=json.dumps(changes),
        )
        db.add(audit)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def format_user_response(user: User) -> UserResponse:
        dept_name = user.department.name if user.department else None
        comp_name = user.startup.company_name if user.startup else None
        org_name = user.organization_name or dept_name or comp_name

        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            organization_name=org_name,
            organization_id=user.organization_id or user.department_id or user.startup_id,
            designation=user.designation,
            phone_number=user.phone_number,
            domain_expertise=user.domain_expertise,
            is_active=user.is_active,
            is_verified=user.is_verified,
            department_id=user.department_id,
            startup_id=user.startup_id,
            department_name=dept_name,
            company_name=comp_name,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
