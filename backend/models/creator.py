from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class CreatorBase(BaseModel):
    display_name: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    subscription_price: float = 9.99
    is_verified: bool = False
    is_featured: bool = False
    social_links: Optional[dict] = None
    tags: List[str] = []
    online_status: str = "offline"  # offline, online, away
    last_seen: Optional[datetime] = None
    schedule: Optional[dict] = None  # {"monday": "9:00 PM EST", "friday": "8:00 PM EST"}

class CreatorCreate(BaseModel):
    display_name: str
    bio: Optional[str] = None
    subscription_price: float = 9.99
    tags: List[str] = []

class CreatorUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    subscription_price: Optional[float] = None
    social_links: Optional[dict] = None
    tags: Optional[List[str]] = None
    online_status: Optional[str] = None
    schedule: Optional[dict] = None

class Creator(CreatorBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subscriber_count: int = 0
    total_earnings: float = 0.0
    is_active: bool = True
    is_featured: bool = False
    featured_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreatorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    display_name: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    subscription_price: float
    subscriber_count: int
    is_verified: bool
    is_featured: bool = False
    tags: List[str]
    social_links: Optional[dict] = None
    online_status: str = "offline"
    last_seen: Optional[datetime] = None
    schedule: Optional[dict] = None
    created_at: datetime
