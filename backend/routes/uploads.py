from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, Response
from utils.auth import get_current_user
from utils.uploads import save_upload, get_upload_path, get_file_from_gridfs, UPLOAD_DIR

router = APIRouter(prefix="/uploads", tags=["Uploads"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a user avatar"""
    url = await save_upload(file, 'avatars')
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {"avatar_url": url}}
    )
    return {"url": url}

@router.post("/cover")
async def upload_cover(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a creator cover image"""
    url = await save_upload(file, 'covers')
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"cover_image_url": url}}
    )
    return {"url": url}

@router.post("/profile")
async def upload_profile_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a creator profile image"""
    url = await save_upload(file, 'avatars')
    await db.creators.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"profile_image_url": url}}
    )
    return {"url": url}

@router.post("/content")
async def upload_content_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload content media (image/video)"""
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
    """Get an uploaded file — tries GridFS first, then local disk"""
    if category not in ['avatars', 'covers', 'content', 'messages']:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Try GridFS first
    contents, content_type = await get_file_from_gridfs(category, filename)
    if contents:
        return Response(
            content=contents,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )
    
    # Fall back to local file
    file_path = UPLOAD_DIR / category / filename
    if file_path.exists():
        return FileResponse(file_path)
    
    raise HTTPException(status_code=404, detail="File not found")
