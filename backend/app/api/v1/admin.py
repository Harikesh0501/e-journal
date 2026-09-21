"""Admin API router providing system oversight, faculty onboarding, and academic control.

RULE-API01: JSON response envelope format.
RULE-API02: Versioned under /api/v1/.
RULE-AUTH07: RBAC limits to admin role only.
"""

from fastapi import APIRouter, Depends, Query, Request, status

from app.dependencies.auth import RoleChecker
from app.schemas.auth import (
    AdminCreateFacultyRequest,
    AdminReassignClassroomRequest,
    AdminResetPasswordRequest,
    AdminUpdateUserStatusRequest,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_service = AdminService()


@router.get("/stats")
async def get_system_stats(
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Retrieve system-wide analytics, user counts, and recent activity."""
    data = await admin_service.get_dashboard_analytics()
    return {"success": True, "data": data, "error": None}


@router.get("/users")
async def list_users(
    role: str | None = Query(default=None, description="Filter by role: student, teacher, admin"),
    search: str | None = Query(default=None, description="Search term for name, email, roll number"),
    department: str | None = Query(default=None, description="Filter by department"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Retrieve paginated list of users with filtering."""
    data = await admin_service.list_users(
        role=role,
        search=search,
        department=department,
        page=page,
        limit=limit,
    )
    return {"success": True, "data": data, "error": None}


@router.post("/faculty", status_code=status.HTTP_201_CREATED)
async def create_faculty(
    req: AdminCreateFacultyRequest,
    request: Request,
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Provision a verified faculty/teacher member."""
    ip_address = request.client.host if request.client else None
    data = await admin_service.create_faculty(
        request=req,
        admin_id=user["id"],
        ip_address=ip_address,
    )
    return {"success": True, "data": data, "error": None}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: AdminUpdateUserStatusRequest,
    request: Request,
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Toggle a user's active/suspended account state."""
    ip_address = request.client.host if request.client else None
    data = await admin_service.update_user_status(
        user_id=user_id,
        new_status=req.status,
        admin_id=user["id"],
        ip_address=ip_address,
    )
    return {"success": True, "data": data, "error": None}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    req: AdminResetPasswordRequest,
    request: Request,
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Force-reset a user's password."""
    ip_address = request.client.host if request.client else None
    data = await admin_service.reset_user_password(
        user_id=user_id,
        new_password=req.newPassword,
        admin_id=user["id"],
        ip_address=ip_address,
    )
    return {"success": True, "data": data, "error": None}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Permanently delete a user account."""
    ip_address = request.client.host if request.client else None
    data = await admin_service.delete_user(
        user_id=user_id,
        admin_id=user["id"],
        ip_address=ip_address,
    )
    return {"success": True, "data": data, "error": None}


@router.get("/classrooms")
async def list_classrooms(
    search: str | None = Query(default=None, description="Search term for name, subject, code"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """List all classrooms across the institution with enrollment metrics."""
    data = await admin_service.list_classrooms(
        search=search,
        page=page,
        limit=limit,
    )
    return {"success": True, "data": data, "error": None}


@router.patch("/classrooms/{classroom_id}/reassign")
async def reassign_classroom(
    classroom_id: str,
    req: AdminReassignClassroomRequest,
    request: Request,
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Transfer classroom ownership to a different faculty member."""
    ip_address = request.client.host if request.client else None
    data = await admin_service.reassign_classroom(
        classroom_id=classroom_id,
        new_teacher_id=req.newTeacherId,
        admin_id=user["id"],
        ip_address=ip_address,
    )
    return {"success": True, "data": data, "error": None}


@router.get("/journals")
async def list_journals(
    classroomId: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Retrieve global journals across all classrooms with status and student details."""
    data = await admin_service.list_journals(
        classroom_id=classroomId,
        status_filter=status,
        search=search,
        page=page,
        limit=limit,
    )
    return {"success": True, "data": data, "error": None}


@router.get("/audit-logs")
async def list_audit_logs(
    action: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    user: dict = Depends(RoleChecker(["admin"])),
) -> dict:
    """Retrieve system audit logs for compliance and security oversight."""
    data = await admin_service.list_audit_logs(
        page=page,
        limit=limit,
        action=action,
    )
    return {"success": True, "data": data, "error": None}
