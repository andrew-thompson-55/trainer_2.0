# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chimera is an AI-powered endurance training coach that integrates with Strava for workout data, uses Google Gemini for AI analysis, and schedules workouts to Google Calendar.

**Monorepo Structure:**
- `chimera_api/` - FastAPI backend (Python 3.12+)
- `chimera_mobile_app/` - React Native mobile app (Expo, TypeScript)

**Tech Stack:**
- **Backend:** FastAPI on Render, Supabase (PostgreSQL), Google Gemini 2.5
- **Frontend:** Expo SDK ~54, React 19, TypeScript
- **Auth:** Google OAuth → JWT (30-day expiry)
- **Integrations:** Strava webhooks, Google Calendar API

## Development Commands

### Mobile App (chimera_mobile_app/)

Start development server with tunnel:
```bash
cd chimera_mobile_app
npx expo start --tunnel -c
```

Build APK for testing:
```bash
# 1. Bump version in app.json (e.g., 1.0.1 -> 1.0.2)
# 2. Run preview build
npx eas build -p android --profile preview
```

Development build (native):
```bash
eas build --profile development --platform android
npx expo start --dev-client --tunnel
```

Linting:
```bash
npm run lint
```

### Backend API (chimera_api/)

Run locally:
```bash
cd chimera_api
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Render deployment (automatic on push to main):
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Architecture

### Backend (chimera_api/)

```
main.py              # FastAPI app, health check, chat, workouts, daily logs
routers/
  ├─ auth.py         # Google OAuth flow, JWT generation
  └─ strava.py       # Strava webhook handling
services/
  ├─ workout_service.py    # CRUD for workouts table
  ├─ daily_log_service.py  # CRUD for daily_logs table
  ├─ gcal_service.py       # Google Calendar integration
  └─ strava_service.py     # Strava API calls
dependencies.py      # get_current_user (JWT verification)
schemas.py           # Pydantic models for request/response
db_client.py         # Supabase admin client
ai_tools.py          # Gemini function calling tools
```

**Key Patterns:**
- All endpoints use `Depends(get_current_user)` for auth (except `/` and `/health`)
- Services receive `user_id` as parameter, never use hardcoded IDs
- Router → Service → Database (separation of concerns)

### Frontend (chimera_mobile_app/)

```
app/
  ├─ (auth)/         # Auth screens (Google sign-in)
  ├─ (tabs)/         # Main tab navigation
  ├─ index.tsx       # Landing/home
  ├─ add_workout.tsx
  ├─ edit_workout.tsx
  └─ workout_details.tsx
services/
  ├─ config.ts       # API_BASE URL (centralized)
  ├─ authFetch.ts    # Authenticated fetch wrapper
  ├─ api.ts          # API client functions
  └─ offline_queue.ts
components/          # Reusable UI components
context/             # React context providers
```

**Key Patterns:**
- Uses Expo Router (file-based routing)
- All API calls via `authFetch()` which auto-injects JWT
- API base URL imported from `services/config.ts`
- Offline queue for network resilience

## Critical Rules

### 1. No Hardcoded User IDs
❌ Never use:
```python
HARDCODED_USER_ID = "dc43c3a8-..."
user_id = "some-uuid"
```

✅ Always use:
```python
from dependencies import get_current_user

@app.get("/v1/workouts")
async def get_workouts(user_id: str = Depends(get_current_user)):
    return await workout_service.get_workouts(user_id)
```

### 2. No Silent Error Handling
❌ Never use:
```python
try:
    risky_operation()
except:
    pass
```

✅ Always log errors:
```python
try:
    risky_operation()
except Exception as e:
    print(f"⚠️ Operation failed: {e}")
```

### 3. All User Data Endpoints Require Auth
Every route that touches user data must have `user_id: str = Depends(get_current_user)`.

**Exceptions:** Only `/` (health check) may be unauthenticated.

### 4. No Hardcoded API URLs in Frontend
❌ Never use:
```typescript
fetch('https://trainer-2-0.onrender.com/v1/workouts')
```

✅ Always use:
```typescript
import { authFetch } from '../services/authFetch';
const response = await authFetch('/workouts');
```

### 5. Pydantic Validation Required
❌ Never accept raw dicts:
```python
@router.put("/users/profile")
def update_profile(data: dict):
    supabase.table("users").update(data).execute()
```

✅ Use explicit schemas:
```python
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None

@router.put("/users/profile")
def update_profile(data: ProfileUpdate):
    supabase.table("users").update(data.model_dump(exclude_unset=True)).execute()
```

## Key Integrations

### Strava Webhooks
- Endpoint: `/v1/strava/webhook` (in `routers/strava.py`)
- Listens for `activity.create` and `activity.update` events
- Auto-analyzes activities using Gemini

### Google Calendar
- Uses Service Account for API access
- Reads/writes to user's "Training" calendar
- Service account credentials in `GOOGLE_CREDENTIALS_JSON` env var (base64 encoded)

### Google Gemini
- Model: `gemini-2.5-flash`
- Function calling for tool execution (workout creation, etc.)
- Eastern Time (UTC-5) awareness built into system prompt

## Environment Variables

### Backend (chimera_api/)
```
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REFRESH_TOKEN
STRAVA_VERIFY_TOKEN
GOOGLE_CREDENTIALS_JSON  # Base64 encoded service account JSON
GEMINI_API_KEY
GOOGLE_CALENDAR_ID
SUPABASE_URL
SUPABASE_SERVICE_KEY
JWT_SECRET
```

### Mobile App (chimera_mobile_app/)
```
GOOGLE_SERVICES_BASE64  # Firebase/Google services config (EAS secret)
```

## Firebase/Google Services Setup

If Firebase key is rotated:
```bash
# Encode google-services.json to base64
python -c "import base64; print(base64.b64encode(open('chimera_mobile_app/google-services.json', 'rb').read()).decode())" > google-services-base64.txt

# Set EAS secret
eas secret:create --name GOOGLE_SERVICES_BASE64 --value "PASTE_BASE64_HERE"
```

For Google Calendar credentials:
```bash
python -c "import base64; open('encoded_creds.txt', 'w').write(base64.b64encode(open('service_account.json', 'rb').read()).decode())"
```

## Database Schema (Supabase)

Key tables:
- `users` - User profiles from Google OAuth
- `workouts` - Planned training sessions
- `daily_logs` - Daily tracking (sleep, HRV, soreness, etc.)
- `chat_logs` - AI conversation history
- `strava_activities` - Synced from Strava API

All user-scoped tables have `user_id` column (UUID, foreign key to users.id).

## Common Patterns

### Adding a New API Endpoint
1. Define Pydantic schema in `schemas.py`
2. Create/update service in `services/`
3. Add route in appropriate router or `main.py`
4. Always include `user_id: str = Depends(get_current_user)`

### Adding a Mobile Screen
1. Create file in `app/` directory (file-based routing)
2. Import `authFetch` from `services/authFetch.ts`
3. Use centralized API calls from `services/api.ts` when possible

### Timezone Handling
- User timezone is Eastern Time (UTC-5)
- Backend AI system prompt includes current local time
- Always append `-05:00` to times passed to AI for workout scheduling
