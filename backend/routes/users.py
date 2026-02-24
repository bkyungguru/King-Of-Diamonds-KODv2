from fastapi import APIRouter, HTTPException, Depends
from models.user import UserResponse, UserUpdate
from utils.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/users", tags=["Users"])

db = None

def set_db(database):
    global db
    db = database

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user_doc = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('updated_at'), str):
        user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    return UserResponse(**user_doc)

@router.put("/me", response_model=UserResponse)
async def update_current_user(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user profile"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": update_dict}
    )
    
    user_doc = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('updated_at'), str):
        user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    return UserResponse(**user_doc)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str):
    """Get a user's public profile"""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('updated_at'), str):
        user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    # Don't expose sensitive fields for other users
    user_doc.pop('password_hash', None)
    return UserResponse(**user_doc)
