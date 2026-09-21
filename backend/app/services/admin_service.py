"""Admin service layer handling system oversight, faculty onboarding, and academic control.

RULE-BE04: All business logic MUST live inside service classes.
RULE-SEC10: Sensitive events MUST generate audit logs.
"""

import secrets
from datetime import datetime, timezone
from fastapi import status

from app.core.constants import ErrorCode
from app.middleware.error_handler import AppException
from app.repositories.admin_repository import AdminRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.user_repository import UserRepository
from app.repositories.classroom_repository import ClassroomRepository
from app.schemas.auth import AdminCreateFacultyRequest
from app.utils.security import hash_password


class AdminService:
    """Business logic orchestrator for administrator operations."""

    def __init__(self):
        self.admin_repo = AdminRepository()
        self.user_repo = UserRepository()
        self.classroom_repo = ClassroomRepository()
        self.audit_repo = AuditLogRepository()

    async def get_dashboard_analytics(self) -> dict:
        """Aggregate high-level system metrics and recent audit events."""
        stats = await self.admin_repo.get_system_stats()
        recent_logs, _ = await self.admin_repo.list_audit_logs(skip=0, limit=8)
        return {
            "stats": stats,
            "recentActivity": recent_logs,
        }

    async def create_faculty(
        self,
        request: AdminCreateFacultyRequest,
        admin_id: str,
        ip_address: str | None = None,
    ) -> dict:
        """Provision a verified faculty/teacher account directly by admin."""
        normalized_email = request.email.lower().strip()
        existing = await self.user_repo.find_by_email(normalized_email)
        if existing:
            raise AppException(
                code=ErrorCode.EMAIL_ALREADY_EXISTS,
                message=f"A user with email '{normalized_email}' is already registered.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Generate or use specified initial password
        initial_password = request.password or (secrets.token_urlsafe(8) + "!1Aa")
        password_hash = hash_password(initial_password)

        now = datetime.now(timezone.utc)
        faculty_doc = {
            "email": normalized_email,
            "password_hash": password_hash,
            "role": "teacher",
            "is_verified": True,
            "is_profile_complete": True,
            "status": "active",
            "profile": {
                "name": request.name.strip(),
                "department": request.department.strip(),
                "designation": request.designation.strip(),
                "college": "Engineering & Technology Institute",
            },
            "createdAt": now,
            "updatedAt": now,
        }

        user_id = await self.user_repo.insert_one(faculty_doc)

        await self.audit_repo.log_event(
            user_id=admin_id,
            action="FACULTY_CREATED",
            entity="users",
            entity_id=user_id,
            ip_address=ip_address,
        )

        # Dispatch Faculty Welcome Email
        try:
            from app.utils.email import send_notification_email
            import html
            safe_name = html.escape(str(request.name))
            safe_dept = html.escape(str(request.department))
            safe_pass = html.escape(str(initial_password))
            email_subject = "Welcome to eJournal — Faculty Account Provisioned"
            email_body = f"""
            <html>
                <body style="font-family: sans-serif; padding: 20px; color: #171717;">
                    <h2 style="color: #0f172a;">Welcome to eJournal Faculty Portal</h2>
                    <p>Dear Professor <strong>{safe_name}</strong>,</p>
                    <p>An administrator has created your institutional faculty account for the <strong>{safe_dept}</strong> department.</p>
                    <div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
                        <p style="margin: 4px 0;">Email: <code>{normalized_email}</code></p>
                        <p style="margin: 4px 0;">Temporary Password: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{safe_pass}</code></p>
                    </div>
                    <p>Please log in to your account to create classrooms, publish lab practicals, and review student journal submissions.</p>
                    <br/>
                    <p style="color: #6c757d; font-size: 12px;">This is an automated administrative invitation from eJournal.</p>
                </body>
            </html>
            """
            await send_notification_email(normalized_email, email_subject, email_body)
        except Exception:
            pass

        return {
            "id": user_id,
            "email": normalized_email,
            "name": request.name,
            "department": request.department,
            "role": "teacher",
            "initialPassword": initial_password,
            "message": "Faculty account provisioned successfully.",
        }

    async def list_users(
        self,
        role: str | None = None,
        search: str | None = None,
        department: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict:
        """Return paginated list of users filtered by role, search, or department."""
        page = max(1, page)
        limit = min(max(1, limit), 100)
        skip = (page - 1) * limit

        users, total = await self.admin_repo.list_users(
            role=role,
            search=search,
            department=department,
            skip=skip,
            limit=limit,
        )

        return {
            "items": users,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 1,
        }

    async def update_user_status(
        self,
        user_id: str,
        new_status: str,
        admin_id: str,
        ip_address: str | None = None,
    ) -> dict:
        """Suspend or activate a user account."""
        if user_id == admin_id:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Administrators cannot suspend their own account.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise AppException(
                code=ErrorCode.USER_NOT_FOUND,
                message="User not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        await self.user_repo.update_by_id(
            user_id,
            {
                "$set": {
                    "status": new_status,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )

        await self.audit_repo.log_event(
            user_id=admin_id,
            action=f"USER_STATUS_{new_status.upper()}",
            entity="users",
            entity_id=user_id,
            ip_address=ip_address,
        )

        return {"id": user_id, "status": new_status, "message": f"User status updated to {new_status}."}

    async def reset_user_password(
        self,
        user_id: str,
        new_password: str,
        admin_id: str,
        ip_address: str | None = None,
    ) -> dict:
        """Force-reset a user's password with new credentials."""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise AppException(
                code=ErrorCode.USER_NOT_FOUND,
                message="User not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        password_hash = hash_password(new_password)
        await self.user_repo.update_by_id(
            user_id,
            {
                "$set": {
                    "password_hash": password_hash,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )

        await self.audit_repo.log_event(
            user_id=admin_id,
            action="PASSWORD_RESET_BY_ADMIN",
            entity="users",
            entity_id=user_id,
            ip_address=ip_address,
        )

        return {"id": user_id, "message": "Password reset successfully."}

    async def delete_user(
        self,
        user_id: str,
        admin_id: str,
        ip_address: str | None = None,
    ) -> dict:
        """Permanently delete a user account."""
        if user_id == admin_id:
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Administrators cannot delete their own account.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise AppException(
                code=ErrorCode.USER_NOT_FOUND,
                message="User not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        await self.user_repo.delete_by_id(user_id)

        await self.audit_repo.log_event(
            user_id=admin_id,
            action="USER_DELETED_BY_ADMIN",
            entity="users",
            entity_id=user_id,
            ip_address=ip_address,
        )

        return {"id": user_id, "message": "User permanently deleted."}

    async def list_classrooms(
        self,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict:
        """Return paginated list of all classrooms across the institution."""
        page = max(1, page)
        limit = min(max(1, limit), 100)
        skip = (page - 1) * limit

        items, total = await self.admin_repo.list_classrooms(
            search=search,
            skip=skip,
            limit=limit,
        )

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 1,
        }

    async def reassign_classroom(
        self,
        classroom_id: str,
        new_teacher_id: str,
        admin_id: str,
        ip_address: str | None = None,
    ) -> dict:
        """Transfer classroom ownership to another faculty member."""
        classroom = await self.classroom_repo.find_by_id(classroom_id)
        if not classroom:
            raise AppException(
                code=ErrorCode.CLASSROOM_NOT_FOUND,
                message="Classroom not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        teacher = await self.user_repo.find_by_id(new_teacher_id)
        if not teacher or teacher.get("role") != "teacher":
            raise AppException(
                code=ErrorCode.VALIDATION_ERROR,
                message="Selected user is not a verified faculty member.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        await self.classroom_repo.update_by_id(
            classroom_id,
            {
                "$set": {
                    "teacherId": new_teacher_id,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )

        await self.audit_repo.log_event(
            user_id=admin_id,
            action="CLASSROOM_REASSIGNED",
            entity="classrooms",
            entity_id=classroom_id,
            ip_address=ip_address,
        )

        return {
            "classroomId": classroom_id,
            "newTeacherId": new_teacher_id,
            "teacherName": teacher.get("profile", {}).get("name") or teacher.get("email"),
            "message": "Classroom reassigned successfully.",
        }

    async def list_journals(
        self,
        classroom_id: str | None = None,
        status_filter: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict:
        """Return system-wide submitted journals with search and status filtering."""
        page = max(1, page)
        limit = min(max(1, limit), 100)
        skip = (page - 1) * limit

        items, total = await self.admin_repo.list_journals(
            classroom_id=classroom_id,
            status=status_filter,
            search=search,
            skip=skip,
            limit=limit,
        )

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 1,
        }

    async def list_audit_logs(
        self,
        page: int = 1,
        limit: int = 50,
        action: str | None = None,
    ) -> dict:
        """Fetch system-wide audit logs."""
        page = max(1, page)
        limit = min(max(1, limit), 100)
        skip = (page - 1) * limit

        items, total = await self.admin_repo.list_audit_logs(
            skip=skip,
            limit=limit,
            action=action,
        )

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if total > 0 else 1,
        }
