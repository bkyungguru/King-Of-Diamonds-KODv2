from fastapi import APIRouter, HTTPException, Depends, Query
from utils.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

db = None

def set_db(database):
    global db
    db = database


def _get_date_filter(range_str: str):
    """Return a datetime cutoff based on range string."""
    now = datetime.now(timezone.utc)
    if range_str == "7d":
        return now - timedelta(days=7)
    elif range_str == "30d":
        return now - timedelta(days=30)
    elif range_str == "90d":
        return now - timedelta(days=90)
    return None  # all time


async def _get_creator_id(current_user: dict):
    """Get creator ID for current user, or allow admin access."""
    user_role = current_user.get('role', '')
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator and user_role not in ('admin', 'superadmin'):
        raise HTTPException(status_code=403, detail="Must be a creator or admin")
    return creator['id'] if creator else None


def _parse_date(val):
    """Safely parse a date value that may be string or datetime."""
    if isinstance(val, str):
        return datetime.fromisoformat(val.replace('Z', '+00:00'))
    return val


@router.get("/revenue")
async def get_revenue(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Revenue over time broken down by source (subscriptions, tips, PPV)."""
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    cutoff = _get_date_filter(range)
    
    # Aggregate tips
    tip_match = {"creator_id": cid}
    if cutoff:
        tip_match["created_at"] = {"$gte": cutoff.isoformat()}
    tips = await db.tips.find(tip_match, {"_id": 0, "amount": 1, "created_at": 1}).to_list(10000)
    
    # Aggregate subscriptions
    sub_match = {"creator_id": cid}
    if cutoff:
        sub_match["created_at"] = {"$gte": cutoff.isoformat()}
    subs = await db.subscriptions.find(sub_match, {"_id": 0, "price": 1, "created_at": 1}).to_list(10000)
    
    # Aggregate PPV
    ppv_match = {"creator_id": cid, "purchased": True}
    if cutoff:
        ppv_match["created_at"] = {"$gte": cutoff.isoformat()}
    ppvs = await db.ppv_messages.find(ppv_match, {"_id": 0, "price": 1, "created_at": 1}).to_list(10000)
    
    # Build daily buckets
    buckets = {}
    for t in tips:
        day = _parse_date(t['created_at']).strftime('%Y-%m-%d') if t.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["tips"] += t.get('amount', 0)
    
    for s in subs:
        day = _parse_date(s['created_at']).strftime('%Y-%m-%d') if s.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["subscriptions"] += s.get('price', 0)
    
    for p in ppvs:
        day = _parse_date(p['created_at']).strftime('%Y-%m-%d') if p.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["ppv"] += p.get('price', 0)
    
    data = sorted(buckets.values(), key=lambda x: x['date'])
    
    total_tips = sum(t.get('amount', 0) for t in tips)
    total_subs = sum(s.get('price', 0) for s in subs)
    total_ppv = sum(p.get('price', 0) for p in ppvs)
    
    return {
        "daily": data,
        "totals": {
            "tips": total_tips,
            "subscriptions": total_subs,
            "ppv": total_ppv,
            "total": total_tips + total_subs + total_ppv
        }
    }


@router.get("/subscribers")
async def get_subscribers(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Subscriber count and growth over time."""
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    cutoff = _get_date_filter(range)
    match = {"creator_id": cid}
    if cutoff:
        match["created_at"] = {"$gte": cutoff.isoformat()}
    
    subs = await db.subscriptions.find(match, {"_id": 0, "created_at": 1, "status": 1}).to_list(10000)
    
    # Daily new subscribers
    daily = {}
    for s in subs:
        day = _parse_date(s['created_at']).strftime('%Y-%m-%d') if s.get('created_at') else 'unknown'
        daily.setdefault(day, 0)
        daily[day] += 1
    
    data = [{"date": k, "new_subscribers": v} for k, v in sorted(daily.items())]
    
    # Cumulative
    total = 0
    for d in data:
        total += d['new_subscribers']
        d['cumulative'] = total
    
    # Current active count
    active_count = await db.subscriptions.count_documents({"creator_id": cid, "status": "active"})
    
    return {
        "daily": data,
        "total_subscribers": active_count,
        "new_in_period": len(subs)
    }


@router.get("/top-content")
async def get_top_content(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    sort_by: str = Query("views", regex="^(views|reactions|tips)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Top performing content."""
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    cutoff = _get_date_filter(range)
    match = {"creator_id": cid}
    if cutoff:
        match["created_at"] = {"$gte": cutoff.isoformat()}
    
    sort_field = {
        "views": "view_count",
        "reactions": "reaction_count",
        "tips": "tip_total"
    }.get(sort_by, "view_count")
    
    content = await db.content.find(match, {"_id": 0}).sort(sort_field, -1).to_list(20)
    
    return {"content": content, "sort_by": sort_by}


@router.get("/engagement")
async def get_engagement(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Content engagement rate and viewer demographics."""
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    cutoff = _get_date_filter(range)
    match = {"creator_id": cid}
    if cutoff:
        match["created_at"] = {"$gte": cutoff.isoformat()}
    
    content = await db.content.find(match, {"_id": 0, "view_count": 1, "reaction_count": 1}).to_list(10000)
    
    total_views = sum(c.get('view_count', 0) for c in content)
    total_reactions = sum(c.get('reaction_count', 0) for c in content)
    engagement_rate = (total_reactions / total_views * 100) if total_views > 0 else 0
    
    # Viewer demographics: count unique viewers vs repeat
    # Use subscriptions as proxy for "returning" viewers
    all_subs = await db.subscriptions.find({"creator_id": cid}, {"_id": 0, "user_id": 1, "created_at": 1}).to_list(10000)
    
    if cutoff:
        new_viewers = len([s for s in all_subs if s.get('created_at') and _parse_date(s['created_at']) >= cutoff])
        returning = len(all_subs) - new_viewers
    else:
        new_viewers = len(all_subs)
        returning = 0
    
    return {
        "total_views": total_views,
        "total_reactions": total_reactions,
        "engagement_rate": round(engagement_rate, 2),
        "demographics": {
            "new_viewers": new_viewers,
            "returning_viewers": max(returning, 0)
        },
        "content_count": len(content)
    }


@router.get("/messages-stats")
async def get_message_stats(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Message response rate and average response time."""
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    # Get creator's user_id
    creator = await db.creators.find_one({"id": cid}, {"_id": 0, "user_id": 1})
    if not creator:
        return {"response_rate": 0, "avg_response_time_minutes": 0, "total_conversations": 0}
    
    creator_user_id = creator['user_id']
    
    cutoff = _get_date_filter(range)
    match = {"participants": creator_user_id}
    
    # Count conversations
    conversations = await db.conversations.find(match, {"_id": 0, "id": 1}).to_list(1000)
    
    # Get messages received (not from creator) and creator responses
    total_received = 0
    total_responded = 0
    
    for conv in conversations:
        msg_match = {"conversation_id": conv['id'], "sender_id": {"$ne": creator_user_id}}
        if cutoff:
            msg_match["created_at"] = {"$gte": cutoff.isoformat()}
        received = await db.messages.count_documents(msg_match)
        total_received += received
        
        resp_match = {"conversation_id": conv['id'], "sender_id": creator_user_id}
        if cutoff:
            resp_match["created_at"] = {"$gte": cutoff.isoformat()}
        responded = await db.messages.count_documents(resp_match)
        total_responded += min(responded, received)  # cap at received count
    
    response_rate = (total_responded / total_received * 100) if total_received > 0 else 100
    
    return {
        "response_rate": round(response_rate, 1),
        "total_received": total_received,
        "total_responded": total_responded,
        "total_conversations": len(conversations)
    }


@router.get("/export")
async def export_csv(
    range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    creator_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export analytics data as CSV."""
    # Reuse revenue endpoint data
    cid = creator_id or (await _get_creator_id(current_user))
    if not cid:
        raise HTTPException(status_code=400, detail="creator_id required for admins")

    cutoff = _get_date_filter(range)
    
    # Gather all data
    tip_match = {"creator_id": cid}
    sub_match = {"creator_id": cid}
    ppv_match = {"creator_id": cid, "purchased": True}
    if cutoff:
        tip_match["created_at"] = {"$gte": cutoff.isoformat()}
        sub_match["created_at"] = {"$gte": cutoff.isoformat()}
        ppv_match["created_at"] = {"$gte": cutoff.isoformat()}
    
    tips = await db.tips.find(tip_match, {"_id": 0, "amount": 1, "created_at": 1}).to_list(10000)
    subs = await db.subscriptions.find(sub_match, {"_id": 0, "price": 1, "created_at": 1}).to_list(10000)
    ppvs = await db.ppv_messages.find(ppv_match, {"_id": 0, "price": 1, "created_at": 1}).to_list(10000)
    
    # Build daily buckets
    buckets = {}
    for t in tips:
        day = _parse_date(t['created_at']).strftime('%Y-%m-%d') if t.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["tips"] += t.get('amount', 0)
    for s in subs:
        day = _parse_date(s['created_at']).strftime('%Y-%m-%d') if s.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["subscriptions"] += s.get('price', 0)
    for p in ppvs:
        day = _parse_date(p['created_at']).strftime('%Y-%m-%d') if p.get('created_at') else 'unknown'
        buckets.setdefault(day, {"date": day, "tips": 0, "subscriptions": 0, "ppv": 0})
        buckets[day]["ppv"] += p.get('price', 0)
    
    data = sorted(buckets.values(), key=lambda x: x['date'])
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["date", "tips", "subscriptions", "ppv", "total"])
    writer.writeheader()
    for row in data:
        row["total"] = row["tips"] + row["subscriptions"] + row["ppv"]
        writer.writerow(row)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_{range}.csv"}
    )
