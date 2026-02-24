from fastapi import APIRouter, HTTPException, Depends
from models.story import Story, StoryCreate, StoryResponse
from utils.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import List

router = APIRouter(prefix="/stories", tags=["Stories"])

db = None

def set_db(database):
    global db
    db = database

@router.post("/", response_model=StoryResponse)
async def create_story(story_data: StoryCreate, current_user: dict = Depends(get_current_user)):
    """Create a new story (expires in 24 hours)"""
    # Get creator profile
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator to post stories")
    
    # Create story with 24-hour expiration
    story = Story(
        creator_id=creator['id'],
        media_url=story_data.media_url,
        media_type=story_data.media_type,
        caption=story_data.caption,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    
    # Save to database
    story_dict = story.model_dump()
    story_dict['created_at'] = story_dict['created_at'].isoformat()
    story_dict['expires_at'] = story_dict['expires_at'].isoformat()
    await db.stories.insert_one(story_dict)
    
    return StoryResponse(
        **story.model_dump(),
        creator_display_name=creator.get('display_name'),
        creator_profile_image=creator.get('profile_image_url')
    )

@router.get("/feed", response_model=List[dict])
async def get_stories_feed(current_user: dict = Depends(get_current_user)):
    """Get stories from subscribed creators"""
    user_id = current_user['user_id']
    
    # Get subscribed creator IDs
    subscriptions = await db.subscriptions.find(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    ).to_list(1000)
    subscribed_creator_ids = [s['creator_id'] for s in subscriptions]
    
    # Get active stories (not expired)
    now = datetime.now(timezone.utc).isoformat()
    stories = await db.stories.find({
        "creator_id": {"$in": subscribed_creator_ids},
        "is_active": True,
        "expires_at": {"$gt": now}
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Group by creator
    creators_stories = {}
    for story in stories:
        creator_id = story['creator_id']
        if creator_id not in creators_stories:
            creator = await db.creators.find_one({"id": creator_id}, {"_id": 0})
            creators_stories[creator_id] = {
                "creator_id": creator_id,
                "creator_display_name": creator.get('display_name') if creator else None,
                "creator_profile_image": creator.get('profile_image_url') if creator else None,
                "stories": [],
                "has_unseen": False
            }
        
        is_viewed = user_id in story.get('viewed_by', [])
        if not is_viewed:
            creators_stories[creator_id]["has_unseen"] = True
        
        if isinstance(story.get('created_at'), str):
            story['created_at'] = datetime.fromisoformat(story['created_at'])
        if isinstance(story.get('expires_at'), str):
            story['expires_at'] = datetime.fromisoformat(story['expires_at'])
            
        creators_stories[creator_id]["stories"].append({
            **story,
            "is_viewed": is_viewed
        })
    
    return list(creators_stories.values())

@router.get("/creator/{creator_id}", response_model=List[StoryResponse])
async def get_creator_stories(creator_id: str, current_user: dict = Depends(get_current_user)):
    """Get active stories from a specific creator"""
    user_id = current_user['user_id']
    
    # Check subscription
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id, "creator_id": creator_id, "is_active": True}, {"_id": 0}
    )
    if not subscription:
        raise HTTPException(status_code=403, detail="Must be subscribed to view stories")
    
    now = datetime.now(timezone.utc).isoformat()
    stories = await db.stories.find({
        "creator_id": creator_id,
        "is_active": True,
        "expires_at": {"$gt": now}
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    creator = await db.creators.find_one({"id": creator_id}, {"_id": 0})
    
    result = []
    for story in stories:
        if isinstance(story.get('created_at'), str):
            story['created_at'] = datetime.fromisoformat(story['created_at'])
        if isinstance(story.get('expires_at'), str):
            story['expires_at'] = datetime.fromisoformat(story['expires_at'])
        
        result.append(StoryResponse(
            **story,
            is_viewed=user_id in story.get('viewed_by', []),
            creator_display_name=creator.get('display_name') if creator else None,
            creator_profile_image=creator.get('profile_image_url') if creator else None
        ))
    
    return result

@router.post("/{story_id}/view")
async def view_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a story as viewed"""
    user_id = current_user['user_id']
    
    story = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Add user to viewed_by if not already there
    if user_id not in story.get('viewed_by', []):
        await db.stories.update_one(
            {"id": story_id},
            {
                "$push": {"viewed_by": user_id},
                "$inc": {"views": 1}
            }
        )
    
    return {"message": "Story viewed"}

@router.delete("/{story_id}")
async def delete_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a story"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    result = await db.stories.update_one(
        {"id": story_id, "creator_id": creator['id']},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return {"message": "Story deleted"}

@router.get("/my", response_model=List[StoryResponse])
async def get_my_stories(current_user: dict = Depends(get_current_user)):
    """Get current creator's active stories"""
    creator = await db.creators.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=403, detail="Must be a creator")
    
    now = datetime.now(timezone.utc).isoformat()
    stories = await db.stories.find({
        "creator_id": creator['id'],
        "is_active": True,
        "expires_at": {"$gt": now}
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for story in stories:
        if isinstance(story.get('created_at'), str):
            story['created_at'] = datetime.fromisoformat(story['created_at'])
        if isinstance(story.get('expires_at'), str):
            story['expires_at'] = datetime.fromisoformat(story['expires_at'])
        
        result.append(StoryResponse(
            **story,
            creator_display_name=creator.get('display_name'),
            creator_profile_image=creator.get('profile_image_url')
        ))
    
    return result
