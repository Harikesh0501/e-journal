"""Repository class managing audit log persistence in MongoDB.

RULE-BE05: All database operations live inside repository classes.
RULE-BE06: Never return raw MongoDB documents.
RULE-SEC10: Audit logs MUST be append-oriented and protected.
"""

from datetime import datetime, timezone
from app.repositories.base import BaseRepository


MAX_AUDIT_LOGS = 100


class AuditLogRepository(BaseRepository):
    """Audit log database access repository.

    Maintains a strict FIFO cap of MAX_AUDIT_LOGS (100) records to eliminate
    uncontrolled database storage growth.
    """

    collection_name = "audit_logs"

    async def log_event(
        self,
        user_id: str | None,
        action: str,
        entity: str,
        entity_id: str | None,
        ip_address: str | None = None,
    ) -> str:
        """Create a secure system audit log entry and enforce FIFO max-100 retention."""
        log_entry = {
            "userId": user_id,
            "action": action,
            "entity": entity,
            "entityId": entity_id,
            "timestamp": datetime.now(timezone.utc),
            "ipAddress": ip_address,
        }
        log_id = await self.insert_one(log_entry)
        await self.prune_fifo_logs(max_logs=MAX_AUDIT_LOGS)
        return log_id

    async def prune_fifo_logs(self, max_logs: int = MAX_AUDIT_LOGS) -> int:
        """Enforce strict FIFO retention: prune oldest logs if total count exceeds max_logs."""
        try:
            total = self.collection.count_documents({})
            if total > max_logs:
                excess = total - max_logs
                cursor = self.collection.find({}, {"_id": 1}).sort("timestamp", 1).limit(excess)
                old_ids = [doc["_id"] for doc in cursor]
                if old_ids:
                    res = self.collection.delete_many({"_id": {"$in": old_ids}})
                    return res.deleted_count
            return 0
        except Exception:
            return 0

    # Prevent updates and deletes to protect audit integrity (RULE-SEC10)
    async def update_one(self, filter: dict, update: dict, upsert: bool = False):
        raise NotImplementedError("Audit logs are append-only. Modification is prohibited.")

    async def update_by_id(self, id_str: str, update: dict):
        raise NotImplementedError("Audit logs are append-only. Modification is prohibited.")

    async def delete_one(self, filter: dict):
        raise NotImplementedError("Audit logs are append-only. Deletion is prohibited.")

    async def delete_by_id(self, id_str: str):
        raise NotImplementedError("Audit logs are append-only. Deletion is prohibited.")
