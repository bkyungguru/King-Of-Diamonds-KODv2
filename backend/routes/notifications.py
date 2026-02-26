from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional
import os
import json
import uuid

router = APIRouter(prefix="/notifications", tags=["Notifications"])

db = None

def set_db(database):
    global db
    db = database


# --- Models ---

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {p256dh, auth}

class NotificationPreferences(BaseModel):
    new_content: bool = True
    new_messages: bool = True
    new_tips: bool = True
    creator_live: bool = True

class NotificationType:
    NEW_CONTENT = "new_content"
    NEW_MESSAGE = "new_message"
    NEW_TIP = "new_tip"
    CREATOR_LIVE = "creator_live"


# --- VAPID key endpoint ---

@router.get("/vapid-key")
async def get_vapid_public_key():
    """Return the public VAPID key for push subscription."""
    key = os.environ.get("VAPID_PUBLIC_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="VAPID keys not configured")
    return {"public_key": key}


# --- Push subscription management ---

@router.post("/subscribe")
async def subscribe_push(sub: PushSubscription, current_user: dict = Depends(get_current_user)):
    """Save a push subscription for the current user."""
    user_id = current_user["user_id"]
    doc = {
        "user_id": user_id,
        "endpoint": sub.endpoint,
        "keys": sub.keys,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    # Upsert by endpoint to avoid duplicates
    await db.push_subscriptions.update_one(
        {"user_id": user_id, "endpoint": sub.endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"message": "Subscribed"}


@router.delete("/subscribe")
async def unsubscribe_push(sub: PushSubscription, current_user: dict = Depends(get_current_user)):
    """Remove a push subscription."""
    await db.push_subscriptions.delete_one(
        {"user_id": current_user["user_id"], "endpoint": sub.endpoint}
    )
    return {"message": "Unsubscribed"}


# --- Notification preferences ---

@router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    prefs = await db.notification_preferences.find_one(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    )
    if not prefs:
        prefs = NotificationPreferences().model_dump()
        prefs["user_id"] = current_user["user_id"]
    return prefs


@router.put("/preferences")
async def update_preferences(prefs: NotificationPreferences, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    doc = prefs.model_dump()
    doc["user_id"] = user_id
    await db.notification_preferences.update_one(
        {"user_id": user_id}, {"$set": doc}, upsert=True
    )
    return {"message": "Preferences updated"}


# --- In-app notifications ---

@router.get("/")
async def get_notifications(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """Get in-app notifications for the current user."""
    user_id = current_user["user_id"]
    cursor = (
        db.notifications.find({"user_id": user_id}, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    notifications = await cursor.to_list(length=limit)
    return {"notifications": notifications}


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents(
        {"user_id": current_user["user_id"], "read": False}
    )
    return {"count": count}


@router.post("/mark-read")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["user_id"], "read": False},
        {"$set": {"read": True}},
    )
    return {"message": "All marked as read"}


@router.post("/mark-read/{notification_id}")
async def mark_one_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}},
    )
    return {"message": "Marked as read"}


# --- Helper: send notification (called from other routes) ---

async def send_notification(
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    icon: Optional[str] = None,
):
    """Create in-app notification and send push to all user subscriptions."""
    # Check user preferences
    prefs = await db.notification_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if prefs and not prefs.get(notification_type, True):
        return  # User disabled this type

    # Save in-app notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "body": body,
        "data": data or {},
        "icon": icon,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notification)

    # Send push to all subscriptions
    subscriptions = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(length=50)

    if not subscriptions:
        return

    try:
        from pywebpush import webpush, WebPushException

        vapid_private = os.environ.get("VAPID_PRIVATE_KEY", "")
        vapid_email = os.environ.get("VAPID_EMAIL", "mailto:admin@kingofdiamonds.com")

        if not vapid_private:
            return

        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": icon or "/logo192.png",
            "data": data or {},
            "tag": notification_type,
        })

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims={"sub": vapid_email},
                )
            except WebPushException as e:
                # If subscription expired (410), remove it
                if "410" in str(e) or "404" in str(e):
                    await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
            except Exception:
                pass
    except ImportError:
        pass  # pywebpush not installed, skip push
