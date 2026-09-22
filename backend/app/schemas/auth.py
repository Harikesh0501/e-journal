"""Pydantic schemas for authentication and registration requests/responses."""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    """Request payload for registering a new user."""

    email: EmailStr = Field(..., description="Institutional email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")
    role: Literal["student"] = Field(
        default="student",
        description="Role in the institution (public registration restricted to students)",
    )


class AdminCreateFacultyRequest(BaseModel):
    """Payload for an administrator to provision a verified faculty member."""

    name: str = Field(..., min_length=2, description="Faculty full name")
    email: EmailStr = Field(..., description="Faculty institutional email")
    department: str = Field(..., min_length=2, description="Academic department")
    designation: str = Field(default="Assistant Professor", description="Academic designation")
    password: str | None = Field(default=None, description="Optional initial password (min 8 chars if provided)")

    @field_validator("password", mode="before")
    @classmethod
    def sanitize_password(cls, v):
        if v is not None:
            v = str(v).strip()
            if not v:
                return None
            if len(v) < 8:
                raise ValueError("Password must be at least 8 characters if provided")
        return v


class AdminUpdateUserStatusRequest(BaseModel):
    """Payload to toggle user active/suspended state."""

    status: Literal["active", "suspended"] = Field(..., description="Target status")


class AdminResetPasswordRequest(BaseModel):
    """Payload for admin to reset a user's password."""

    newPassword: str = Field(..., min_length=8, description="New password (min 8 chars)")


class AdminReassignClassroomRequest(BaseModel):
    """Payload to reassign a classroom to a different teacher."""

    newTeacherId: str = Field(..., description="Target teacher user ID")


class UserVerifyRequest(BaseModel):
    """Request payload for verifying account with OTP."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class UserResendOTPRequest(BaseModel):
    """Request payload for resending OTP verification code."""

    email: EmailStr


class UserLoginRequest(BaseModel):
    """Request payload for user logging in."""

    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    """Request payload to initiate password reset via email OTP."""

    email: EmailStr


class VerifyResetOtpRequest(BaseModel):
    """Request payload to verify reset OTP before showing new password form."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit reset code")


class ResetPasswordRequest(BaseModel):
    """Request payload to verify OTP and reset account password."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit reset code")
    new_password: str = Field(..., min_length=8, description="New password (min 8 chars)")


class ChangePasswordRequest(BaseModel):
    """Request payload for authenticated user to change password or replace temporary password."""

    current_password: str
    new_password: str = Field(..., min_length=8, description="New password (min 8 chars)")


class TokenResponse(BaseModel):
    """Bearer token response schema."""

    access_token: str
    token_type: str = "bearer"


class UserProfileSchema(BaseModel):
    """Embedded profile details within the user response."""

    name: str | None = None
    department: str | None = None
    semester: str | None = None
    division: str | None = None
    batch: str | None = None
    enrollmentNumber: str | None = None
    facultyId: str | None = None
    designation: str | None = None
    college: str | None = None
    university: str | None = None
    profilePhoto: str | None = None


class UserMeResponse(BaseModel):
    """Active user detailed response schema."""

    id: str
    email: EmailStr
    role: str
    is_verified: bool
    is_profile_complete: bool
    must_change_password: bool = False
    status: str = "active"
    profile: UserProfileSchema
    createdAt: datetime
    updatedAt: datetime
