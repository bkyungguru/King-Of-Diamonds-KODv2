import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(Path(__file__).parent.parent / "uploads")))
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

def ensure_upload_dir():
    """Ensure upload directories exist"""
    for subdir in ['avatars', 'covers', 'content', 'messages']:
        (UPLOAD_DIR / subdir).mkdir(parents=True, exist_ok=True)

ensure_upload_dir()

async def save_upload(file: UploadFile, category: str = 'content') -> str:
    """Save an uploaded file and return the URL path"""
    if file.content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{uuid.uuid4()}.{ext}"
    
    # Save file
    save_path = UPLOAD_DIR / category / filename
    with open(save_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"/api/uploads/{category}/{filename}"

def get_upload_path(category: str, filename: str) -> Path:
    """Get the full path for an upload"""
    return UPLOAD_DIR / category / filename

def delete_upload(url: str) -> bool:
    """Delete an uploaded file"""
    if url.startswith('/api/uploads/'):
        parts = url.replace('/api/uploads/', '').split('/')
        if len(parts) == 2:
            path = UPLOAD_DIR / parts[0] / parts[1]
            if path.exists():
                path.unlink()
                return True
    return False
