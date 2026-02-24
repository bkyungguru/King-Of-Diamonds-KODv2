from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class StoryBase(BaseModel):
    media_url: str
    media_type: str = "image"  # image, video
    caption: Optional[str] = None

class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "image"
    caption: Optional[str] = None

class Story(StoryBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    views: int = 0
    viewed_by: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    creator_id: str
    media_url: str
    media_type: str
    caption: Optional[str] = None
    views: int
    is_viewed: bool = False
    created_at: datetime
    expires_at: datetime
    creator_display_name: Optional[str] = None
    creator_profile_image: Optional[str] = None
