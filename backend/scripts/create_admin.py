"""CLI script to seed or promote an Administrator account for eJournal.

Usage:
    python -m scripts.create_admin --email admin@ejournal.com --password YourSecurePassword123!
    or simply:
    python -m scripts.create_admin
"""

import argparse
import asyncio
import sys
from datetime import datetime, timezone
import structlog

from app.core.database import connect_to_mongodb, close_mongodb_connection
from app.repositories.user_repository import UserRepository
from app.utils.security import hash_password

logger = structlog.get_logger(__name__)


async def seed_admin(email: str, password: str, name: str):
    await connect_to_mongodb()
    user_repo = UserRepository()

    normalized_email = email.lower().strip()
    existing_user = await user_repo.find_by_email(normalized_email)

    password_hash = hash_password(password)
    now = datetime.now(timezone.utc)

    if existing_user:
        print(f"User with email '{normalized_email}' already exists. Promoting to 'admin' role...")
        await user_repo.update_by_id(
            existing_user["id"],
            {
                "$set": {
                    "role": "admin",
                    "password_hash": password_hash,
                    "is_verified": True,
                    "is_profile_complete": True,
                    "status": "active",
                    "profile.name": name,
                    "updatedAt": now,
                }
            },
        )
        print(f"SUCCESS: Account '{normalized_email}' updated with role='admin'.")
    else:
        print(f"Creating new Super Administrator account: {normalized_email}...")
        admin_doc = {
            "email": normalized_email,
            "password_hash": password_hash,
            "role": "admin",
            "is_verified": True,
            "is_profile_complete": True,
            "status": "active",
            "profile": {
                "name": name,
                "department": "Administration",
                "college": "eJournal Central Administration",
            },
            "createdAt": now,
            "updatedAt": now,
        }
        user_id = await user_repo.insert_one(admin_doc)
        print(f"SUCCESS: Created Administrator '{normalized_email}' (ID: {user_id}).")

    await close_mongodb_connection()


def main():
    parser = argparse.ArgumentParser(description="Create or promote an eJournal Admin account.")
    parser.add_argument("--email", default="admin@ejournal.com", help="Administrator email address")
    parser.add_argument("--password", default="Admin@123456", help="Administrator password (min 8 chars)")
    parser.add_argument("--name", default="System Administrator", help="Administrator display name")

    args = parser.parse_args()

    if len(args.password) < 8:
        print("ERROR: Password must be at least 8 characters long.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("eJournal Administrator Seeding Utility")
    print("=" * 60)
    print(f"Email:    {args.email}")
    print(f"Name:     {args.name}")
    print(f"Password: {'*' * len(args.password)}")
    print("=" * 60 + "\n")

    asyncio.run(seed_admin(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
