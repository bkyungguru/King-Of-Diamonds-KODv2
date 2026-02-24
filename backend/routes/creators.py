from fastapi import APIRouter, HTTPException, Depends
from models.creator import Creator, CreatorCreate, CreatorResponse, CreatorUpdate
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/creators", tags=["Creators"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/become", response_model=CreatorResponse)
async def become_creator(creator_data: CreatorCreate, current_user: dict = Depends(get_current_user)):
    """Become a creator"""
    # Check if already a creator
    existing = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already a creator")
    
    # Create creator profile
    creator = Creator(
        user_id=current_user['user_id'],
        display_name=creator_data.display_name,
        bio=creator_data.bio,
        subscription_price=creator_data.subscription_price,
        tags=creator_data.tags
    )
    
    # Save to database
    creator_dict = creator.model_dump()
    creator_dict['created_at'] = creator_dict['created_at'].isoformat()
    creator_dict['updated_at'] = creator_dict['updated_at'].isoformat()
    await db.creators.insert_one(creator_dict)
    
    # Update user role
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {"role": "creator", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return CreatorResponse(**creator.model_dump())

@router.get("/me", response_model=CreatorResponse)
async def get_my_creator_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's creator profile"""
    creator_doc = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator_doc:
        raise HTTPException(status_code=404, detail="Creator profile not found")
    
    if isinstance(creator_doc.get('created_at'), str):
        creator_doc['created_at'] = datetime.fromisoformat(creator_doc['created_at'])
    if isinstance(creator_doc.get('updated_at'), str):
        creator_doc['updated_at'] = datetime.fromisoformat(creator_doc['updated_at'])
    
    return CreatorResponse(**creator_doc)

@router.put("/me/status")
async def update_online_status(status: str, current_user: dict = Depends(get_current_user)):
    """Update creator online status"""
    if status not in ['online', 'offline', 'away']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator profile not found")
    
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {
            "online_status": status,
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Status updated to {status}"}

@router.put("/me/schedule")
async def update_schedule(schedule: dict, current_user: dict = Depends(get_current_user)):
    """Update creator schedule (e.g., {"monday": "9 PM EST", "friday": "8 PM EST"})"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator profile not found")
    
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {
            "schedule": schedule,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Schedule updated"}

@router.put("/me", response_model=CreatorResponse)
async def update_creator_profile(update_data: CreatorUpdate, current_user: dict = Depends(get_current_user)):
    """Update creator profile"""
    creator_doc = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator_doc:
        raise HTTPException(status_code=404, detail="Creator profile not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": update_dict}
    )
    
    creator_doc = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if isinstance(creator_doc.get('created_at'), str):
        creator_doc['created_at'] = datetime.fromisoformat(creator_doc['created_at'])
    if isinstance(creator_doc.get('updated_at'), str):
        creator_doc['updated_at'] = datetime.fromisoformat(creator_doc['updated_at'])
    
    return CreatorResponse(**creator_doc)

@router.get("/featured", response_model=List[CreatorResponse])
async def get_featured_creators():
    """Get featured creators for homepage"""
    creators = await db.creators.find(
        {"is_active": True, "is_featured": True}, {"_id": 0}
    ).sort("featured_order", 1).to_list(10)
    
    result = []
    for c in creators:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        if isinstance(c.get('last_seen'), str):
            c['last_seen'] = datetime.fromisoformat(c['last_seen'])
        result.append(CreatorResponse(**c))
    
    return result

@router.get("/", response_model=List[CreatorResponse])
async def list_creators(skip: int = 0, limit: int = 20, tag: str = None):
    """List all active creators"""
    query = {"is_active": True}
    if tag:
        query["tags"] = tag
    
    creators = await db.creators.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for c in creators:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
        result.append(CreatorResponse(**c))
    
    return result

@router.get("/{creator_id}", response_model=CreatorResponse)
async def get_creator_profile(creator_id: str):
    """Get a creator's public profile"""
    creator_doc = await db.creators.find_one({"id": creator_id}, {"_id": 0})
    if not creator_doc:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    if isinstance(creator_doc.get('created_at'), str):
        creator_doc['created_at'] = datetime.fromisoformat(creator_doc['created_at'])
    if isinstance(creator_doc.get('updated_at'), str):
        creator_doc['updated_at'] = datetime.fromisoformat(creator_doc['updated_at'])
    
    return CreatorResponse(**creator_doc)
