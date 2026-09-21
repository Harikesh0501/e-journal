"""Email transmission utilities.

Bypasses SMTP port restrictions on free hosts (like Render) by using
the Resend or Brevo HTTPS API.
"""

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Send a verification OTP to the target email.

    - If `RESEND_API_KEY` is set, uses Resend's sandbox API.
    - If `BREVO_API_KEY` is set, uses Brevo's HTTPS API.
    - Otherwise, falls back to logging the OTP to the console.
    """
    subject = "Verify your eJournal Account"
    html_content = f"""
    <html>
        <body style="font-family: sans-serif; padding: 20px; color: #171717;">
            <h2 style="color: #212529;">Verify your eJournal Account</h2>
            <p>Thank you for registering with eJournal. Please use the following One-Time Password (OTP) to verify email ownership:</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; border: 1px solid #dee2e6;">
                {otp_code}
            </div>
            <p style="color: #6c757d; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this email, please ignore it.</p>
        </body>
    </html>
    """

    # Always log the OTP to console in development mode for easy developer access (RULE-LOG03)
    if settings.ENVIRONMENT == "development":
        logger.info(
            "email_otp_dev_log",
            to=to_email,
            otp=otp_code,
            message="Development mode: OTP also printed to console.",
        )

    # 1. Brevo API Integration (Default primary provider)
    if settings.BREVO_API_KEY:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {"name": "eJournal", "email": settings.SMTP_FROM_EMAIL},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code in [200, 201]:
                    logger.info("email_otp_sent_via_brevo", to=to_email)
                    return True
                else:
                    logger.error(
                        "email_otp_brevo_failed",
                        status_code=response.status_code,
                        response=response.text,
                        to=to_email,
                    )
        except Exception as e:
            logger.error("email_otp_brevo_exception", error=str(e), to=to_email)

    # 2. Resend API Integration (Fallback provider)
    else:
        resend_key = getattr(settings, "RESEND_API_KEY", None) or getattr(settings, "resend_api_key", None)
        if not resend_key:
            import os
            resend_key = os.environ.get("RESEND_API_KEY")

        if resend_key:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "from": f"eJournal <{settings.SMTP_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code in [200, 201]:
                        logger.info("email_otp_sent_via_resend", to=to_email)
                        return True
                    else:
                        logger.error(
                            "email_otp_resend_failed",
                            status_code=response.status_code,
                            response=response.text,
                            to=to_email,
                        )
            except Exception as e:
                logger.error("email_otp_resend_exception", error=str(e), to=to_email)
        else:
            logger.warning(
                "email_otp_no_api_key",
                to=to_email,
                message="No Resend or Brevo API keys configured.",
            )

    return True


async def send_notification_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send a notification email to the target address."""
    # Log to console in development
    if settings.ENVIRONMENT == "development":
        logger.info(
            "email_notification_dev_log",
            to=to_email,
            subject=subject,
            message="Development mode: Email logged to console.",
        )

    # 1. Brevo API Integration (Primary provider)
    if settings.BREVO_API_KEY:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {"name": "eJournal", "email": settings.SMTP_FROM_EMAIL},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code in [200, 201]:
                    logger.info("email_notification_sent_via_brevo", to=to_email, subject=subject)
                    return True
                else:
                    logger.error(
                        "email_notification_brevo_failed",
                        status_code=response.status_code,
                        response=response.text,
                        to=to_email,
                    )
        except Exception as e:
            logger.error("email_notification_brevo_exception", error=str(e), to=to_email)

    # 2. Resend API Integration (Fallback provider)
    else:
        resend_key = getattr(settings, "RESEND_API_KEY", None) or getattr(settings, "resend_api_key", None)
        if not resend_key:
            import os
            resend_key = os.environ.get("RESEND_API_KEY")

        if resend_key:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "from": f"eJournal <{settings.SMTP_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code in [200, 201]:
                        logger.info("email_notification_sent_via_resend", to=to_email, subject=subject)
                        return True
                    else:
                        logger.error(
                            "email_notification_resend_failed",
                            status_code=response.status_code,
                            response=response.text,
                            to=to_email,
                        )
            except Exception as e:
                logger.error("email_notification_resend_exception", error=str(e), to=to_email)
        else:
            logger.warning(
                "email_notification_no_api_key",
                to=to_email,
                subject=subject,
                message="No Brevo or Resend API keys configured."
            )

    return True


async def send_password_reset_email(to_email: str, otp_code: str) -> bool:
    """Send a password reset OTP code to the target email.

    - Logs OTP to console in development mode (RULE-LOG03).
    - Uses Resend or Brevo API when keys are configured.
    """
    subject = "Reset your eJournal Password"
    html_content = f"""
    <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Password Reset Request</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">eJournal Academic Review &amp; Journal Management System</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                    We received a request to reset the password for your eJournal account (<strong>{to_email}</strong>). Please use the One-Time Password (OTP) below to proceed with resetting your password:
                </p>
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; font-size: 28px; font-weight: 900; letter-spacing: 6px; text-align: center; margin: 24px 0; color: #0f172a; border: 1px solid #cbd5e1; font-family: monospace;">
                    {otp_code}
                </div>
                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                    ⏳ This code will expire in <strong>10 minutes</strong>. If you did not request this password reset, your account is safe and you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                    Automated security notification from eJournal Institutional Platform.
                </p>
            </div>
        </body>
    </html>
    """

    # Always log the OTP to console in development mode (RULE-LOG03)
    if settings.ENVIRONMENT == "development":
        logger.info(
            "email_reset_otp_dev_log",
            to=to_email,
            reset_otp=otp_code,
            message="Development mode: Password reset OTP printed to console.",
        )

    # 1. Brevo API Integration (Primary provider)
    if settings.BREVO_API_KEY:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {"name": "eJournal", "email": settings.SMTP_FROM_EMAIL},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code in [200, 201]:
                    logger.info("email_reset_otp_sent_via_brevo", to=to_email)
                    return True
                else:
                    logger.error(
                        "email_reset_otp_brevo_failed",
                        status_code=response.status_code,
                        response=response.text,
                        to=to_email,
                    )
        except Exception as e:
            logger.error("email_reset_otp_brevo_exception", error=str(e), to=to_email)

    # 2. Resend API Integration (Fallback provider)
    else:
        resend_key = getattr(settings, "RESEND_API_KEY", None) or getattr(settings, "resend_api_key", None)
        if not resend_key:
            import os
            resend_key = os.environ.get("RESEND_API_KEY")

        if resend_key:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "from": f"eJournal <{settings.SMTP_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code in [200, 201]:
                        logger.info("email_reset_otp_sent_via_resend", to=to_email)
                        return True
                    else:
                        logger.error(
                            "email_reset_otp_resend_failed",
                            status_code=response.status_code,
                            response=response.text,
                            to=to_email,
                        )
            except Exception as e:
                logger.error("email_reset_otp_resend_exception", error=str(e), to=to_email)
        else:
            logger.warning(
                "email_reset_otp_no_api_key",
                to=to_email,
                message="No Brevo or Resend API keys configured."
            )

    return True

