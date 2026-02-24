from fastapi import APIRouter, HTTPException, Depends
from models.subscription import Subscription, SubscriptionCreate, SubscriptionResponse
from utils.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import List

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe_to_creator(sub_data: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    """Subscribe to a creator (MOCKED - no real payment)"""
    user_id = current_user['user_id']
    
    # Check if creator exists
    creator = await db.creators.find_one({"id": sub_data.creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Check if already subscribed
    existing = await db.subscriptions.find_one(
        {"user_id": user_id, "creator_id": sub_data.creator_id, "is_active": True}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed")
    
    # Create subscription (MOCKED)
    subscription = Subscription(
        user_id=user_id,
        creator_id=sub_data.creator_id,
        tier=sub_data.tier,
        price_paid=creator.get('subscription_price', 9.99),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Save to database
    sub_dict = subscription.model_dump()
    sub_dict['started_at'] = sub_dict['started_at'].isoformat()
    sub_dict['expires_at'] = sub_dict['expires_at'].isoformat() if sub_dict['expires_at'] else None
    sub_dict['created_at'] = sub_dict['created_at'].isoformat()
    await db.subscriptions.insert_one(sub_dict)
    
    # Update creator subscriber count
    await db.creators.update_one(
        {"id": sub_data.creator_id},
        {"$inc": {"subscriber_count": 1}}
    )
    
    return SubscriptionResponse(
        **subscription.model_dump(),
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.delete("/unsubscribe/{creator_id}")
async def unsubscribe_from_creator(creator_id: str, current_user: dict = Depends(get_current_user)):
    """Unsubscribe from a creator"""
    user_id = current_user['user_id']
    
    # Find and deactivate subscription
    result = await db.subscriptions.update_one(
        {"user_id": user_id, "creator_id": creator_id, "is_active": True},
        {"$set": {"is_active": False, "auto_renew": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Update creator subscriber count
    await db.creators.update_one(
        {"id": creator_id},
        {"$inc": {"subscriber_count": -1}}
    )
    
    return {"message": "Unsubscribed successfully"}

@router.get("/my", response_model=List[SubscriptionResponse])
async def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    """Get current user's active subscriptions"""
    user_id = current_user['user_id']
    
    subscriptions = await db.subscriptions.find(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    ).to_list(1000)
    
    result = []
    for s in subscriptions:
        if isinstance(s.get('started_at'), str):
            s['started_at'] = datetime.fromisoformat(s['started_at'])
        if isinstance(s.get('expires_at'), str) and s['expires_at']:
            s['expires_at'] = datetime.fromisoformat(s['expires_at'])
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        
        creator = await db.creators.find_one({"id": s['creator_id']}, {"_id": 0})
        
        result.append(SubscriptionResponse(
            **s,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None
        ))
    
    return result

@router.get("/check/{creator_id}")
async def check_subscription(creator_id: str, current_user: dict = Depends(get_current_user)):
    """Check if current user is subscribed to a creator"""
    user_id = current_user['user_id']
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id, "creator_id": creator_id, "is_active": True}, {"_id": 0}
    )
    
    return {"is_subscribed": bool(subscription)}
