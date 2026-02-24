from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class TipBase(BaseModel):
    amount: float
    message: Optional[str] = None

class TipCreate(BaseModel):
    creator_id: str
    content_id: Optional[str] = None
    amount: float
    message: Optional[str] = None

class Tip(TipBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    creator_id: str
    content_id: Optional[str] = None
    status: str = "completed"  # pending, completed, refunded (mocked)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TipResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    creator_id: str
    content_id: Optional[str] = None
    amount: float
    message: Optional[str] = None
    status: str
    created_at: datetime
    user_display_name: Optional[str] = None
