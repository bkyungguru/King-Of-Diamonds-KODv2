from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class VaultItemBase(BaseModel):
    title: Optional[str] = None
    media_url: str
    media_type: str = "image"  # image, video
    tags: List[str] = []

class VaultItemCreate(BaseModel):
    title: Optional[str] = None
    media_url: str
    media_type: str = "image"
    tags: List[str] = []

class VaultItem(VaultItemBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    is_used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VaultItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    creator_id: str
    title: Optional[str] = None
    media_url: str
    media_type: str
    tags: List[str]
    is_used: bool
    created_at: datetime

class ScheduledPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: List[str] = []
    media_type: str = "text"
    is_public: bool = False
    ppv_price: Optional[float] = None
    scheduled_for: datetime
    is_published: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScheduledPostCreate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    media_urls: List[str] = []
    media_type: str = "text"
    is_public: bool = False
    ppv_price: Optional[float] = None
    scheduled_for: datetime
