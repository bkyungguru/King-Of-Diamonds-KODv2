from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/discover", tags=["Discover"])

db = None

def set_db(database):
    global db
    db = database


def _parse_dt(doc, *fields):
    for f in fields:
        if isinstance(doc.get(f), str):
            doc[f] = datetime.fromisoformat(doc[f])
    return doc


@router.get("/featured")
async def get_featured_creators(limit: int = 10):
    """Admin-curated featured creators"""
    creators = await db.creators.find(
        {"is_active": True, "is_featured": True}, {"_id": 0}
    ).sort("featured_order", 1).limit(limit).to_list(limit)
    for c in creators:
        _parse_dt(c, "created_at", "updated_at", "last_seen")
    return creators


@router.get("/trending")
async def get_trending_creators(limit: int = 20):
    """Trending creators by subscriber count (proxy for growth)"""
    creators = await db.creators.find(
        {"is_active": True}, {"_id": 0}
    ).sort("subscriber_count", -1).limit(limit).to_list(limit)
    for c in creators:
        _parse_dt(c, "created_at", "updated_at", "last_seen")
    return creators


@router.get("/new")
async def get_new_creators(limit: int = 20):
    """Recently joined creators"""
    creators = await db.creators.find(
        {"is_active": True}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    for c in creators:
        _parse_dt(c, "created_at", "updated_at", "last_seen")
    return creators


@router.get("/tags")
async def get_all_tags():
    """Get all unique tags used by active creators with counts"""
    pipeline = [
        {"$match": {"is_active": True}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    tags = await db.creators.aggregate(pipeline).to_list(50)
    return [{"name": t["_id"], "count": t["count"]} for t in tags]


@router.get("/by-tag")
async def get_creators_by_tag(tag: str, skip: int = 0, limit: int = 20):
    """Get creators filtered by tag"""
    creators = await db.creators.find(
        {"is_active": True, "tags": tag}, {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    for c in creators:
        _parse_dt(c, "created_at", "updated_at", "last_seen")
    return creators


@router.get("/content")
async def get_discover_content(skip: int = 0, limit: int = 20, tag: Optional[str] = None):
    """Public content for discovery grid, optionally filtered by creator tag"""
    if tag:
        # Get creator IDs with this tag
        creator_ids = await db.creators.distinct("id", {"is_active": True, "tags": tag})
        query = {"is_active": True, "is_public": True, "creator_id": {"$in": creator_ids}}
    else:
        query = {"is_active": True, "is_public": True}

    content = await db.content.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for c in content:
        _parse_dt(c, "created_at", "updated_at")
        creator = await db.creators.find_one({"id": c.get("creator_id")}, {"_id": 0, "display_name": 1, "profile_image_url": 1})
        if creator:
            c["creator_display_name"] = creator.get("display_name")
            c["creator_profile_image"] = creator.get("profile_image_url")

    return content
