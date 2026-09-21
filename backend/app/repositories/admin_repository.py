"""Admin repository for system-wide statistics, user oversight, and audit views.

RULE-BE05: All database operations live inside repository classes.
RULE-BE06: Never return raw MongoDB documents.
RULE-BE09: Convert _id to API-safe strings.
"""

from datetime import datetime, timezone
import re
from bson import ObjectId
from app.core.database import get_collection
from app.repositories.base import BaseRepository


class AdminRepository(BaseRepository):
    """Repository handling administrative queries and system aggregation."""

    collection_name = "users"

    @property
    def users_col(self):
        return get_collection("users")

    @property
    def classrooms_col(self):
        return get_collection("classrooms")

    @property
    def assignments_col(self):
        return get_collection("assignments")

    @property
    def journals_col(self):
        return get_collection("journals")

    @property
    def memberships_col(self):
        return get_collection("classroom_memberships")

    @property
    def assets_col(self):
        return get_collection("uploaded_assets")

    @property
    def audit_col(self):
        return get_collection("audit_logs")

    async def get_system_stats(self) -> dict:
        """Aggregate system-wide statistics for the admin overview."""
        # 1. User stats
        total_students = self.users_col.count_documents({"role": "student"})
        total_teachers = self.users_col.count_documents({"role": "teacher"})
        total_admins = self.users_col.count_documents({"role": "admin"})
        suspended_users = self.users_col.count_documents({"status": "suspended"})

        # 2. Academic stats
        total_classrooms = self.classrooms_col.count_documents({})
        total_assignments = self.assignments_col.count_documents({})

        # 3. Journal stats breakdown
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        journal_counts_raw = list(self.journals_col.aggregate(pipeline))
        journal_status_map = {item["_id"]: item["count"] for item in journal_counts_raw if item["_id"]}

        total_journals = sum(journal_status_map.values())
        approved_journals = journal_status_map.get("approved", 0)
        submitted_journals = journal_status_map.get("submitted", 0) + journal_status_map.get("resubmitted", 0)
        draft_journals = journal_status_map.get("draft", 0)
        changes_requested = journal_status_map.get("changes_requested", 0)

        # 4. Storage assets stats
        assets_count = self.assets_col.count_documents({})
        storage_pipeline = [
            {"$group": {"_id": None, "totalBytes": {"$sum": "$bytes"}}}
        ]
        storage_res = list(self.assets_col.aggregate(storage_pipeline))
        total_storage_bytes = storage_res[0]["totalBytes"] if storage_res else 0

        return {
            "users": {
                "total": total_students + total_teachers + total_admins,
                "students": total_students,
                "teachers": total_teachers,
                "admins": total_admins,
                "suspended": suspended_users,
            },
            "classrooms": {
                "total": total_classrooms,
            },
            "assignments": {
                "total": total_assignments,
            },
            "journals": {
                "total": total_journals,
                "approved": approved_journals,
                "submitted": submitted_journals,
                "draft": draft_journals,
                "changes_requested": changes_requested,
            },
            "storage": {
                "assetsCount": assets_count,
                "totalBytes": total_storage_bytes,
            },
        }

    async def list_users(
        self,
        role: str | None = None,
        search: str | None = None,
        department: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Fetch paginated users with optional role, search, and department filtering."""
        filter_query: dict = {}
        if role:
            filter_query["role"] = role
        if department:
            filter_query["profile.department"] = department

        if search:
            escaped_search = re.escape(search.strip())
            filter_query["$or"] = [
                {"email": {"$regex": escaped_search, "$options": "i"}},
                {"profile.name": {"$regex": escaped_search, "$options": "i"}},
                {"profile.enrollmentNumber": {"$regex": escaped_search, "$options": "i"}},
                {"profile.facultyId": {"$regex": escaped_search, "$options": "i"}},
            ]

        total = self.users_col.count_documents(filter_query)
        cursor = (
            self.users_col.find(
                filter_query,
                {
                    "password_hash": 0,
                    "otp": 0,
                    "otp_expires_at": 0,
                    "reset_otp": 0,
                    "reset_otp_expires_at": 0,
                    "reset_otp_sent_at": 0,
                    "reset_otp_failed_attempts": 0,
                },
            )
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )

        users = [self._to_str_id(doc) for doc in cursor]
        return users, total

    async def list_classrooms(
        self,
        search: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Fetch classrooms with creator teacher details and enrollment metrics."""
        filter_query: dict = {}
        if search:
            escaped = re.escape(search.strip())
            filter_query["$or"] = [
                {"name": {"$regex": escaped, "$options": "i"}},
                {"subject": {"$regex": escaped, "$options": "i"}},
                {"code": {"$regex": escaped, "$options": "i"}},
                {"joinCode": {"$regex": escaped, "$options": "i"}},
                {"department": {"$regex": escaped, "$options": "i"}},
            ]

        total = self.classrooms_col.count_documents(filter_query)
        cursor = self.classrooms_col.find(filter_query).sort("createdAt", -1).skip(skip).limit(limit)
        classrooms = [self._to_str_id(doc) for doc in cursor]

        # Enrich with teacher info and enrolled student count
        for c in classrooms:
            teacher_id = c.get("teacherId")
            if teacher_id and ObjectId.is_valid(teacher_id):
                teacher = self.users_col.find_one({"_id": ObjectId(teacher_id)}, {"profile.name": 1, "email": 1})
                if teacher:
                    c["teacherName"] = teacher.get("profile", {}).get("name") or teacher.get("email")
                    c["teacherEmail"] = teacher.get("email")
            
            # Enrollment count
            enrolled_count = self.memberships_col.count_documents({"classroomId": c["id"]})
            c["studentCount"] = enrolled_count

        return classrooms, total

    async def list_journals(
        self,
        classroom_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Fetch all submitted journals across the institution with assignment/student details."""
        filter_query: dict = {}
        if classroom_id:
            filter_query["classroomId"] = classroom_id
        if status:
            filter_query["status"] = status

        total = self.journals_col.count_documents(filter_query)
        cursor = (
            self.journals_col.find(filter_query, {"blocks": 0})
            .sort("updatedAt", -1)
            .skip(skip)
            .limit(limit)
        )
        journals = [self._to_str_id(doc) for doc in cursor]

        # Enrich with student and assignment titles
        for j in journals:
            student_id = j.get("studentId")
            if student_id and ObjectId.is_valid(student_id):
                student = self.users_col.find_one(
                    {"_id": ObjectId(student_id)},
                    {"profile.name": 1, "profile.enrollmentNumber": 1, "email": 1},
                )
                if student:
                    j["studentName"] = student.get("profile", {}).get("name") or student.get("email")
                    j["studentEmail"] = student.get("email")
                    j["enrollmentNumber"] = student.get("profile", {}).get("enrollmentNumber")

            asg_id = j.get("assignmentId")
            if asg_id and ObjectId.is_valid(asg_id):
                asg = self.assignments_col.find_one({"_id": ObjectId(asg_id)}, {"title": 1, "practicalNumber": 1})
                if asg:
                    j["assignmentTitle"] = asg.get("title")
                    j["practicalNumber"] = asg.get("practicalNumber")

        return journals, total

    async def list_audit_logs(
        self,
        skip: int = 0,
        limit: int = 50,
        action: str | None = None,
    ) -> tuple[list[dict], int]:
        """Fetch paginated audit log entries with user info."""
        filter_query: dict = {}
        if action:
            filter_query["action"] = action

        total = self.audit_col.count_documents(filter_query)
        cursor = self.audit_col.find(filter_query).sort("timestamp", -1).skip(skip).limit(limit)
        logs = [self._to_str_id(doc) for doc in cursor]

        for log in logs:
            uid = log.get("userId")
            if uid and ObjectId.is_valid(uid):
                u = self.users_col.find_one({"_id": ObjectId(uid)}, {"profile.name": 1, "email": 1, "role": 1})
                if u:
                    log["userName"] = u.get("profile", {}).get("name") or u.get("email")
                    log["userEmail"] = u.get("email")
                    log["userRole"] = u.get("role")

        return logs, total
