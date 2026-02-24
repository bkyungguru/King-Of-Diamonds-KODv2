from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class SubscriptionBase(BaseModel):
    user_id: str
    creator_id: str
    tier: str = "standard"  # standard, premium, vip
    price_paid: float

class SubscriptionCreate(BaseModel):
    creator_id: str
    tier: str = "standard"

class Subscription(SubscriptionBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    auto_renew: bool = True
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    creator_id: str
    tier: str
    price_paid: float
    is_active: bool
    auto_renew: bool
    started_at: datetime
    expires_at: Optional[datetime] = None
    creator_display_name: Optional[str] = None
    creator_profile_image: Optional[str] = None
