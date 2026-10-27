# SkillBattle — Competitive Skill Assessment Platform

SkillBattle is a full-stack web application for timed practice, real-time 1v1 skill battles, XP/rating progression, battle history and centralized administration.

## Stack

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO real-time matchmaking
- Gemini AI question generation
- Custom responsive CSS animations

## Main Features

### Player
- Registration and secure login
- Dashboard with XP, level, rating, wins and losses
- Skill library
- Timed practice mode with answer explanations
- Real-time 1v1 matchmaking
- Server-authoritative scoring
- XP and rating updates
- Battle result screen
- Battle history

### Administration
- Secure admin-only command center
- User search and filtering
- Full user profile inspection
- Edit name, email, XP, level, rating and record
- Promote/remove administrator access
- Ban/unban accounts with ban reasons
- Password reset
- Permanent account deletion with associated battle-history cleanup
- Online/offline presence
- Question creation, editing and deletion
- Skill/category creation, editing, activation and deletion
- Battle record inspection
- Platform statistics
- Gemini AI question generation directly into the question bank

## Run Locally

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env` from `.env.example` and set:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/skillbattle
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=your_admin_email
GEMINI_API_KEY=your_gemini_key
```

Then:

```bash
npm run dev
```

### 2. Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend: normally `http://localhost:5173`

Backend health check: `http://localhost:5000/api/health`

## Important

Never commit or submit the real `server/.env` file or API keys. The shareable project should contain `.env.example` instead.
