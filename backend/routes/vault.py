from fastapi import APIRouter, HTTPException, Depends
from models.vault import VaultItem, VaultItemCreate, VaultItemResponse, ScheduledPost, ScheduledPostCreate
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/vault", tags=["Media Vault"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/", response_model=VaultItemResponse)
async def add_to_vault(item_data: VaultItemCreate, current_user: dict = Depends(get_current_user)):
    """Add media to vault"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    item = VaultItem(
        creator_id=creator['id'],
        title=item_data.title,
        media_url=item_data.media_url,
        media_type=item_data.media_type,
        tags=item_data.tags
    )
    
    item_dict = item.model_dump()
    item_dict['created_at'] = item_dict['created_at'].isoformat()
    await db.vault.insert_one(item_dict)
    
    return VaultItemResponse(**item.model_dump())

@router.get("/", response_model=List[VaultItemResponse])
async def get_vault(tag: str = None, current_user: dict = Depends(get_current_user)):
    """Get all vault items"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    query = {"creator_id": creator['id']}
    if tag:
        query["tags"] = tag
    
    items = await db.vault.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    result = []
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        result.append(VaultItemResponse(**item))
    
    return result

@router.delete("/{item_id}")
async def delete_vault_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a vault item"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.vault.delete_one({"id": item_id, "creator_id": creator['id']})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}

# Scheduled Posts
@router.post("/schedule", response_model=dict)
async def schedule_post(post_data: ScheduledPostCreate, current_user: dict = Depends(get_current_user)):
    """Schedule a post for later"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    if post_data.scheduled_for <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    scheduled = ScheduledPost(
        creator_id=creator['id'],
        title=post_data.title,
        text=post_data.text,
        media_urls=post_data.media_urls,
        media_type=post_data.media_type,
        is_public=post_data.is_public,
        ppv_price=post_data.ppv_price,
        scheduled_for=post_data.scheduled_for
    )
    
    scheduled_dict = scheduled.model_dump()
    scheduled_dict['created_at'] = scheduled_dict['created_at'].isoformat()
    scheduled_dict['scheduled_for'] = scheduled_dict['scheduled_for'].isoformat()
    await db.scheduled_posts.insert_one(scheduled_dict)
    
    return {"id": scheduled.id, "scheduled_for": scheduled.scheduled_for, "message": "Post scheduled"}

@router.get("/scheduled", response_model=List[dict])
async def get_scheduled_posts(current_user: dict = Depends(get_current_user)):
    """Get all scheduled posts"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    posts = await db.scheduled_posts.find({
        "creator_id": creator['id'],
        "is_published": False
    }, {"_id": 0}).sort("scheduled_for", 1).to_list(100)
    
    for post in posts:
        if isinstance(post.get('created_at'), str):
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        if isinstance(post.get('scheduled_for'), str):
            post['scheduled_for'] = datetime.fromisoformat(post['scheduled_for'])
    
    return posts

@router.delete("/scheduled/{post_id}")
async def cancel_scheduled_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a scheduled post"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.scheduled_posts.delete_one({
        "id": post_id,
        "creator_id": creator['id'],
        "is_published": False
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    
    return {"message": "Scheduled post cancelled"}

@router.post("/scheduled/{post_id}/publish")
async def publish_now(post_id: str, current_user: dict = Depends(get_current_user)):
    """Publish a scheduled post immediately"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    scheduled = await db.scheduled_posts.find_one({
        "id": post_id,
        "creator_id": creator['id'],
        "is_published": False
    }, {"_id": 0})
    
    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    
    # Create the actual content post
    from models.content import Content
    content = Content(
        creator_id=creator['id'],
        title=scheduled.get('title'),
        text=scheduled.get('text'),
        media_urls=scheduled.get('media_urls', []),
        media_type=scheduled.get('media_type', 'text'),
        is_public=scheduled.get('is_public', False)
    )
    
    content_dict = content.model_dump()
    content_dict['created_at'] = content_dict['created_at'].isoformat()
    content_dict['updated_at'] = content_dict['updated_at'].isoformat()
    await db.content.insert_one(content_dict)
    
    # Mark as published
    await db.scheduled_posts.update_one(
        {"id": post_id},
        {"$set": {"is_published": True}}
    )
    
    return {"message": "Post published", "content_id": content.id}
