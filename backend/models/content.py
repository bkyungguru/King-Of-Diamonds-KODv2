from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class ContentBase(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: List[str] = []
    media_type: str = "text"  # text, image, video, mixed
    is_public: bool = False
    is_pinned: bool = False
    visibility: str = "subscribers"  # public, subscribers, unpublished

class ContentCreate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: List[str] = []
    media_type: str = "text"
    is_public: bool = False
    visibility: str = "subscribers"  # public, subscribers, unpublished

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: Optional[List[str]] = None
    media_type: Optional[str] = None
    is_public: Optional[bool] = None
    visibility: Optional[str] = None

class Content(ContentBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    like_count: int = 0
    comment_count: int = 0
    tip_total: float = 0.0
    reaction_counts: Dict[str, int] = {}  # {"love": 5, "fire": 3, ...}
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    creator_id: str
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: List[str]
    media_type: str
    is_public: bool
    is_pinned: bool
    visibility: str = "subscribers"
    like_count: int
    comment_count: int
    tip_total: float
    reaction_counts: Dict[str, int] = {}
    created_at: datetime
    creator_display_name: Optional[str] = None
    creator_profile_image: Optional[str] = None
    creator_online_status: Optional[str] = None  # online, away, offline
    is_liked: bool = False
    user_reaction: Optional[str] = None  # The current user's reaction type
