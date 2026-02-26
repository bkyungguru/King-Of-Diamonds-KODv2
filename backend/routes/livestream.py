from fastapi import APIRouter, HTTPException, Depends
from models.livestream import LiveStream, LiveStreamCreate, LiveStreamResponse, StreamChatMessage
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List
import uuid

router = APIRouter(prefix="/livestream", tags=["Live Streaming"])

db = None

# In-memory store for active streams (in production, use Redis)
active_streams = {}

def set_db(database):
    global db
    db = database

@router.post("/create", response_model=LiveStreamResponse)
async def create_stream(stream_data: LiveStreamCreate, current_user: dict = Depends(get_current_user)):
    """Create a new livestream session"""
    user_role = current_user.get('role', 'user')
    
    # Check if user has a creator profile (creators, admins, superadmins can go live)
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    
    if not creator:
        # Auto-create creator profile for admins/superadmins
        if user_role in ['admin', 'superadmin']:
            user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
            creator = {
                "id": str(uuid.uuid4()),
                "user_id": current_user['user_id'],
                "display_name": user.get('display_name') or user.get('username') or 'Admin',
                "bio": None,
                "profile_image_url": user.get('avatar_url'),
                "cover_image_url": None,
                "subscription_price": 0,
                "is_verified": True,
                "is_featured": False,
                "featured_order": 0,
                "social_links": None,
                "tags": [],
                "online_status": "online",
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "schedule": None,
                "subscriber_count": 0,
                "total_earnings": 0.0,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.creators.insert_one(creator)
        else:
            raise HTTPException(status_code=403, detail="Must be a creator to go live")
    
    # Check if already has an active stream
    existing = await db.livestreams.find_one({
        "creator_id": creator['id'],
        "status": "live"
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active stream")
    
    stream = LiveStream(
        creator_id=creator['id'],
        title=stream_data.title,
        description=stream_data.description
    )
    
    stream_dict = stream.model_dump()
    stream_dict['created_at'] = stream_dict['created_at'].isoformat()
    await db.livestreams.insert_one(stream_dict)
    
    return LiveStreamResponse(
        **stream.model_dump(),
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.post("/{stream_id}/start")
async def start_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Start a livestream"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    stream = await db.livestreams.find_one({"id": stream_id, "creator_id": creator['id']}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    await db.livestreams.update_one(
        {"id": stream_id},
        {"$set": {
            "status": "live",
            "started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Initialize in-memory state
    active_streams[stream_id] = {
        "viewers": set(),
        "chat": []
    }
    
    return {"message": "Stream started", "stream_key": stream['stream_key']}

@router.post("/{stream_id}/end")
async def end_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """End a livestream"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    await db.livestreams.update_one(
        {"id": stream_id, "creator_id": creator['id']},
        {"$set": {
            "status": "ended",
            "ended_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Clean up in-memory state
    if stream_id in active_streams:
        del active_streams[stream_id]
    
    return {"message": "Stream ended"}

@router.get("/live", response_model=List[LiveStreamResponse])
async def get_live_streams():
    """Get all currently live streams"""
    streams = await db.livestreams.find({"status": "live"}, {"_id": 0}).to_list(100)
    
    result = []
    for stream in streams:
        if isinstance(stream.get('created_at'), str):
            stream['created_at'] = datetime.fromisoformat(stream['created_at'])
        if isinstance(stream.get('started_at'), str) and stream['started_at']:
            stream['started_at'] = datetime.fromisoformat(stream['started_at'])
        
        creator = await db.creators.find_one({"id": stream['creator_id']}, {"_id": 0})
        
        result.append(LiveStreamResponse(
            **stream,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None
        ))
    
    return result

@router.get("/{stream_id}", response_model=LiveStreamResponse)
async def get_stream(stream_id: str):
    """Get stream details. Auto-cleans stale 'live' streams if broadcaster is gone."""
    stream = await db.livestreams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Note: stale stream cleanup is handled by WebSocket disconnect handler in livestream_ws.py
    # No cleanup here — avoids race conditions when broadcaster is still connecting
    
    if isinstance(stream.get('created_at'), str):
        stream['created_at'] = datetime.fromisoformat(stream['created_at'])
    if isinstance(stream.get('started_at'), str) and stream['started_at']:
        stream['started_at'] = datetime.fromisoformat(stream['started_at'])
    
    creator = await db.creators.find_one({"id": stream['creator_id']}, {"_id": 0})
    
    return LiveStreamResponse(
        **stream,
        creator_display_name=creator.get('display_name') if creator else None,
        creator_profile_image=creator.get('profile_image_url') if creator else None
    )

@router.post("/{stream_id}/join")
async def join_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Join a livestream as a viewer"""
    user_id = current_user['user_id']
    
    stream = await db.livestreams.find_one({"id": stream_id, "status": "live"}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    # Check subscription (unless it's the creator themselves)
    creator = await db.creators.find_one({"id": stream['creator_id']}, {"_id": 0})
    if creator and creator.get('user_id') != user_id:
        subscription = await db.subscriptions.find_one({
            "user_id": user_id,
            "creator_id": stream['creator_id'],
            "is_active": True
        }, {"_id": 0})
        if not subscription:
            raise HTTPException(status_code=403, detail="Must be subscribed to watch")
    
    # Update viewer count
    if stream_id in active_streams:
        active_streams[stream_id]["viewers"].add(user_id)
        viewer_count = len(active_streams[stream_id]["viewers"])
        
        await db.livestreams.update_one(
            {"id": stream_id},
            {
                "$set": {"viewer_count": viewer_count},
                "$max": {"peak_viewers": viewer_count}
            }
        )
    
    return {"message": "Joined stream", "stream_key": stream.get('stream_key')}

@router.post("/{stream_id}/leave")
async def leave_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Leave a livestream"""
    user_id = current_user['user_id']
    
    if stream_id in active_streams:
        active_streams[stream_id]["viewers"].discard(user_id)
        viewer_count = len(active_streams[stream_id]["viewers"])
        
        await db.livestreams.update_one(
            {"id": stream_id},
            {"$set": {"viewer_count": viewer_count}}
        )
    
    return {"message": "Left stream"}

@router.post("/{stream_id}/chat")
async def send_chat(stream_id: str, message: str, current_user: dict = Depends(get_current_user)):
    """Send a chat message in a livestream"""
    user_id = current_user['user_id']
    
    stream = await db.livestreams.find_one({"id": stream_id, "status": "live"}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not live")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    chat_msg = StreamChatMessage(
        stream_id=stream_id,
        user_id=user_id,
        username=user.get('display_name') or user.get('username') or 'User',
        message=message
    )
    
    chat_dict = chat_msg.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    await db.stream_chat.insert_one(chat_dict)
    
    # Add to in-memory chat
    if stream_id in active_streams:
        active_streams[stream_id]["chat"].append(chat_dict)
        # Keep only last 100 messages in memory
        if len(active_streams[stream_id]["chat"]) > 100:
            active_streams[stream_id]["chat"] = active_streams[stream_id]["chat"][-100:]
    
    return chat_dict

@router.get("/{stream_id}/chat")
async def get_chat(stream_id: str, since: str = None):
    """Get chat messages for a stream"""
    query = {"stream_id": stream_id}
    if since:
        query["created_at"] = {"$gt": since}
    
    messages = await db.stream_chat.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

@router.post("/{stream_id}/tip")
async def tip_during_stream(stream_id: str, amount: float, message: str = None, current_user: dict = Depends(get_current_user)):
    """Send a tip during a livestream (MOCKED)"""
    user_id = current_user['user_id']
    
    stream = await db.livestreams.find_one({"id": stream_id, "status": "live"}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not live")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid tip amount")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    # Update stream tips
    await db.livestreams.update_one(
        {"id": stream_id},
        {"$inc": {"total_tips": amount}}
    )
    
    # Update creator earnings
    await db.creators.update_one(
        {"id": stream['creator_id']},
        {"$inc": {"total_earnings": amount}}
    )
    
    # Add tip as chat message
    chat_msg = StreamChatMessage(
        stream_id=stream_id,
        user_id=user_id,
        username=user.get('display_name') or user.get('username') or 'User',
        message=message or f"Sent a ${amount:.2f} tip!",
        tip_amount=amount
    )
    
    chat_dict = chat_msg.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    await db.stream_chat.insert_one(chat_dict)
    
    return {"message": "Tip sent!", "amount": amount}
