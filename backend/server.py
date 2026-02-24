from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="King of Diamonds API", version="2.0.0")

# Import and configure routes
from routes import (
    auth_router, users_router, creators_router, content_router,
    subscriptions_router, messages_router, tips_router, admin_router,
    uploads_router
)
from routes.stories import router as stories_router
from routes.livestream import router as livestream_router
from routes.ppv import router as ppv_router
from routes.vault import router as vault_router

# Import route modules for db setup
from routes import auth, users, creators, content, subscriptions, messages, tips, admin, uploads
from routes import stories, livestream, ppv, vault
from utils.uploads import init_gridfs

# Set database for each route module
auth.set_db(db)
users.set_db(db)
creators.set_db(db)
content.set_db(db)
subscriptions.set_db(db)
messages.set_db(db)
tips.set_db(db)
admin.set_db(db)
uploads.set_db(db)
init_gridfs(db)
stories.set_db(db)
livestream.set_db(db)
ppv.set_db(db)
vault.set_db(db)

# Create API router with prefix
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(creators_router)
api_router.include_router(content_router)
api_router.include_router(subscriptions_router)
api_router.include_router(messages_router)
api_router.include_router(tips_router)
api_router.include_router(admin_router)
api_router.include_router(uploads_router)
api_router.include_router(stories_router)
api_router.include_router(livestream_router)
api_router.include_router(ppv_router)
api_router.include_router(vault_router)

# Health check
@api_router.get("/")
async def root():
    return {"message": "King of Diamonds API", "status": "online", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Include API router
app.include_router(api_router)

# CORS middleware
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
cors_origins = [o.strip() for o in cors_origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins != ['*'] else ["https://kod-frontend.onrender.com", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    logger.info("King of Diamonds API v2.0 starting...")
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", sparse=True)
    await db.creators.create_index("user_id", unique=True)
    await db.content.create_index("creator_id")
    await db.content.create_index("created_at")
    await db.subscriptions.create_index([("user_id", 1), ("creator_id", 1)])
    await db.messages.create_index("conversation_id")
    await db.messages.create_index("created_at")
    await db.stories.create_index("creator_id")
    await db.stories.create_index("expires_at")
    await db.livestreams.create_index("creator_id")
    await db.livestreams.create_index("status")
    await db.ppv_messages.create_index("recipient_id")
    await db.vault.create_index("creator_id")
    await db.scheduled_posts.create_index([("creator_id", 1), ("scheduled_for", 1)])
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Database connection closed")
