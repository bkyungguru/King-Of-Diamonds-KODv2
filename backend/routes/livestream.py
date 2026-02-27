from fastapi import APIRouter, HTTPException, Depends, Body
from models.livestream import LiveStream, LiveStreamCreate, LiveStreamResponse, StreamChatMessage
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/livestream", tags=["Live Streaming"])

db = None

# In-memory store for active streams (in production, use Redis)
active_streams = {}

def set_db(database):
    global db
    db = database


# ─── Request body models ───

class ChatMessageBody(BaseModel):
    message: str

class TipBody(BaseModel):
    amount: float
    message: Optional[str] = None

class SignalBody(BaseModel):
    type: str
    offer: Optional[dict] = None
    answer: Optional[dict] = None
    candidate: Optional[dict] = None
    viewer_id: Optional[str] = None


# ─── Helper: resolve if user is the broadcaster for a stream ───

async def _is_broadcaster(user_id: str, stream: dict) -> bool:
    """Check if user_id owns the stream via their creator profile."""
    creator = await db.creators.find_one({"user_id": user_id}, {"_id": 0})
    return creator is not None and creator.get("id") == stream.get("creator_id")


@router.post("/create", response_model=LiveStreamResponse)
async def create_stream(stream_data: LiveStreamCreate, current_user: dict = Depends(get_current_user)):
    """Create a new livestream session"""
    user_role = current_user.get('role', 'user')
    
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    
    if not creator:
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
    
    # Check if already has an active stream (live OR offline/pending)
    existing = await db.livestreams.find_one({
        "creator_id": creator['id'],
        "status": {"$in": ["live", "offline"]}
    }, {"_id": 0})
    if existing:
        if existing['status'] == 'live':
            raise HTTPException(status_code=400, detail="You already have an active stream")
        # Return existing offline stream instead of creating a new one
        if isinstance(existing.get('created_at'), str):
            existing['created_at'] = datetime.fromisoformat(existing['created_at'])
        return LiveStreamResponse(
            **existing,
            creator_display_name=creator.get('display_name'),
            creator_profile_image=creator.get('profile_image_url')
        )
    
    stream = LiveStream(
        creator_id=creator['id'],
        title=stream_data.title,
        description=stream_data.description
    )
    
    stream_dict = stream.model_dump()
    stream_dict['created_at'] = stream_dict['created_at'].isoformat()
    await db.livestreams.insert_one(stream_dict)
    logger.info(f"Stream created: {stream.id} by creator {creator['id']}")
    
    return LiveStreamResponse(
        **stream.model_dump(),
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.post("/{stream_id}/start")
async def start_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Start a livestream (transitions from offline to live)"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    stream = await db.livestreams.find_one({"id": stream_id, "creator_id": creator['id']}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream.get('status') == 'ended':
        raise HTTPException(status_code=400, detail="Cannot restart an ended stream")
    
    if stream.get('status') == 'live':
        # Already live — idempotent, just return the key
        return {"message": "Stream already live", "stream_key": stream['stream_key']}
    
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
    
    logger.info(f"Stream started: {stream_id}")
    return {"message": "Stream started", "stream_key": stream['stream_key']}

@router.post("/{stream_id}/end")
async def end_stream(stream_id: str, current_user: dict = Depends(get_current_user)):
    """End a livestream"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.livestreams.update_one(
        {"id": stream_id, "creator_id": creator['id']},
        {"$set": {
            "status": "ended",
            "ended_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Clean up ALL in-memory state
    active_streams.pop(stream_id, None)
    _signal_rooms.pop(stream_id, None)
    
    logger.info(f"Stream ended: {stream_id}")
    return {"message": "Stream ended"}

@router.get("/live", response_model=List[LiveStreamResponse])
async def get_live_streams():
    """Get all currently live streams"""
    streams = await db.livestreams.find({"status": "live"}, {"_id": 0}).to_list(100)
    
    result = []
    for stream in streams:
        for field in ('created_at', 'started_at', 'ended_at'):
            if isinstance(stream.get(field), str) and stream[field]:
                stream[field] = datetime.fromisoformat(stream[field])
        
        creator = await db.creators.find_one({"id": stream['creator_id']}, {"_id": 0})
        
        result.append(LiveStreamResponse(
            **stream,
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None
        ))
    
    return result

@router.get("/{stream_id}", response_model=LiveStreamResponse)
async def get_stream(stream_id: str):
    """Get stream details"""
    stream = await db.livestreams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    for field in ('created_at', 'started_at', 'ended_at'):
        if isinstance(stream.get(field), str) and stream[field]:
            stream[field] = datetime.fromisoformat(stream[field])
    
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
    
    # Initialize active_streams if not yet (handles join before start race)
    if stream_id not in active_streams:
        active_streams[stream_id] = {"viewers": set(), "chat": []}
    
    active_streams[stream_id]["viewers"].add(user_id)
    viewer_count = len(active_streams[stream_id]["viewers"])
    
    await db.livestreams.update_one(
        {"id": stream_id},
        {
            "$set": {"viewer_count": viewer_count},
            "$max": {"peak_viewers": viewer_count}
        }
    )
    
    logger.info(f"Viewer {user_id} joined stream {stream_id} (count: {viewer_count})")
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
        logger.info(f"Viewer {user_id} left stream {stream_id} (count: {viewer_count})")
    
    return {"message": "Left stream"}

@router.post("/{stream_id}/chat")
async def send_chat(stream_id: str, body: ChatMessageBody, current_user: dict = Depends(get_current_user)):
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
        message=body.message
    )
    
    chat_dict = chat_msg.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    await db.stream_chat.insert_one(chat_dict)
    
    # Add to in-memory chat
    if stream_id in active_streams:
        active_streams[stream_id]["chat"].append(chat_dict)
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
async def tip_during_stream(stream_id: str, body: TipBody, current_user: dict = Depends(get_current_user)):
    """Send a tip during a livestream"""
    user_id = current_user['user_id']
    
    stream = await db.livestreams.find_one({"id": stream_id, "status": "live"}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not live")
    
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid tip amount")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    await db.livestreams.update_one(
        {"id": stream_id},
        {"$inc": {"total_tips": body.amount}}
    )
    
    await db.creators.update_one(
        {"id": stream['creator_id']},
        {"$inc": {"total_earnings": body.amount}}
    )
    
    chat_msg = StreamChatMessage(
        stream_id=stream_id,
        user_id=user_id,
        username=user.get('display_name') or user.get('username') or 'User',
        message=body.message or f"Sent a ${body.amount:.2f} tip!",
        tip_amount=body.amount
    )
    
    chat_dict = chat_msg.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    await db.stream_chat.insert_one(chat_dict)
    
    logger.info(f"Tip ${body.amount:.2f} on stream {stream_id} from {user_id}")
    return {"message": "Tip sent!", "amount": body.amount}


# ─── REST-based WebRTC Signaling ───
# Cloudflare blocks WebSocket on Render free tier, so we use polling.
# Structure: { stream_id: { "broadcaster_signals": [...], "viewer_signals": { viewer_id: [...] }, ... } }

_signal_rooms = {}

def _get_room(stream_id: str) -> dict:
    if stream_id not in _signal_rooms:
        _signal_rooms[stream_id] = {
            "broadcaster_signals": [],
            "viewer_signals": {},
            "broadcaster_connected": False,
            "broadcaster_user_id": None,
            "viewers": set(),
        }
    return _signal_rooms[stream_id]


@router.post("/{stream_id}/signal/connect")
async def signal_connect(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Connect to signaling as broadcaster or viewer. Returns role assignment."""
    stream = await db.livestreams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    user_id = current_user['user_id']
    room = _get_room(stream_id)
    
    # BUG FIX: stream.creator_id is a creator profile ID, not a user ID.
    # Must look up the creator profile by user_id and compare its id to stream.creator_id.
    is_broadcaster = await _is_broadcaster(user_id, stream)
    
    if is_broadcaster:
        room["broadcaster_connected"] = True
        room["broadcaster_user_id"] = user_id
        logger.info(f"[signal] Broadcaster connected: stream={stream_id} user={user_id}")
        # Notify all existing viewers that broadcaster is ready
        for vid in room["viewers"]:
            if vid not in room["viewer_signals"]:
                room["viewer_signals"][vid] = []
            room["viewer_signals"][vid].append({"type": "broadcaster-ready"})
        return {"role": "broadcaster", "viewer_count": len(room["viewers"])}
    else:
        room["viewers"].add(user_id)
        if user_id not in room["viewer_signals"]:
            room["viewer_signals"][user_id] = []
        # If broadcaster already connected, tell this viewer immediately
        if room["broadcaster_connected"]:
            room["viewer_signals"][user_id].append({"type": "broadcaster-ready"})
        logger.info(f"[signal] Viewer connected: stream={stream_id} user={user_id}")
        return {"role": "viewer", "broadcaster_ready": room["broadcaster_connected"]}


@router.post("/{stream_id}/signal/send")
async def signal_send(stream_id: str, signal: SignalBody, current_user: dict = Depends(get_current_user)):
    """Send a signaling message (offer/answer/ice-candidate)."""
    user_id = current_user['user_id']
    room = _get_room(stream_id)
    msg_type = signal.type
    
    if msg_type == "offer":
        # Viewer sends offer -> queue for broadcaster
        room["broadcaster_signals"].append({
            "type": "offer",
            "offer": signal.offer,
            "viewer_id": user_id,
        })
        logger.debug(f"[signal] offer from viewer {user_id} -> broadcaster (stream={stream_id})")
    
    elif msg_type == "answer":
        # Broadcaster sends answer -> queue for specific viewer
        viewer_id = signal.viewer_id
        if viewer_id:
            if viewer_id not in room["viewer_signals"]:
                room["viewer_signals"][viewer_id] = []
            room["viewer_signals"][viewer_id].append({
                "type": "answer",
                "answer": signal.answer,
            })
            logger.debug(f"[signal] answer from broadcaster -> viewer {viewer_id} (stream={stream_id})")
        else:
            logger.warning(f"[signal] answer missing viewer_id from user {user_id}")
    
    elif msg_type == "ice-candidate":
        candidate = signal.candidate
        target_viewer = signal.viewer_id
        if target_viewer:
            # Broadcaster sending ICE to viewer
            if target_viewer not in room["viewer_signals"]:
                room["viewer_signals"][target_viewer] = []
            room["viewer_signals"][target_viewer].append({
                "type": "ice-candidate",
                "candidate": candidate,
            })
        else:
            # Viewer sending ICE to broadcaster
            room["broadcaster_signals"].append({
                "type": "ice-candidate",
                "candidate": candidate,
                "viewer_id": user_id,
            })
    
    elif msg_type == "renegotiate":
        # Broadcaster requests viewer to renegotiate
        viewer_id = signal.viewer_id
        if viewer_id and viewer_id in room["viewer_signals"]:
            room["viewer_signals"][viewer_id].append({"type": "renegotiate"})
    
    else:
        logger.warning(f"[signal] Unknown signal type '{msg_type}' from user {user_id}")
    
    return {"ok": True}


@router.get("/{stream_id}/signal/poll")
async def signal_poll(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Poll for pending signaling messages. Returns and clears the queue."""
    user_id = current_user['user_id']
    
    if stream_id not in _signal_rooms:
        return {"signals": []}
    
    room = _signal_rooms[stream_id]
    
    is_broadcaster = (room.get("broadcaster_user_id") == user_id)
    if not is_broadcaster:
        # Fall back to DB check (first poll before connect, or reconnect)
        stream = await db.livestreams.find_one({"id": stream_id}, {"_id": 0})
        if stream:
            is_broadcaster = await _is_broadcaster(user_id, stream)
            if is_broadcaster:
                room["broadcaster_user_id"] = user_id
                room["broadcaster_connected"] = True
    
    if is_broadcaster:
        signals = room["broadcaster_signals"]
        room["broadcaster_signals"] = []
        return {"signals": signals, "viewer_count": len(room["viewers"])}
    else:
        signals = room["viewer_signals"].get(user_id, [])
        room["viewer_signals"][user_id] = []
        return {"signals": signals, "broadcaster_ready": room.get("broadcaster_connected", False)}


@router.post("/{stream_id}/signal/disconnect")
async def signal_disconnect(stream_id: str, current_user: dict = Depends(get_current_user)):
    """Disconnect from signaling."""
    user_id = current_user['user_id']
    
    if stream_id not in _signal_rooms:
        return {"ok": True}
    
    room = _signal_rooms[stream_id]
    
    if room.get("broadcaster_user_id") == user_id:
        # Broadcaster disconnecting — notify all viewers, clean up room
        logger.info(f"[signal] Broadcaster disconnected: stream={stream_id}")
        for vid in room["viewers"]:
            if vid not in room["viewer_signals"]:
                room["viewer_signals"][vid] = []
            room["viewer_signals"][vid].append({"type": "stream-ended"})
        room["broadcaster_connected"] = False
        room["broadcaster_user_id"] = None
        # Don't delete room yet — viewers need to poll the stream-ended message
    else:
        # Viewer disconnecting
        room["viewers"].discard(user_id)
        room["viewer_signals"].pop(user_id, None)
        # Notify broadcaster that a viewer left
        room["broadcaster_signals"].append({
            "type": "viewer-left",
            "viewer_id": user_id,
        })
        logger.info(f"[signal] Viewer {user_id} disconnected from stream {stream_id}")
    
    # Clean up empty rooms
    if not room["broadcaster_connected"] and len(room["viewers"]) == 0:
        _signal_rooms.pop(stream_id, None)
    
    return {"ok": True}
