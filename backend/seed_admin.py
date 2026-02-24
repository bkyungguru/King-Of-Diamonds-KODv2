#!/usr/bin/env python3
"""Seed admin user for King of Diamonds"""
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

from pymongo import MongoClient
from utils.auth import hash_password

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'king_of_diamonds')

client = MongoClient(mongo_url)
db = client[db_name]

email = "admin@kingofdiamonds.com"
existing = db.users.find_one({"email": email})

if existing:
    print(f"Admin user already exists (id: {existing.get('id')})")
else:
    admin = {
        "id": str(uuid.uuid4()),
        "email": email,
        "username": "admin",
        "display_name": "Admin",
        "password_hash": hash_password("Admin123!"),
        "role": "admin",
        "is_active": True,
        "is_verified": True,
        "avatar_url": None,
        "bio": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db.users.insert_one(admin)
    print(f"Admin user created (id: {admin['id']})")

client.close()
