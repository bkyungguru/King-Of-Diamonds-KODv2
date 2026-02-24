from fastapi import APIRouter, HTTPException, Depends
from models.ppv import PPVMessage, PPVMessageCreate, PPVMessageResponse, MassMessage, MassMessageCreate, FanList
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List
import uuid

router = APIRouter(prefix="/ppv", tags=["Pay-Per-View"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/message", response_model=PPVMessageResponse)
async def send_ppv_message(ppv_data: PPVMessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a PPV (pay-to-unlock) message"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator to send PPV messages")
    
    if ppv_data.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be positive")
    
    # Create PPV message
    ppv_msg = PPVMessage(
        sender_id=current_user['user_id'],
        recipient_id=ppv_data.recipient_id,
        content=ppv_data.content,
        media_urls=ppv_data.media_urls,
        price=ppv_data.price
    )
    
    ppv_dict = ppv_msg.model_dump()
    ppv_dict['created_at'] = ppv_dict['created_at'].isoformat()
    await db.ppv_messages.insert_one(ppv_dict)
    
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    return PPVMessageResponse(
        id=ppv_msg.id,
        sender_id=ppv_msg.sender_id,
        recipient_id=ppv_msg.recipient_id,
        preview_text=ppv_msg.content[:50] + "..." if len(ppv_msg.content) > 50 else "Locked content",
        media_count=len(ppv_msg.media_urls),
        price=ppv_msg.price,
        is_purchased=False,
        created_at=ppv_msg.created_at,
        sender_name=user.get('display_name') or user.get('username'),
        sender_avatar=user.get('avatar_url')
    )

@router.get("/inbox", response_model=List[PPVMessageResponse])
async def get_ppv_inbox(current_user: dict = Depends(get_current_user)):
    """Get received PPV messages"""
    user_id = current_user['user_id']
    
    messages = await db.ppv_messages.find(
        {"recipient_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        if isinstance(msg.get('purchased_at'), str) and msg['purchased_at']:
            msg['purchased_at'] = datetime.fromisoformat(msg['purchased_at'])
        
        sender = await db.users.find_one({"id": msg['sender_id']}, {"_id": 0})
        
        response = PPVMessageResponse(
            id=msg['id'],
            sender_id=msg['sender_id'],
            recipient_id=msg['recipient_id'],
            preview_text=msg['content'][:50] + "..." if len(msg['content']) > 50 else "Locked content",
            media_count=len(msg.get('media_urls', [])),
            price=msg['price'],
            is_purchased=msg.get('is_purchased', False),
            purchased_at=msg.get('purchased_at'),
            created_at=msg['created_at'],
            sender_name=sender.get('display_name') or sender.get('username') if sender else None,
            sender_avatar=sender.get('avatar_url') if sender else None
        )
        
        # Include content if purchased
        if msg.get('is_purchased'):
            response.content = msg['content']
            response.media_urls = msg.get('media_urls', [])
        
        result.append(response)
    
    return result

@router.post("/{ppv_id}/unlock")
async def unlock_ppv_message(ppv_id: str, current_user: dict = Depends(get_current_user)):
    """Unlock/purchase a PPV message (MOCKED)"""
    user_id = current_user['user_id']
    
    ppv = await db.ppv_messages.find_one({"id": ppv_id, "recipient_id": user_id}, {"_id": 0})
    if not ppv:
        raise HTTPException(status_code=404, detail="PPV message not found")
    
    if ppv.get('is_purchased'):
        raise HTTPException(status_code=400, detail="Already purchased")
    
    # MOCKED: In real app, process payment here
    await db.ppv_messages.update_one(
        {"id": ppv_id},
        {"$set": {
            "is_purchased": True,
            "purchased_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add to creator earnings
    sender = await db.users.find_one({"id": ppv['sender_id']}, {"_id": 0})
    if sender:
        creator = await db.creators.find_one({"user_id": ppv['sender_id']}, {"_id": 0})
        if creator:
            await db.creators.update_one(
                {"id": creator['id']},
                {"$inc": {"total_earnings": ppv['price']}}
            )
    
    return {
        "message": "PPV unlocked!",
        "content": ppv['content'],
        "media_urls": ppv.get('media_urls', [])
    }

@router.post("/mass-message")
async def send_mass_message(msg_data: MassMessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a mass message to subscribers"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    # Get subscriber list
    if msg_data.recipient_list == "all" or not msg_data.recipient_list:
        subscribers = await db.subscriptions.find(
            {"creator_id": creator['id'], "is_active": True}, {"_id": 0}
        ).to_list(10000)
        recipient_ids = [s['user_id'] for s in subscribers]
    elif msg_data.recipient_list == "top_fans":
        # Get top tippers
        pipeline = [
            {"$match": {"creator_id": creator['id']}},
            {"$group": {"_id": "$user_id", "total": {"$sum": "$amount"}}},
            {"$sort": {"total": -1}},
            {"$limit": 50}
        ]
        top_fans = await db.tips.aggregate(pipeline).to_list(50)
        recipient_ids = [f['_id'] for f in top_fans]
    else:
        # Custom list
        fan_list = await db.fan_lists.find_one({
            "id": msg_data.recipient_list,
            "creator_id": creator['id']
        }, {"_id": 0})
        if not fan_list:
            raise HTTPException(status_code=404, detail="Fan list not found")
        recipient_ids = fan_list.get('user_ids', [])
    
    # Create mass message record
    mass_msg = MassMessage(
        creator_id=creator['id'],
        content=msg_data.content,
        media_urls=msg_data.media_urls,
        is_ppv=msg_data.is_ppv,
        ppv_price=msg_data.ppv_price,
        recipient_count=len(recipient_ids)
    )
    
    mass_dict = mass_msg.model_dump()
    mass_dict['sent_at'] = mass_dict['sent_at'].isoformat()
    await db.mass_messages.insert_one(mass_dict)
    
    # Send individual messages or PPV
    for recipient_id in recipient_ids:
        if msg_data.is_ppv and msg_data.ppv_price:
            # Create PPV message
            ppv_msg = PPVMessage(
                sender_id=current_user['user_id'],
                recipient_id=recipient_id,
                content=msg_data.content,
                media_urls=msg_data.media_urls,
                price=msg_data.ppv_price
            )
            ppv_dict = ppv_msg.model_dump()
            ppv_dict['created_at'] = ppv_dict['created_at'].isoformat()
            await db.ppv_messages.insert_one(ppv_dict)
        else:
            # Create regular message
            from models.message import Message
            conversation_id = "_".join(sorted([current_user['user_id'], recipient_id]))
            
            message = Message(
                sender_id=current_user['user_id'],
                recipient_id=recipient_id,
                conversation_id=conversation_id,
                content=msg_data.content,
                media_url=msg_data.media_urls[0] if msg_data.media_urls else None
            )
            msg_dict = message.model_dump()
            msg_dict['created_at'] = msg_dict['created_at'].isoformat()
            msg_dict['read_at'] = None
            await db.messages.insert_one(msg_dict)
    
    return {
        "message": "Mass message sent!",
        "recipient_count": len(recipient_ids),
        "is_ppv": msg_data.is_ppv
    }

# Fan Lists endpoints
@router.post("/lists", response_model=dict)
async def create_fan_list(name: str, description: str = None, current_user: dict = Depends(get_current_user)):
    """Create a new fan list"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    fan_list = FanList(
        creator_id=creator['id'],
        name=name,
        description=description
    )
    
    list_dict = fan_list.model_dump()
    list_dict['created_at'] = list_dict['created_at'].isoformat()
    await db.fan_lists.insert_one(list_dict)
    
    return {"id": fan_list.id, "name": name, "message": "Fan list created"}

@router.get("/lists")
async def get_fan_lists(current_user: dict = Depends(get_current_user)):
    """Get all fan lists"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    lists = await db.fan_lists.find({"creator_id": creator['id']}, {"_id": 0}).to_list(100)
    
    for lst in lists:
        if isinstance(lst.get('created_at'), str):
            lst['created_at'] = datetime.fromisoformat(lst['created_at'])
        lst['member_count'] = len(lst.get('user_ids', []))
    
    return lists

@router.post("/lists/{list_id}/add/{user_id}")
async def add_to_fan_list(list_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Add a user to a fan list"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.fan_lists.update_one(
        {"id": list_id, "creator_id": creator['id']},
        {"$addToSet": {"user_ids": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fan list not found")
    
    return {"message": "User added to list"}

@router.delete("/lists/{list_id}/remove/{user_id}")
async def remove_from_fan_list(list_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a user from a fan list"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.fan_lists.update_one(
        {"id": list_id, "creator_id": creator['id']},
        {"$pull": {"user_ids": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fan list not found or user not in list")
    
    return {"message": "User removed from list"}
