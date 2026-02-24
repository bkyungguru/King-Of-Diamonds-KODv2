from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class LiveStreamBase(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None

class LiveStreamCreate(BaseModel):
    title: str
    description: Optional[str] = None

class LiveStream(LiveStreamBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    stream_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "offline"  # offline, live, ended
    viewer_count: int = 0
    peak_viewers: int = 0
    total_tips: float = 0.0
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LiveStreamResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    creator_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str
    viewer_count: int
    total_tips: float
    started_at: Optional[datetime] = None
    creator_display_name: Optional[str] = None
    creator_profile_image: Optional[str] = None

class StreamChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stream_id: str
    user_id: str
    username: str
    message: str
    tip_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
