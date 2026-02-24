from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str
    role: str = "user"  # user, creator, admin, superadmin
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: EmailStr
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
