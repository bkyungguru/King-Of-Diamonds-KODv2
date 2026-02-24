from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from utils.auth import get_current_user
from utils.uploads import save_upload, get_upload_path, UPLOAD_DIR
from pathlib import Path

router = APIRouter(prefix="/uploads", tags=["Uploads"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a user avatar"""
    url = await save_upload(file, 'avatars')
    
    # Update user avatar
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {"avatar_url": url}}
    )
    
    return {"url": url}

@router.post("/cover")
async def upload_cover(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a creator cover image"""
    url = await save_upload(file, 'covers')
    
    # Update creator cover
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"cover_image_url": url}}
    )
    
    return {"url": url}

@router.post("/profile")
async def upload_profile_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a creator profile image"""
    url = await save_upload(file, 'avatars')
    
    # Update creator profile image
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"profile_image_url": url}}
    )
    
    return {"url": url}

@router.post("/content")
async def upload_content_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload content media (image/video)"""
    # Verify user is a creator
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator to upload content")
    
    url = await save_upload(file, 'content')
    return {"url": url}

@router.post("/message")
async def upload_message_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload message media"""
    url = await save_upload(file, 'messages')
    return {"url": url}

@router.get("/{category}/{filename}")
async def get_upload(category: str, filename: str):
    """Get an uploaded file"""
    if category not in ['avatars', 'covers', 'content', 'messages']:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    file_path = UPLOAD_DIR / category / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
