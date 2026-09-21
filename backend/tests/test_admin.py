"""Unit and Integration tests for the Admin Subsystem and Protected Faculty Workflow.

RULE-TEST01: Unit tests cover service-layer rules, permission checks, workflow state.
"""

from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch
import pytest
from pydantic import ValidationError

from app.core.constants import ErrorCode
from app.dependencies.auth import RoleChecker
from app.middleware.error_handler import AppException
from app.schemas.auth import AdminCreateFacultyRequest, UserRegisterRequest
from app.services.admin_service import AdminService


# 1. Test RBAC RoleChecker logic
def test_admin_rbac_role_checker():
    """Verify RoleChecker(['admin']) restricts access to admin role only."""
    checker = RoleChecker(["admin"])

    # Student should be rejected
    student_user = {"id": "stud_1", "role": "student", "email": "s@uni.edu"}
    with pytest.raises(AppException) as exc_info:
        checker(student_user)
    assert exc_info.value.code == ErrorCode.FORBIDDEN

    # Teacher should be rejected
    teacher_user = {"id": "prof_1", "role": "teacher", "email": "p@uni.edu"}
    with pytest.raises(AppException) as exc_info:
        checker(teacher_user)
    assert exc_info.value.code == ErrorCode.FORBIDDEN

    # Admin should be allowed
    admin_user = {"id": "admin_1", "role": "admin", "email": "admin@ejournal.com"}
    res = checker(admin_user)
    assert res["id"] == "admin_1"
    assert res["role"] == "admin"


# 2. Test Public Registration: Rejects teacher role
def test_public_register_rejects_teacher():
    """Verify that UserRegisterRequest schema rejects role='teacher' for public registration."""
    # Attempting to register as teacher
    with pytest.raises(ValidationError):
        UserRegisterRequest(
            email="intruder@uni.edu",
            password="Password123!",
            role="teacher",
        )

    # Registering as student works cleanly
    valid_student = UserRegisterRequest(
        email="legit_student@uni.edu",
        password="Password123!",
        role="student",
    )
    assert valid_student.role == "student"


# 3. Test Admin Service: Create Faculty
@pytest.mark.anyio
@patch("app.services.admin_service.UserRepository")
@patch("app.services.admin_service.AuditLogRepository")
async def test_admin_create_faculty_service(mock_audit, mock_user_repo):
    """Test administrator provisioning a new faculty member."""
    user_repo_mock = MagicMock()
    user_repo_mock.find_by_email = AsyncMock(return_value=None)
    user_repo_mock.insert_one = AsyncMock(return_value="faculty_user_999")
    mock_user_repo.return_value = user_repo_mock

    audit_mock = MagicMock()
    audit_mock.log_event = AsyncMock()
    mock_audit.return_value = audit_mock

    service = AdminService()
    req = AdminCreateFacultyRequest(
        name="Dr. Alan Turing",
        email="alan.turing@cambridge.edu",
        department="Computer Science",
        designation="Professor",
        password="InitialPassword123!",
    )

    res = await service.create_faculty(req, admin_id="admin_123")

    assert res["id"] == "faculty_user_999"
    assert res["email"] == "alan.turing@cambridge.edu"
    assert res["role"] == "teacher"
    assert user_repo_mock.insert_one.called
    assert audit_mock.log_event.called


# 4. Test Admin Service: Suspend / Activate User
@pytest.mark.anyio
@patch("app.services.admin_service.UserRepository")
@patch("app.services.admin_service.AuditLogRepository")
async def test_admin_update_user_status(mock_audit, mock_user_repo):
    """Test administrator suspending a target user account."""
    user_repo_mock = MagicMock()
    user_repo_mock.find_by_id = AsyncMock(
        return_value={"id": "user_456", "email": "bad_actor@uni.edu", "role": "student"}
    )
    user_repo_mock.update_by_id = AsyncMock(return_value=True)
    mock_user_repo.return_value = user_repo_mock

    audit_mock = MagicMock()
    audit_mock.log_event = AsyncMock()
    mock_audit.return_value = audit_mock

    service = AdminService()
    res = await service.update_user_status(
        user_id="user_456",
        new_status="suspended",
        admin_id="admin_123",
    )

    assert res["status"] == "suspended"
    assert user_repo_mock.update_by_id.called
    assert audit_mock.log_event.called


# 5. Test Admin Service: Reassign Classroom
@pytest.mark.anyio
@patch("app.services.admin_service.ClassroomRepository")
@patch("app.services.admin_service.UserRepository")
@patch("app.services.admin_service.AuditLogRepository")
async def test_admin_reassign_classroom(mock_audit, mock_user_repo, mock_class_repo):
    """Test transferring classroom ownership from one faculty member to another."""
    class_mock = MagicMock()
    class_mock.find_by_id = AsyncMock(
        return_value={"id": "class_789", "name": "Algorithms Lab", "teacherId": "old_teacher"}
    )
    class_mock.update_by_id = AsyncMock(return_value=True)
    mock_class_repo.return_value = class_mock

    user_mock = MagicMock()
    user_mock.find_by_id = AsyncMock(
        return_value={"id": "new_teacher_111", "email": "prof2@uni.edu", "role": "teacher"}
    )
    mock_user_repo.return_value = user_mock

    audit_mock = MagicMock()
    audit_mock.log_event = AsyncMock()
    mock_audit.return_value = audit_mock

    service = AdminService()
    res = await service.reassign_classroom(
        classroom_id="class_789",
        new_teacher_id="new_teacher_111",
        admin_id="admin_123",
    )

    assert res["newTeacherId"] == "new_teacher_111"
    assert class_mock.update_by_id.called
    assert audit_mock.log_event.called


# 6. Test Admin Service: Dashboard Analytics
@pytest.mark.anyio
@patch("app.services.admin_service.AdminRepository")
async def test_admin_dashboard_analytics(mock_admin_repo):
    """Test aggregation of dashboard analytics."""
    admin_repo_mock = MagicMock()
    admin_repo_mock.get_system_stats = AsyncMock(
        return_value={
            "users": {"total": 50, "students": 45, "teachers": 4, "admins": 1},
            "classrooms": {"total": 8},
            "assignments": {"total": 24},
            "journals": {"total": 120, "approved": 80},
        }
    )
    admin_repo_mock.list_audit_logs = AsyncMock(return_value=([], 0))
    mock_admin_repo.return_value = admin_repo_mock

    service = AdminService()
    res = await service.get_dashboard_analytics()

    assert "stats" in res
    assert res["stats"]["users"]["total"] == 50
    assert res["stats"]["classrooms"]["total"] == 8


@pytest.mark.anyio
async def test_audit_log_fifo_pruning():
    """Test that audit log repository prunes oldest logs beyond max_logs (FIFO)."""
    from bson import ObjectId
    from app.repositories.audit_log_repository import AuditLogRepository

    repo = AuditLogRepository()
    mock_coll = MagicMock()
    mock_coll.count_documents.return_value = 105
    # Simulate finding 5 oldest documents
    oldest_ids = [ObjectId() for _ in range(5)]
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.limit.return_value = [{"_id": oid} for oid in oldest_ids]
    mock_coll.find.return_value = mock_cursor
    mock_coll.delete_many.return_value = MagicMock(deleted_count=5)

    with patch.object(AuditLogRepository, "collection", new_callable=PropertyMock) as mock_prop:
        mock_prop.return_value = mock_coll
        deleted = await repo.prune_fifo_logs(max_logs=100)
        assert deleted == 5
        mock_coll.delete_many.assert_called_once_with({"_id": {"$in": oldest_ids}})
