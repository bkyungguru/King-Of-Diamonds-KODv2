from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class PPVMessageBase(BaseModel):
    content: str
    media_urls: List[str] = []
    price: float

class PPVMessageCreate(BaseModel):
    recipient_id: str
    content: str
    media_urls: List[str] = []
    price: float

class PPVMessage(PPVMessageBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    recipient_id: str
    is_purchased: bool = False
    purchased_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PPVMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    sender_id: str
    recipient_id: str
    preview_text: str  # First 50 chars or "Locked content"
    media_count: int
    price: float
    is_purchased: bool
    purchased_at: Optional[datetime] = None
    created_at: datetime
    # Only included if purchased
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None

class MassMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    content: str
    media_urls: List[str] = []
    is_ppv: bool = False
    ppv_price: Optional[float] = None
    recipient_count: int = 0
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MassMessageCreate(BaseModel):
    content: str
    media_urls: List[str] = []
    is_ppv: bool = False
    ppv_price: Optional[float] = None
    recipient_list: Optional[str] = None  # "all", "top_fans", or list ID

class FanList(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    name: str
    description: Optional[str] = None
    user_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
