from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class MessageBase(BaseModel):
    content: str
    media_url: Optional[str] = None

class MessageCreate(BaseModel):
    recipient_id: str
    content: str
    media_url: Optional[str] = None

class Message(MessageBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    recipient_id: str
    conversation_id: str
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    sender_id: str
    recipient_id: str
    conversation_id: str
    content: str
    media_url: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participant_ids: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    other_user_name: Optional[str] = None
    other_user_avatar: Optional[str] = None
