from fastapi import APIRouter, HTTPException, Depends
from models.tip import Tip, TipCreate, TipResponse
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/tips", tags=["Tips"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/send", response_model=TipResponse)
async def send_tip(tip_data: TipCreate, current_user: dict = Depends(get_current_user)):
    """Send a tip to a creator (MOCKED - no real payment)"""
    user_id = current_user['user_id']
    
    # Validate amount
    if tip_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Tip amount must be positive")
    
    # Check creator exists
    creator = await db.creators.find_one({"id": tip_data.creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Check content exists (if provided)
    if tip_data.content_id:
        content = await db.content.find_one({"id": tip_data.content_id}, {"_id": 0})
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
    
    # Create tip (MOCKED)
    tip = Tip(
        user_id=user_id,
        creator_id=tip_data.creator_id,
        content_id=tip_data.content_id,
        amount=tip_data.amount,
        message=tip_data.message
    )
    
    # Save to database
    tip_dict = tip.model_dump()
    tip_dict['created_at'] = tip_dict['created_at'].isoformat()
    await db.tips.insert_one(tip_dict)
    
    # Update creator earnings
    await db.creators.update_one(
        {"id": tip_data.creator_id},
        {"$inc": {"total_earnings": tip_data.amount}}
    )
    
    # Update content tip total if applicable
    if tip_data.content_id:
        await db.content.update_one(
            {"id": tip_data.content_id},
            {"$inc": {"tip_total": tip_data.amount}}
        )
    
    # Get user display name
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    return TipResponse(
        **tip.model_dump(),
        user_display_name=user.get('display_name') or user.get('username')
    )

@router.get("/sent", response_model=List[TipResponse])
async def get_sent_tips(current_user: dict = Depends(get_current_user)):
    """Get tips sent by current user"""
    user_id = current_user['user_id']
    
    tips = await db.tips.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for t in tips:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        
        user = await db.users.find_one({"id": t['user_id']}, {"_id": 0})
        
        result.append(TipResponse(
            **t,
            user_display_name=user.get('display_name') or user.get('username') if user else None
        ))
    
    return result

@router.get("/received", response_model=List[TipResponse])
async def get_received_tips(current_user: dict = Depends(get_current_user)):
    """Get tips received by current user (creator only)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    tips = await db.tips.find({"creator_id": creator['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for t in tips:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        
        user = await db.users.find_one({"id": t['user_id']}, {"_id": 0})
        
        result.append(TipResponse(
            **t,
            user_display_name=user.get('display_name') or user.get('username') if user else None
        ))
    
    return result
