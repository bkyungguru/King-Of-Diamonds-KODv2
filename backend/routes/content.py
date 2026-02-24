from fastapi import APIRouter, HTTPException, Depends
from models.content import Content, ContentCreate, ContentUpdate, ContentResponse
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter(prefix="/content", tags=["Content"])

db = None

VALID_REACTIONS = ['love', 'fire', 'clap', 'heart_eyes', 'diamond']

def set_db(database):
    global db
    db = database

@router.post("/", response_model=ContentResponse)
async def create_content(content_data: ContentCreate, current_user: dict = Depends(get_current_user)):
    """Create new content (creators only)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator to post content")
    
    # Set visibility based on is_public for backward compatibility
    visibility = content_data.visibility
    if content_data.is_public:
        visibility = "public"
    
    # Create content
    content = Content(
        creator_id=creator['id'],
        title=content_data.title,
        text=content_data.text,
        media_urls=content_data.media_urls,
        media_type=content_data.media_type,
        is_public=content_data.is_public,
        visibility=visibility
    )
    
    # Save to database
    content_dict = content.model_dump()
    content_dict['created_at'] = content_dict['created_at'].isoformat()
    content_dict['updated_at'] = content_dict['updated_at'].isoformat()
    await db.content.insert_one(content_dict)
    
    return ContentResponse(
        **content.model_dump(),
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.put("/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, update_data: ContentUpdate, current_user: dict = Depends(get_current_user)):
    """Update content (creator only)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    # Check if content belongs to creator
    content = await db.content.find_one({"id": content_id, "creator_id": creator['id']}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found or not authorized")
    
    # Build update dict
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Sync visibility and is_public
    if 'visibility' in update_dict:
        update_dict['is_public'] = update_dict['visibility'] == 'public'
    elif 'is_public' in update_dict:
        update_dict['visibility'] = 'public' if update_dict['is_public'] else 'subscribers'
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.content.update_one({"id": content_id}, {"$set": update_dict})
    
    # Fetch updated content
    updated_content = await db.content.find_one({"id": content_id}, {"_id": 0})
    if isinstance(updated_content.get('created_at'), str):
        updated_content['created_at'] = datetime.fromisoformat(updated_content['created_at'])
    if isinstance(updated_content.get('updated_at'), str):
        updated_content['updated_at'] = datetime.fromisoformat(updated_content['updated_at'])
    
    return ContentResponse(
        **updated_content,
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.delete("/{content_id}")
async def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Delete content (creator only)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    # Check if content belongs to creator
    content = await db.content.find_one({"id": content_id, "creator_id": creator['id']}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found or not authorized")
    
    # Soft delete
    await db.content.update_one(
        {"id": content_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Content deleted"}

@router.get("/feed", response_model=List[ContentResponse])
async def get_feed(skip: int = 0, limit: int = 20, current_user: dict = Depends(get_current_user)):
    """Get content feed for current user (subscribed + public)"""
    user_id = current_user['user_id']
    
    # Get user's subscriptions
    subscriptions = await db.subscriptions.find(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    ).to_list(1000)
    subscribed_creator_ids = [s['creator_id'] for s in subscriptions]
    
    # Get content: public content OR from subscribed creators (exclude unpublished)
    query = {
        "is_active": True,
        "visibility": {"$ne": "unpublished"},
        "$or": [
            {"is_public": True},
            {"visibility": "public"},
            {"creator_id": {"$in": subscribed_creator_ids}}
        ]
    }
    
    contents = await db.content.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get creator info and reactions
    result = []
    for c in contents:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        
        creator = await db.creators.find_one({"id": c['creator_id']}, {"_id": 0})
        like = await db.likes.find_one({"content_id": c['id'], "user_id": user_id}, {"_id": 0})
        
        result.append(ContentResponse(
            **c,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None,
            creator_online_status=creator.get('online_status') if creator else None,
            is_liked=bool(like),
            user_reaction=like.get('reaction_type') if like else None
        ))
    
    return result

@router.get("/public", response_model=List[ContentResponse])
async def get_public_content(skip: int = 0, limit: int = 20):
    """Get public content (no auth required)"""
    contents = await db.content.find(
        {"is_active": True, "is_public": True}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for c in contents:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        
        creator = await db.creators.find_one({"id": c['creator_id']}, {"_id": 0})
        
        result.append(ContentResponse(
            **c,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None
        ))
    
    return result

@router.get("/creator/{creator_id}", response_model=List[ContentResponse])
async def get_creator_content(creator_id: str, skip: int = 0, limit: int = 20, current_user: Optional[dict] = None):
    """Get content from a specific creator"""
    # Check if user is subscribed
    is_subscribed = False
    user_id = None
    
    if current_user:
        user_id = current_user.get('user_id')
        sub = await db.subscriptions.find_one(
            {"user_id": user_id, "creator_id": creator_id, "is_active": True}, {"_id": 0}
        )
        is_subscribed = bool(sub)
    
    # Get creator's content
    if is_subscribed:
        query = {"creator_id": creator_id, "is_active": True}
    else:
        query = {"creator_id": creator_id, "is_active": True, "is_public": True}
    
    contents = await db.content.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    creator = await db.creators.find_one({"id": creator_id}, {"_id": 0})
    
    result = []
    for c in contents:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        
        is_liked = False
        if user_id:
            like = await db.likes.find_one({"content_id": c['id'], "user_id": user_id}, {"_id": 0})
            is_liked = bool(like)
        
        result.append(ContentResponse(
            **c,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None,
            is_liked=is_liked
        ))
    
    return result

@router.post("/{content_id}/like")
async def like_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Like/unlike content (legacy - use /react for multiple reactions)"""
    user_id = current_user['user_id']
    
    # Check if content exists
    content = await db.content.find_one({"id": content_id}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if already liked
    existing_like = await db.likes.find_one({"content_id": content_id, "user_id": user_id}, {"_id": 0})
    
    if existing_like:
        # Unlike
        await db.likes.delete_one({"content_id": content_id, "user_id": user_id})
        await db.content.update_one({"id": content_id}, {"$inc": {"like_count": -1}})
        return {"message": "Content unliked", "liked": False}
    else:
        # Like
        import uuid
        await db.likes.insert_one({
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "user_id": user_id,
            "reaction_type": "love",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.content.update_one({"id": content_id}, {"$inc": {"like_count": 1}})
        return {"message": "Content liked", "liked": True}

@router.post("/{content_id}/react")
async def react_to_content(content_id: str, reaction_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """React to content with emoji (love, fire, clap, heart_eyes, diamond) or remove reaction"""
    user_id = current_user['user_id']
    
    # Check if content exists
    content = await db.content.find_one({"id": content_id}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if user has existing reaction
    existing = await db.likes.find_one({"content_id": content_id, "user_id": user_id}, {"_id": 0})
    reaction_counts = content.get('reaction_counts', {})
    
    if reaction_type is None:
        # Remove reaction
        if existing:
            old_type = existing.get('reaction_type', 'love')
            await db.likes.delete_one({"content_id": content_id, "user_id": user_id})
            await db.content.update_one(
                {"id": content_id}, 
                {
                    "$inc": {"like_count": -1, f"reaction_counts.{old_type}": -1}
                }
            )
        return {"message": "Reaction removed", "reaction": None, "total_count": max(0, content.get('like_count', 0) - 1)}
    
    # Validate reaction type
    if reaction_type not in VALID_REACTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid reaction. Use: {', '.join(VALID_REACTIONS)}")
    
    import uuid
    
    if existing:
        # Update existing reaction
        old_type = existing.get('reaction_type', 'love')
        await db.likes.update_one(
            {"content_id": content_id, "user_id": user_id},
            {"$set": {"reaction_type": reaction_type, "created_at": datetime.now(timezone.utc).isoformat()}}
        )
        # Update counts
        if old_type != reaction_type:
            await db.content.update_one(
                {"id": content_id},
                {"$inc": {f"reaction_counts.{old_type}": -1, f"reaction_counts.{reaction_type}": 1}}
            )
    else:
        # New reaction
        await db.likes.insert_one({
            "id": str(uuid.uuid4()),
            "content_id": content_id,
            "user_id": user_id,
            "reaction_type": reaction_type,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.content.update_one(
            {"id": content_id},
            {"$inc": {"like_count": 1, f"reaction_counts.{reaction_type}": 1}}
        )
    
    # Get updated counts
    updated = await db.content.find_one({"id": content_id}, {"_id": 0, "like_count": 1, "reaction_counts": 1})
    
    return {
        "message": f"Reacted with {reaction_type}",
        "reaction": reaction_type,
        "total_count": updated.get('like_count', 0),
        "reaction_counts": updated.get('reaction_counts', {})
    }

@router.delete("/{content_id}")
async def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Delete content (creator only)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    # Check if content belongs to creator
    content = await db.content.find_one({"id": content_id, "creator_id": creator['id']}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found or not authorized")
    
    # Soft delete
    await db.content.update_one({"id": content_id}, {"$set": {"is_active": False}})
    
    return {"message": "Content deleted"}
