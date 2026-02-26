from fastapi import APIRouter, HTTPException, status, Depends
from models.user import User, UserCreate, UserLogin, UserResponse
from utils.auth import hash_password, verify_password, create_token, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database reference will be set by main server
db = None

def set_db(database):
    global db
    db = database

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists (if provided)
    if user_data.username:
        existing_username = await db.users.find_one({"username": user_data.username}, {"_id": 0})
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        username=user_data.username,
        display_name=user_data.display_name or user_data.username or user_data.email.split('@')[0]
    )
    
    # Save to database
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Generate token
    token = create_token(user.id, user.email, user.role)
    
    return {
        "message": "Registration successful",
        "token": token,
        "user": UserResponse(**user.model_dump()).model_dump()
    }

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Parse datetime
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('updated_at'), str):
        user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if active
    if not user_doc.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # Check maintenance mode — only admin/superadmin can login during maintenance
    if user_doc.get('role') not in ['admin', 'superadmin']:
        maintenance = await db.settings.find_one({"key": "maintenance_mode"}, {"_id": 0})
        if maintenance and maintenance.get("value", {}).get("enabled"):
            msg = maintenance.get("value", {}).get("message", "Platform is under maintenance")
            raise HTTPException(status_code=503, detail=msg)
    
    # Generate token
    token = create_token(user_doc['id'], user_doc['email'], user_doc['role'])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": UserResponse(**user_doc).model_dump()
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user_doc = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('updated_at'), str):
        user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    return UserResponse(**user_doc)
