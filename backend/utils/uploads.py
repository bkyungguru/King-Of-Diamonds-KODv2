import os
import uuid
import base64
from pathlib import Path
from fastapi import UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

ALLOWED_IMAGE_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/heic', 'image/heif', 'image/avif', 'image/svg+xml',
    'image/bmp', 'image/tiff'
}
ALLOWED_VIDEO_TYPES = {
    'video/mp4', 'video/webm', 'video/quicktime',
    'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg',
    'video/3gpp', 'video/x-matroska'
}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Legacy local upload dir (fallback)
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(Path(__file__).parent.parent / "uploads")))

# GridFS bucket - set by server.py
_fs_bucket = None

def init_gridfs(db):
    """Initialize GridFS bucket with the database"""
    global _fs_bucket
    _fs_bucket = AsyncIOMotorGridFSBucket(db)

async def save_upload(file: UploadFile, category: str = 'content') -> str:
    """Save an uploaded file to GridFS and return the URL path"""
    if file.content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{uuid.uuid4()}.{ext}"
    grid_filename = f"{category}/{filename}"
    
    if _fs_bucket:
        # Store in GridFS
        await _fs_bucket.upload_from_stream(
            grid_filename,
            contents,
            metadata={
                "content_type": file.content_type,
                "category": category,
                "original_name": file.filename
            }
        )
    else:
        # Fallback to local storage
        for subdir in ['avatars', 'covers', 'content', 'messages']:
            (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)
        save_path = UPLOAD_DIR / category / filename
        with open(save_path, 'wb') as buffer:
            buffer.write(contents)
    
    return f"/api/uploads/{category}/{filename}"

async def get_file_from_gridfs(category: str, filename: str):
    """Retrieve a file from GridFS"""
    if not _fs_bucket:
        return None, None
    
    grid_filename = f"{category}/{filename}"
    try:
        grid_out = await _fs_bucket.open_download_stream_by_name(grid_filename)
        contents = await grid_out.read()
        content_type = grid_out.metadata.get("content_type", "application/octet-stream") if grid_out.metadata else "application/octet-stream"
        return contents, content_type
    except Exception:
        return None, None

def get_upload_path(category: str, filename: str) -> Path:
    """Get the full path for a local upload"""
    return UPLOAD_DIR / category / filename

def delete_upload(url: str) -> bool:
    """Delete an uploaded file (local only, GridFS cleanup TBD)"""
    if url.startswith('/api/uploads/'):
        parts = url.replace('/api/uploads/', '').split('/')
        if len(parts) == 2:
            path = UPLOAD_DIR / parts[0] / parts[1]
            if path.exists():
                path.unlink()
                return True
    return False
