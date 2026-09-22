"""Unit tests for Admin Journal Inspection and Global Audit Access.

RULE-TEST01: Unit tests cover service-layer rules, permission checks, workflow state.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.core.constants import ErrorCode
from app.middleware.error_handler import AppException
from app.services.journal_service import JournalService
from app.services.comment_service import CommentService
from app.services.assignment_service import AssignmentService
from app.services.classroom_service import ClassroomService


@pytest.mark.anyio
@patch("app.services.journal_service.CommentRepository")
@patch("app.services.journal_service.JournalRepository")
async def test_admin_get_journal_by_id_success(mock_journal, mock_comment):
    """Admin can fetch and inspect any student journal without classroom ownership restriction."""
    journal_repo = MagicMock()
    journal_repo.find_by_id = AsyncMock(
        return_value={
            "id": "j_100",
            "studentId": "student_abc",
            "assignmentId": "asg_xyz",
            "title": "Lab Practical 1",
            "status": "submitted",
            "blocks": [],
        }
    )
    mock_journal.return_value = journal_repo

    comment_repo = MagicMock()
    comment_repo.get_annotation_counts = AsyncMock(return_value={"Comment": 1})
    mock_comment.return_value = comment_repo

    service = JournalService()
    service._safe_get_latest_revision_number = AsyncMock(return_value=1)

    result = await service.get_journal_by_id("j_100", "admin_999", "admin")
    assert result["id"] == "j_100"
    assert result["studentId"] == "student_abc"
    assert result["activeRevisionNumber"] == 1


@pytest.mark.anyio
@patch("app.services.comment_service.JournalRepository")
@patch("app.services.comment_service.CommentRepository")
async def test_admin_list_journal_comments_success(mock_comment, mock_journal):
    """Admin can fetch all review comments/annotations for any journal."""
    journal_repo = MagicMock()
    journal_repo.find_by_id = AsyncMock(
        return_value={
            "id": "j_100",
            "studentId": "student_abc",
            "assignmentId": "asg_xyz",
        }
    )
    mock_journal.return_value = journal_repo

    comment_repo = MagicMock()
    comment_repo.find_journal_comments = AsyncMock(
        return_value=[
            {"id": "c_1", "type": "Comment", "content": "Good observation"},
            {"id": "c_2", "type": "Suggestion", "content": "Refine equation"},
        ]
    )
    mock_comment.return_value = comment_repo

    service = CommentService()
    comments = await service.list_journal_comments("j_100", "admin_999", "admin")
    assert len(comments) == 2
    assert comments[0]["type"] == "Comment"


@pytest.mark.anyio
@patch("app.services.journal_service.ClassroomRepository")
@patch("app.services.journal_service.AssignmentRepository")
@patch("app.services.journal_service.JournalRepository")
@patch("app.services.journal_service.UserRepository")
async def test_admin_get_classroom_submissions_success(
    mock_user, mock_journal, mock_asg, mock_classroom
):
    """Admin can view classroom submissions queue even if not teacher of the classroom."""
    classroom_repo = MagicMock()
    classroom_repo.find_by_id = AsyncMock(
        return_value={"id": "c_1", "teacherId": "teacher_other"}
    )
    mock_classroom.return_value = classroom_repo

    asg_repo = MagicMock()
    asg_repo.find_many = AsyncMock(
        return_value=[{"id": "asg_1", "classroomId": "c_1", "title": "Ohm Law", "maxMarks": 10}]
    )
    mock_asg.return_value = asg_repo

    journal_repo = MagicMock()
    journal_repo.find_many = AsyncMock(
        return_value=[
            {"id": "j_1", "studentId": "s_1", "assignmentId": "asg_1", "status": "submitted"}
        ]
    )
    mock_journal.return_value = journal_repo

    user_repo = MagicMock()
    user_repo.find_by_id = AsyncMock(
        return_value={"id": "s_1", "profile": {"name": "Alice", "enrollmentNumber": "EN001"}}
    )
    mock_user.return_value = user_repo

    service = JournalService()
    subs = await service.get_classroom_submissions("c_1", "admin_999", "admin")
    assert len(subs) == 1
    assert subs[0]["studentName"] == "Alice"
    assert subs[0]["enrollmentNumber"] == "EN001"
