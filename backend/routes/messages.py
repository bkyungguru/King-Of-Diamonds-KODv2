from fastapi import APIRouter, HTTPException, Depends
from models.message import Message, MessageCreate, MessageResponse, Conversation
from utils.auth import get_current_user
from datetime import datetime, timezone
from typing import List
import uuid

router = APIRouter(prefix="/messages", tags=["Messages"])

db = None

def set_db(database):
    global db
    db = database

def get_conversation_id(user1: str, user2: str) -> str:
    """Generate consistent conversation ID for two users"""
    sorted_ids = sorted([user1, user2])
    return f"{sorted_ids[0]}_{sorted_ids[1]}"

@router.post("/send", response_model=MessageResponse)
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message to another user"""
    sender_id = current_user['user_id']
    recipient_id = msg_data.recipient_id
    
    if sender_id == recipient_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Check recipient exists
    recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Get or create conversation
    conversation_id = get_conversation_id(sender_id, recipient_id)
    
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        conversation = Conversation(
            id=conversation_id,
            participant_ids=[sender_id, recipient_id]
        )
        conv_dict = conversation.model_dump()
        conv_dict['created_at'] = conv_dict['created_at'].isoformat()
        conv_dict['last_message_at'] = conv_dict['last_message_at'].isoformat() if conv_dict['last_message_at'] else None
        await db.conversations.insert_one(conv_dict)
    
    # Create message
    message = Message(
        sender_id=sender_id,
        recipient_id=recipient_id,
        conversation_id=conversation_id,
        content=msg_data.content,
        media_url=msg_data.media_url
    )
    
    # Save message
    msg_dict = message.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    msg_dict['read_at'] = msg_dict['read_at'].isoformat() if msg_dict['read_at'] else None
    await db.messages.insert_one(msg_dict)
    
    # Update conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "last_message": msg_data.content[:100],
                "last_message_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"unread_count": 1}
        }
    )
    
    # Get sender info
    sender = await db.users.find_one({"id": sender_id}, {"_id": 0})
    
    return MessageResponse(
        **message.model_dump(),
        sender_name=sender.get('display_name') or sender.get('username'),
        sender_avatar=sender.get('avatar_url')
    )

@router.get("/conversations", response_model=List[dict])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    user_id = current_user['user_id']
    
    conversations = await db.conversations.find(
        {"participant_ids": user_id}, {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('last_message_at'), str) and conv['last_message_at']:
            conv['last_message_at'] = datetime.fromisoformat(conv['last_message_at'])
        
        # Get other user info
        other_user_id = [p for p in conv['participant_ids'] if p != user_id][0]
        other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0})
        
        # Count unread messages
        unread = await db.messages.count_documents({
            "conversation_id": conv['id'],
            "recipient_id": user_id,
            "is_read": False
        })
        
        result.append({
            **conv,
            "other_user_name": other_user.get('display_name') or other_user.get('username') if other_user else None,
            "other_user_avatar": other_user.get('avatar_url') if other_user else None,
            "other_user_id": other_user_id,
            "unread_count": unread
        })
    
    return result

@router.get("/conversation/{other_user_id}", response_model=List[MessageResponse])
async def get_conversation_messages(other_user_id: str, skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Get messages in a conversation"""
    user_id = current_user['user_id']
    conversation_id = get_conversation_id(user_id, other_user_id)
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        if isinstance(msg.get('read_at'), str) and msg['read_at']:
            msg['read_at'] = datetime.fromisoformat(msg['read_at'])
        
        sender = await db.users.find_one({"id": msg['sender_id']}, {"_id": 0})
        
        result.append(MessageResponse(
            **msg,
            sender_name=sender.get('display_name') or sender.get('username') if sender else None,
            sender_avatar=sender.get('avatar_url') if sender else None
        ))
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "recipient_id": user_id, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return result[::-1]  # Return in chronological order

@router.post("/read/{message_id}")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a specific message as read"""
    user_id = current_user['user_id']
    
    result = await db.messages.update_one(
        {"id": message_id, "recipient_id": user_id, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"marked_read": result.modified_count > 0}

@router.post("/typing/{other_user_id}")
async def set_typing_status(other_user_id: str, is_typing: bool = True, current_user: dict = Depends(get_current_user)):
    """Set typing status (for real-time UI - stored temporarily)"""
    user_id = current_user['user_id']
    conversation_id = get_conversation_id(user_id, other_user_id)
    
    # Store typing status with expiry
    await db.typing_status.update_one(
        {"user_id": user_id, "conversation_id": conversation_id},
        {
            "$set": {
                "is_typing": is_typing,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"status": "ok"}

@router.get("/typing/{other_user_id}")
async def get_typing_status(other_user_id: str, current_user: dict = Depends(get_current_user)):
    """Check if another user is typing"""
    user_id = current_user['user_id']
    conversation_id = get_conversation_id(user_id, other_user_id)
    
    status = await db.typing_status.find_one(
        {"user_id": other_user_id, "conversation_id": conversation_id}, {"_id": 0}
    )
    
    if status:
        # Check if typing status is recent (within 5 seconds)
        if isinstance(status.get('updated_at'), str):
            updated = datetime.fromisoformat(status['updated_at'])
            if (datetime.now(timezone.utc) - updated).total_seconds() < 5:
                return {"is_typing": status.get('is_typing', False)}
    
    return {"is_typing": False}
