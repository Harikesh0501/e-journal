"""Authentication and Account Registration API router.

RULE-API01: Follow RESTful conventions.
RULE-AUTH01: Store JWT tokens in HTTP-only cookies.
"""

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.dependencies.rate_limit import RateLimiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResendOTPRequest,
    UserVerifyRequest,
    VerifyResetOtpRequest,
)
from app.schemas.response import ApiResponse, success_response
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth")


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[dict],
    dependencies=[Depends(RateLimiter(max_requests=10, window_seconds=60, action="register"))],
)
async def register(
    request: Request,
    payload: UserRegisterRequest,
    auth_service: AuthService = Depends(),
):
    """Register a new user account. Dispatches verification code (OTP) via mail."""
    ip_address = request.client.host if request.client else None
    result = await auth_service.register(payload, ip_address=ip_address)
    return success_response(result)


@router.post(
    "/verify-otp",
    response_model=ApiResponse[dict],
    dependencies=[Depends(RateLimiter(max_requests=15, window_seconds=60, action="verify_otp"))],
)
async def verify_otp(
    request: Request,
    response: Response,
    payload: UserVerifyRequest,
    auth_service: AuthService = Depends(),
):
    """Validate OTP code and activate account.

    On success, sets HTTP-only secure cookie containing JWT.
    """
    ip_address = request.client.host if request.client else None
    access_token = await auth_service.verify_otp(
        payload.email, payload.otp, ip_address=ip_address
    )

    cookie_samesite = "none" if settings.is_production else "lax"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )

    return success_response({"access_token": access_token, "token_type": "bearer"})


@router.post(
    "/resend-otp",
    response_model=ApiResponse[str],
    dependencies=[Depends(RateLimiter(max_requests=5, window_seconds=60, action="resend_otp"))],
)
async def resend_otp(
    payload: UserResendOTPRequest, auth_service: AuthService = Depends()
):
    """Regenerate and resend verification code (OTP) to user's email."""
    await auth_service.resend_otp(payload.email)
    return success_response("OTP code resent successfully")


@router.post(
    "/login",
    response_model=ApiResponse[dict],
    dependencies=[Depends(RateLimiter(max_requests=20, window_seconds=60, action="login"))],
)
async def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    auth_service: AuthService = Depends(),
):
    """Authenticate credentials, verify account status, set JWT cookie."""
    ip_address = request.client.host if request.client else None
    access_token, user = await auth_service.login(
        payload.email, payload.password, ip_address=ip_address
    )

    # Set session cookie (RULE-AUTH01, SEC-06) - cleared automatically on browser close
    cookie_samesite = "none" if settings.is_production else "lax"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )

    user_meta = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "is_verified": user.get("is_verified", False),
        "is_profile_complete": user.get("is_profile_complete", False),
    }
    return success_response({"user": user_meta, "access_token": access_token})


@router.post("/logout", response_model=ApiResponse[str])
async def logout(response: Response):
    """Clear access token cookie and sign out current user session."""
    cookie_samesite = "none" if settings.is_production else "lax"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite=cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )
    # Also delete with lax mode to catch any locally set or transitioned cookies
    if settings.is_production:
        response.delete_cookie(
            key="access_token",
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
        )
    return success_response("Logged out successfully")


@router.post(
    "/forgot-password",
    response_model=ApiResponse[dict],
    dependencies=[Depends(RateLimiter(max_requests=5, window_seconds=60, action="forgot_password"))],
)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    auth_service: AuthService = Depends(),
):
    """Initiate password recovery by sending a 6-digit OTP code to the user's email."""
    ip_address = request.client.host if request.client else None
    result = await auth_service.forgot_password(payload.email, ip_address=ip_address)
    return success_response(result)


@router.post(
    "/verify-reset-otp",
    response_model=ApiResponse[bool],
    dependencies=[Depends(RateLimiter(max_requests=15, window_seconds=60, action="verify_reset_otp"))],
)
async def verify_reset_otp(
    payload: VerifyResetOtpRequest,
    auth_service: AuthService = Depends(),
):
    """Validate 6-digit OTP code before proceeding to new password screen."""
    is_valid = await auth_service.verify_reset_otp(payload.email, payload.otp)
    return success_response(is_valid)


@router.post(
    "/reset-password",
    response_model=ApiResponse[str],
    dependencies=[Depends(RateLimiter(max_requests=5, window_seconds=60, action="reset_password"))],
)
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    auth_service: AuthService = Depends(),
):
    """Validate OTP code and update user account password."""
    ip_address = request.client.host if request.client else None
    message = await auth_service.reset_password(
        payload.email, payload.otp, payload.new_password, ip_address=ip_address
    )
    return success_response(message)
