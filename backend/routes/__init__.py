# King of Diamonds - Routes
from .auth import router as auth_router
from .users import router as users_router
from .creators import router as creators_router
from .content import router as content_router
from .subscriptions import router as subscriptions_router
from .messages import router as messages_router
from .tips import router as tips_router
from .admin import router as admin_router
from .uploads import router as uploads_router

__all__ = [
    'auth_router', 'users_router', 'creators_router', 'content_router',
    'subscriptions_router', 'messages_router', 'tips_router', 'admin_router',
    'uploads_router'
]
