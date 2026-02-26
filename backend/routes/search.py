from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/search", tags=["Search"])

db = None

def set_db(database):
    global db
    db = database


def _parse_dt(doc, *fields):
    for f in fields:
        if isinstance(doc.get(f), str):
            doc[f] = datetime.fromisoformat(doc[f])
    return doc


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=1, max_length=100)):
    """Return quick suggestions as user types"""
    regex = {"$regex": q, "$options": "i"}

    # Creators
    creators = await db.creators.find(
        {"is_active": True, "$or": [{"display_name": regex}, {"tags": regex}]},
        {"_id": 0, "id": 1, "display_name": 1, "profile_image_url": 1, "is_verified": 1}
    ).limit(5).to_list(5)

    # Tags – distinct tags matching query
    all_tags = await db.creators.distinct("tags", {"is_active": True})
    matching_tags = [t for t in all_tags if q.lower() in t.lower()][:5]

    return {"creators": creators, "tags": matching_tags}


@router.get("/")
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    tab: str = Query("all", regex="^(all|creators|content|tags)$"),
    skip: int = 0,
    limit: int = 20,
):
    """Full search across creators, content, and tags"""
    regex = {"$regex": q, "$options": "i"}
    results = {"creators": [], "content": [], "tags": [], "query": q}

    if tab in ("all", "creators"):
        creators = await db.creators.find(
            {"is_active": True, "$or": [
                {"display_name": regex}, {"bio": regex}, {"tags": regex}
            ]},
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(limit)
        for c in creators:
            _parse_dt(c, "created_at", "updated_at", "last_seen")
        results["creators"] = creators

    if tab in ("all", "content"):
        content = await db.content.find(
            {"is_active": True, "is_public": True, "$or": [
                {"title": regex}, {"text": regex}
            ]},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        # Attach creator info
        for c in content:
            _parse_dt(c, "created_at", "updated_at")
            creator = await db.creators.find_one({"id": c.get("creator_id")}, {"_id": 0, "display_name": 1, "profile_image_url": 1})
            if creator:
                c["creator_display_name"] = creator.get("display_name")
                c["creator_profile_image"] = creator.get("profile_image_url")
        results["content"] = content

    if tab in ("all", "tags"):
        all_tags = await db.creators.distinct("tags", {"is_active": True})
        results["tags"] = [t for t in all_tags if q.lower() in t.lower()]

    return results
