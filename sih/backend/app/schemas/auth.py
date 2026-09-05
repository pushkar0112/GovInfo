from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from app.core.security import UserRole


class UserRegisterRequest(BaseModel):
    """
    Registration payload for new platform users with role attribution.
    Enforces that public registration cannot claim ADMIN privileges.
    """
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, description="Full name of the stakeholder")
    role: Any = Field(default=UserRole.STARTUP)

    # General Organization Information
    organization_name: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    domain_expertise: Optional[str] = None

    # Government Department profile attributes (role == GOVERNMENT)
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    ministry: Optional[str] = None

    # Startup profile attributes (role == STARTUP)
    company_name: Optional[str] = None
    dpiit_number: Optional[str] = None
    sector: Optional[str] = None

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> UserRole:
        role = UserRole.from_str(v)
        if role == UserRole.ADMIN:
            raise ValueError("Admin accounts cannot be registered publicly. Must be created by system administrator.")
        return role


class UserLoginRequest(BaseModel):
    """
    Credentials for user authentication.
    """
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class TokenRefreshRequest(BaseModel):
    """
    Payload for session renewal via refresh token.
    """
    refresh_token: str = Field(..., description="Valid JWT refresh token")


class UserResponse(BaseModel):
    """
    Sanitized user profile returned upon authentication.
    """
    id: str
    email: str
    full_name: str
    role: UserRole
    organization_name: Optional[str] = None
    organization_id: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    domain_expertise: Optional[str] = None
    is_active: bool
    is_verified: bool
    department_id: Optional[str] = None
    startup_id: Optional[str] = None
    department_name: Optional[str] = None
    company_name: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """
    Bearer token payload with user profile, access token, and refresh token.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class UserProfileUpdateRequest(BaseModel):
    """
    User-editable fields for self-service profile updates.
    Note: Roles and account statuses are strictly non-editable by the user.
    """
    full_name: Optional[str] = Field(None, min_length=2)
    organization_name: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    domain_expertise: Optional[str] = None
