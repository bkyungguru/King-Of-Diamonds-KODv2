from fastapi import APIRouter, HTTPException, Depends
from utils.auth import get_current_user, require_role
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])

db = None

def set_db(database):
    global db
    db = database

class AdminStats(BaseModel):
    total_users: int
    total_creators: int
    total_content: int
    total_subscriptions: int
    total_tips_amount: float
    new_users_today: int
    new_creators_today: int

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get platform statistics (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get counts
    total_users = await db.users.count_documents({})
    total_creators = await db.creators.count_documents({})
    total_content = await db.content.count_documents({"is_active": True})
    total_subscriptions = await db.subscriptions.count_documents({"is_active": True})
    
    # Get total tips
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    tips_result = await db.tips.aggregate(pipeline).to_list(1)
    total_tips = tips_result[0]['total'] if tips_result else 0
    
    # Get today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_users_today = await db.users.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    new_creators_today = await db.creators.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    return AdminStats(
        total_users=total_users,
        total_creators=total_creators,
        total_content=total_content,
        total_subscriptions=total_subscriptions,
        total_tips_amount=total_tips,
        new_users_today=new_users_today,
        new_creators_today=new_creators_today
    )

@router.get("/users")
async def list_all_users(skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """List all users (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
        if isinstance(u.get('updated_at'), str):
            u['updated_at'] = datetime.fromisoformat(u['updated_at'])
    
    return users

@router.get("/creators")
async def list_all_creators(skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """List all creators (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    creators = await db.creators.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for c in creators:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
    
    return creators

@router.get("/content")
async def list_all_content(skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """List all content (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    contents = await db.content.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for c in contents:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
    
    return contents

@router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, current_user: dict = Depends(get_current_user)):
    """Enable/disable a user (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {'enabled' if is_active else 'disabled'}"}

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(get_current_user)):
    """Update a user's role (superadmin only)"""
    if current_user.get('role') != 'superadmin':
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    if role not in ['user', 'creator', 'admin', 'superadmin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user role
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If promoting to creator/admin/superadmin, create creator profile if doesn't exist
    if role in ['creator', 'admin', 'superadmin']:
        existing_creator = await db.creators.find_one({"user_id": user_id}, {"_id": 0})
        if not existing_creator:
            import uuid
            creator_profile = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "display_name": user.get('display_name') or user.get('username') or user.get('email', '').split('@')[0],
                "bio": None,
                "profile_image_url": user.get('avatar_url'),
                "cover_image_url": None,
                "subscription_price": 9.99,
                "is_verified": False,
                "is_featured": False,
                "featured_order": 0,
                "social_links": None,
                "tags": [],
                "online_status": "offline",
                "last_seen": None,
                "schedule": None,
                "subscriber_count": 0,
                "total_earnings": 0.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.creators.insert_one(creator_profile)
    
    return {"message": f"User role updated to {role}"}

@router.delete("/content/{content_id}")
async def delete_content_admin(content_id: str, current_user: dict = Depends(get_current_user)):
    """Delete content (admin moderation)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.content.update_one(
        {"id": content_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return {"message": "Content removed"}

class AdminContentUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    visibility: Optional[str] = None

@router.put("/content/{content_id}")
async def edit_content_admin(content_id: str, update_data: AdminContentUpdate, current_user: dict = Depends(get_current_user)):
    """Edit content (admin moderation)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Sync visibility and is_public
    if 'visibility' in update_dict:
        update_dict['is_public'] = update_dict['visibility'] == 'public'
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.content.update_one(
        {"id": content_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return {"message": "Content updated"}

@router.put("/content/{content_id}/flag")
async def flag_content_admin(content_id: str, current_user: dict = Depends(get_current_user)):
    """Flag content for review (admin moderation)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.content.update_one(
        {"id": content_id},
        {"$set": {"is_flagged": True, "flagged_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return {"message": "Content flagged"}

@router.put("/creators/{creator_id}/verify")
async def verify_creator(creator_id: str, is_verified: bool, current_user: dict = Depends(get_current_user)):
    """Verify/unverify a creator (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.creators.update_one(
        {"id": creator_id},
        {"$set": {"is_verified": is_verified, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    return {"message": f"Creator {'verified' if is_verified else 'unverified'}"}

@router.put("/creators/{creator_id}/feature")
async def feature_creator(creator_id: str, is_featured: bool, order: int = 0, current_user: dict = Depends(get_current_user)):
    """Feature/unfeature a creator on homepage (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.creators.update_one(
        {"id": creator_id},
        {"$set": {
            "is_featured": is_featured, 
            "featured_order": order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    return {"message": f"Creator {'featured' if is_featured else 'unfeatured'}"}

@router.get("/featured-creators")
async def get_featured_creators(current_user: dict = Depends(get_current_user)):
    """Get list of featured creators for homepage (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    creators = await db.creators.find(
        {"is_featured": True}, {"_id": 0}
    ).sort("featured_order", 1).to_list(20)
    
    for c in creators:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        if isinstance(c.get('last_seen'), str):
            c['last_seen'] = datetime.fromisoformat(c['last_seen'])
    
    return creators

@router.put("/featured-creators/reorder")
async def reorder_featured_creators(creator_orders: list, current_user: dict = Depends(get_current_user)):
    """Reorder featured creators (admin only). Input: [{"creator_id": "...", "order": 1}, ...]"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    for item in creator_orders:
        await db.creators.update_one(
            {"id": item['creator_id']},
            {"$set": {"featured_order": item['order']}}
        )
    
    return {"message": "Featured creators reordered"}

class FeaturedStreamInput(BaseModel):
    youtube_url: str
    title: Optional[str] = "Featured Live Stream"
    description: Optional[str] = None

@router.get("/featured-stream")
async def get_featured_stream():
    """Get the current featured stream (public endpoint)"""
    stream = await db.settings.find_one({"key": "featured_stream"}, {"_id": 0})
    if not stream or not stream.get("is_active"):
        return {"is_active": False, "stream": None}
    return {"is_active": True, "stream": stream.get("value")}

@router.put("/featured-stream")
async def set_featured_stream(data: FeaturedStreamInput, current_user: dict = Depends(get_current_user)):
    """Set a featured YouTube stream (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Extract YouTube video ID
    import re
    yt_url = data.youtube_url.strip()
    video_id = None
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/live/)([a-zA-Z0-9_-]{11})',
    ]
    for pat in patterns:
        m = re.search(pat, yt_url)
        if m:
            video_id = m.group(1)
            break
    
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/live/...")
    
    stream_data = {
        "youtube_url": yt_url,
        "video_id": video_id,
        "embed_url": f"https://www.youtube.com/embed/{video_id}?autoplay=1",
        "title": data.title,
        "description": data.description,
        "set_by": current_user['user_id'],
        "set_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settings.update_one(
        {"key": "featured_stream"},
        {"$set": {"key": "featured_stream", "value": stream_data, "is_active": True}},
        upsert=True
    )
    
    return {"message": "Featured stream set", "stream": stream_data}

@router.delete("/featured-stream")
async def clear_featured_stream(current_user: dict = Depends(get_current_user)):
    """Clear the featured stream (admin only)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.settings.update_one(
        {"key": "featured_stream"},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Featured stream cleared"}

@router.get("/analytics/growth")
async def get_growth_analytics(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get user/creator growth over time"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Daily user signups
    user_growth = []
    creator_growth = []
    
    for i in range(days):
        day_start = (start_date + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        user_count = await db.users.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        creator_count = await db.creators.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        user_growth.append({"date": day_start.strftime("%Y-%m-%d"), "count": user_count})
        creator_growth.append({"date": day_start.strftime("%Y-%m-%d"), "count": creator_count})
    
    return {
        "user_growth": user_growth,
        "creator_growth": creator_growth
    }

@router.get("/analytics/revenue")
async def get_revenue_analytics(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get revenue analytics (subscriptions + tips)"""
    if current_user.get('role') not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    revenue_data = []
    
    for i in range(days):
        day_start = (start_date + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Get subscription revenue
        sub_pipeline = [
            {"$match": {"created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$price_paid"}}}
        ]
        sub_result = await db.subscriptions.aggregate(sub_pipeline).to_list(1)
        sub_revenue = sub_result[0]['total'] if sub_result else 0
        
        # Get tips revenue
        tip_pipeline = [
            {"$match": {"created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        tip_result = await db.tips.aggregate(tip_pipeline).to_list(1)
        tip_revenue = tip_result[0]['total'] if tip_result else 0
        
        revenue_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "subscriptions": sub_revenue,
            "tips": tip_revenue,
            "total": sub_revenue + tip_revenue
        })
    
    return {"revenue": revenue_data}
