# King of Diamonds (KOD) v2 — Handoff Guide

## Tech Stack
- **Frontend**: React 19 (Create React App), Tailwind CSS, Radix UI, Recharts
- **Backend**: Python 3 / FastAPI
- **Database**: MongoDB (Atlas recommended)
- **File Storage**: MongoDB GridFS (no local disk storage — critical for cloud hosting)
- **Hosting**: Render (or any platform that supports Python + static sites)

## Project Structure
```
frontend/    → React app (CRA)
backend/     → FastAPI server
  server.py  → Main entry point
  routes/    → API route handlers
  models/    → Data models
  utils/     → Helpers (uploads, auth, etc.)
```

## Setup Instructions

### 1. MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user with read/write access
3. Whitelist `0.0.0.0/0` for cloud hosting (or your server's IP)
4. Get the connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/`

### 2. Backend (Render Web Service or similar)
1. Create a new **Web Service** pointing to this repo
2. **Root directory**: `backend`
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. **Environment variables**:
   - `MONGODB_URI` — your Atlas connection string
   - `DB_NAME` — `king_of_diamonds` (or your preferred name)
   - `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
   - `CORS_ORIGINS` — your frontend URL (e.g. `https://your-frontend.onrender.com`)

### 3. Frontend (Render Static Site or similar)
1. Create a new **Static Site** pointing to this repo
2. **Root directory**: `frontend`
3. **Build command**: `npm install && npm run build`
4. **Publish directory**: `build`
5. **Environment variables**:
   - `REACT_APP_API_URL` — your backend URL (e.g. `https://your-backend.onrender.com`)

### 4. Create Your Admin Account
1. Register a new account through the site
2. Open MongoDB Atlas → Browse Collections → `king_of_diamonds` → `users`
3. Find your user document and change the `role` field from `user` to `superadmin`

## Important Notes

- **File uploads use GridFS**, not local disk. Render (and most cloud platforms) have ephemeral filesystems — files saved to disk are lost on every deploy/restart. GridFS stores them in MongoDB permanently.
- **CORS**: The backend requires an explicit frontend origin (not `*`) because credentials are used. Set `CORS_ORIGINS` to your exact frontend URL.
- **iOS/Safari**: A polyfill for `Object.hasOwn` is included in `index.html` for compatibility with older Safari versions (< 15.4).
- **Free tier limits**: MongoDB Atlas free tier has a 512MB storage cap. If you expect heavy uploads, consider migrating to S3 or Cloudinary.

## User Roles
- `user` — default, basic access
- `creator` — content creator features
- `admin` — admin panel access
- `superadmin` — full system access

Roles are set in the `role` field on user documents in MongoDB.
