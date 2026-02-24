# King of Diamonds

Premium creator content platform built with React, FastAPI, and MongoDB.

## Tech Stack

**Frontend:**
- React 18 with React Router v6
- Tailwind CSS with custom design system (black/gold theme)
- shadcn/ui component library (Radix UI primitives)
- Axios for API communication
- Lucide React icons

**Backend:**
- FastAPI (Python) with async support
- MongoDB via Motor (async driver)
- JWT authentication (python-jose + passlib/bcrypt)
- File upload handling with Pillow for image processing

## Project Structure

```
├── backend/
│   ├── server.py            # FastAPI app entry point
│   ├── models/              # MongoDB document schemas
│   ├── routes/              # API route handlers
│   ├── utils/               # Auth helpers, upload utilities
│   ├── uploads/             # User-uploaded media storage
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       │   └── ui/          # shadcn/ui primitives
│       ├── contexts/        # React context (auth state)
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utility functions
│       └── pages/           # Route-level page components
└── .env.example             # Environment variable template
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB 6+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env    # Edit with your values
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
cp .env.example .env       # Edit with your backend URL
npm install
npm start                  # Development server on :3000
```

### Production Build

```bash
cd frontend
npm run build              # Outputs to build/
```

## API Overview

All endpoints are prefixed with `/api`.

| Route Group     | Prefix            | Description                        |
|-----------------|-------------------|------------------------------------|
| Auth            | `/auth`           | Register, login, JWT tokens        |
| Users           | `/users`          | Profile management                 |
| Creators        | `/creators`       | Creator profiles, become a creator |
| Content         | `/content`        | Posts, feed, reactions              |
| Subscriptions   | `/subscriptions`  | Subscribe/unsubscribe to creators  |
| Messages        | `/messages`       | Direct messaging between users     |
| Tips            | `/tips`           | Send tips to creators              |
| Stories         | `/stories`        | Ephemeral story content            |
| Live Streams    | `/livestream`     | Live streaming management          |
| PPV             | `/ppv`            | Pay-per-view content               |
| Vault           | `/vault`          | Creator media vault                |
| Uploads         | `/uploads`        | File/image upload handling         |
| Admin           | `/admin`          | Admin panel operations             |

## Features

### Implemented
- User registration and JWT authentication
- Creator profiles with subscription pricing
- Content posting with media uploads
- Subscription system (subscribe/unsubscribe)
- Direct messaging between users
- Tipping system
- Stories (ephemeral content with expiration)
- Live stream management
- Pay-per-view content
- Creator media vault
- Content reactions
- Admin panel (user management, content moderation)
- Image cropping and processing
- Role-based access control (user/creator/admin/superadmin)
- Responsive dark theme UI

### Roadmap
- Stripe payment integration
- Email verification
- WebRTC live streaming
- Push notifications
- Creator analytics dashboard
- Search and discovery
- Mobile app

## Environment Variables

See `.env.example` for all configuration options.

## License

Proprietary. All rights reserved.
