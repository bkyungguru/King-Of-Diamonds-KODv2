"""
WebSocket signaling server for WebRTC livestreaming.

Architecture:
- Creator connects as broadcaster, captures media locally
- Each viewer connects and gets a peer-to-peer connection with the broadcaster
- Signaling (offer/answer/ICE candidates) flows through this WebSocket server
- Actual media flows peer-to-peer via WebRTC

Message protocol (JSON):
  { "type": "offer"|"answer"|"ice-candidate"|"chat"|"end-stream", ...payload }
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import json
import logging
import jwt
import os

logger = logging.getLogger(__name__)
router = APIRouter()

db = None

def set_db(database):
    global db
    db = database


# Per-stream state
class StreamRoom:
    def __init__(self, stream_id: str):
        self.stream_id = stream_id
        self.broadcaster: WebSocket | None = None
        self.broadcaster_user_id: str | None = None
        self.viewers: Dict[str, WebSocket] = {}  # user_id -> ws

    @property
    def viewer_count(self) -> int:
        return len(self.viewers)


# All active rooms
rooms: Dict[str, StreamRoom] = {}


def get_or_create_room(stream_id: str) -> StreamRoom:
    if stream_id not in rooms:
        rooms[stream_id] = StreamRoom(stream_id)
    return rooms[stream_id]


def decode_token(token: str) -> dict | None:
    """Decode JWT token to get user info."""
    try:
        secret = os.environ.get("JWT_SECRET", "your-secret-key")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception:
        return None


async def broadcast_viewer_count(room: StreamRoom):
    """Send updated viewer count to all participants."""
    msg = json.dumps({"type": "viewer-count", "count": room.viewer_count})
    # Send to broadcaster
    if room.broadcaster:
        try:
            await room.broadcaster.send_text(msg)
        except Exception:
            pass
    # Send to all viewers
    for ws in list(room.viewers.values()):
        try:
            await ws.send_text(msg)
        except Exception:
            pass


async def broadcast_chat(room: StreamRoom, chat_data: dict, sender_id: str):
    """Broadcast a chat message to all participants."""
    msg = json.dumps({"type": "chat", **chat_data})
    all_ws = list(room.viewers.values())
    if room.broadcaster:
        all_ws.append(room.broadcaster)
    for ws in all_ws:
        try:
            await ws.send_text(msg)
        except Exception:
            pass


@router.websocket("/ws/stream/{stream_id}")
async def stream_websocket(websocket: WebSocket, stream_id: str, token: str = Query(None), role: str = Query("viewer")):
    """
    WebSocket endpoint for WebRTC signaling.
    
    Query params:
      - token: JWT auth token
      - role: "broadcaster" or "viewer"
    """
    # Authenticate
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user_data = decode_token(token)
    if not user_data:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = user_data.get("user_id") or user_data.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    await websocket.accept()
    room = get_or_create_room(stream_id)

    if role == "broadcaster":
        room.broadcaster = websocket
        room.broadcaster_user_id = user_id
        logger.info(f"Broadcaster connected to stream {stream_id}")
        
        # Notify existing viewers that broadcaster is ready
        for viewer_id, viewer_ws in list(room.viewers.items()):
            try:
                await viewer_ws.send_text(json.dumps({"type": "broadcaster-ready"}))
            except Exception:
                pass
    else:
        room.viewers[user_id] = websocket
        logger.info(f"Viewer {user_id} joined stream {stream_id}")
        await broadcast_viewer_count(room)
        
        # If broadcaster is already connected, tell the new viewer
        if room.broadcaster:
            try:
                await websocket.send_text(json.dumps({"type": "broadcaster-ready"}))
            except Exception:
                pass

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "offer":
                # Viewer sends offer -> forward to broadcaster
                if room.broadcaster:
                    await room.broadcaster.send_text(json.dumps({
                        "type": "offer",
                        "offer": msg["offer"],
                        "viewer_id": user_id
                    }))

            elif msg_type == "answer":
                # Broadcaster sends answer -> forward to specific viewer
                target_id = msg.get("viewer_id")
                if target_id and target_id in room.viewers:
                    await room.viewers[target_id].send_text(json.dumps({
                        "type": "answer",
                        "answer": msg["answer"]
                    }))

            elif msg_type == "ice-candidate":
                # Forward ICE candidates between peers
                if role == "broadcaster":
                    target_id = msg.get("viewer_id")
                    if target_id and target_id in room.viewers:
                        await room.viewers[target_id].send_text(json.dumps({
                            "type": "ice-candidate",
                            "candidate": msg["candidate"]
                        }))
                else:
                    if room.broadcaster:
                        await room.broadcaster.send_text(json.dumps({
                            "type": "ice-candidate",
                            "candidate": msg["candidate"],
                            "viewer_id": user_id
                        }))

            elif msg_type == "chat":
                await broadcast_chat(room, {
                    "user_id": user_id,
                    "username": msg.get("username", "User"),
                    "message": msg.get("message", ""),
                    "tip_amount": msg.get("tip_amount")
                }, user_id)

            elif msg_type == "end-stream":
                if role == "broadcaster":
                    # Notify all viewers
                    for viewer_ws in list(room.viewers.values()):
                        try:
                            await viewer_ws.send_text(json.dumps({"type": "stream-ended"}))
                        except Exception:
                            pass
                    # Cleanup
                    if stream_id in rooms:
                        del rooms[stream_id]
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user_id} from stream {stream_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if role == "broadcaster":
            # Broadcaster disconnected - auto-end the stream in DB
            if db:
                try:
                    from bson import ObjectId
                    await db.livestreams.update_one(
                        {"_id": ObjectId(stream_id)},
                        {"$set": {"status": "ended"}}
                    )
                    logger.info(f"Auto-ended stream {stream_id} (broadcaster disconnected)")
                except Exception as e:
                    logger.error(f"Failed to auto-end stream: {e}")
            # Notify viewers
            if stream_id in rooms:
                for viewer_ws in list(room.viewers.values()):
                    try:
                        await viewer_ws.send_text(json.dumps({"type": "stream-ended"}))
                    except Exception:
                        pass
                del rooms[stream_id]
        else:
            # Viewer disconnected
            if stream_id in rooms and user_id in room.viewers:
                del room.viewers[user_id]
                await broadcast_viewer_count(room)
