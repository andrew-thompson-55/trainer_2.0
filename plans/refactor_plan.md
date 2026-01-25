# OPERATION STABILIZE - Execution Plan

**Status:** 🔴 APPROVAL PENDING  
**Date:** 2025-01-25  
**Tech Debt Score:** 7.2/10 → Target: 4.0/10  

---

## Executive Summary

The codebase is **functional but fragile**. We have a working authentication system (JWT + Google OAuth) that is **completely bypassed** by hardcoded user IDs. Every API endpoint is publicly accessible. This plan executes surgical fixes in two phases without breaking existing functionality.

### Key Insight: The Auth System WORKS

```
✅ Mobile: GoogleSignin → idToken → Backend
✅ Backend: Verify Google Token → Create JWT with user_id in `sub` claim
✅ Mobile: Stores JWT in SecureStore → Some screens attach it (settings.tsx)
❌ Backend: Workout/Daily-Log endpoints ignore JWT, use HARDCODED_USER_ID
❌ Mobile: api.ts doesn't attach JWT to any calls
```

**The fix is NOT a rewrite. It's connecting the existing pieces.**

---

## MISSION 1: LOCKDOWN

**Objective:** Plug security holes that could cause data corruption or unauthorized access.  
**Duration:** 4-6 hours  
**Risk:** LOW (isolated changes, no architectural shifts)

### Target 1.1: Firebase API Key Rotation

| Item | Details |
|------|---------|
| **File** | [`google-services.json:18`](../chimera_mobile_app/google-services.json:18) |
| **Issue** | API Key `AIzaSyAPo0Nvq23yOLPZEPDpVeyStPNrl2D2x8g` exposed in git history |
| **Action (MANUAL)** | 1. Firebase Console → Project Settings → API Keys<br>2. Restrict key by Android package name + SHA-1<br>3. Generate new key<br>4. Update `google-services.json` with new key |
| **Post-Action** | Add `google-services.json` to `.gitignore` |

**⚠️ WARNING:** The current key is in git history forever. Restriction is mandatory even after rotation.

### Target 1.2: Gitignore Hardening

| Item | Details |
|------|---------|
| **File** | [`.gitignore:1`](../.gitignore:1) (root) |
| **Current State** | Only ignores `.venv` |
| **Action** | Add standard patterns |

```gitignore
# Root .gitignore additions:
.env
.env.*
__pycache__/
*.pyc
.DS_Store
*.log
```

| Item | Details |
|------|---------|
| **File** | [`chimera_mobile_app/.gitignore`](../chimera_mobile_app/.gitignore) |
| **Action** | Add Firebase credentials |

```gitignore
# Mobile .gitignore additions:
google-services.json
GoogleService-Info.plist
```

### Target 1.3: Silent Failure Elimination

| Item | Details |
|------|---------|
| **File** | [`main.py:100-101`](../chimera_api/main.py:100) |
| **Issue** | `except: pass` swallows all DB errors during chat logging |
| **Risk** | Data corruption goes undetected |

**Current Code:**
```python
try:
    supabase_admin.table("chat_logs").insert(...).execute()
except:
    pass  # ← Silent death
```

**Fixed Code:**
```python
try:
    supabase_admin.table("chat_logs").insert(...).execute()
except Exception as e:
    print(f"⚠️ Chat log failed: {e}")  # Log but don't crash chat
```

**Rationale:** Chat logging is non-critical - failure shouldn't kill the response. But we MUST know when it fails.

### Target 1.4: Profile Update Injection Defense

| Item | Details |
|------|---------|
| **File** | [`auth.py:84-95`](../chimera_api/routers/auth.py:84) |
| **Issue** | `update_profile(data: dict)` accepts ANY fields |
| **Risk** | Attacker could send `{"is_admin": true}` or overwrite `email` |

**Current Code:**
```python
@router.put("/users/profile")
def update_profile(data: dict, credentials: ...):
    # No validation - passes raw dict to DB
    supabase_admin.table("users").update(data).eq("id", user_id).execute()
```

**Fixed Code:**
```python
from pydantic import BaseModel
from typing import Optional

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    # Whitelist ONLY safe fields

@router.put("/users/profile")
def update_profile(data: ProfileUpdate, credentials: ...):
    # Only whitelisted fields can be updated
    update_dict = data.model_dump(exclude_unset=True)
    supabase_admin.table("users").update(update_dict).eq("id", user_id).execute()
```

---

## MISSION 2: DECOUPLE

**Objective:** Remove hardcoded user ID dependency and enforce authentication.  
**Duration:** 8-12 hours  
**Risk:** MEDIUM (touches multiple files, must maintain backwards compatibility)

### Architecture Change Overview

```
BEFORE:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │ ──► │   FastAPI   │ ──► │  Supabase   │
│  (no auth)  │     │ (HARDCODED) │     │  (user X)   │
└─────────────┘     └─────────────┘     └─────────────┘

AFTER:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │ ──► │   FastAPI   │ ──► │  Supabase   │
│ (JWT token) │     │ (get_user)  │     │ (user JWT)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       └── Bearer token ──►├── Depends(get_current_user)
                          └── user_id from JWT.sub
```

### Target 2.1: Create Authentication Dependency

| Item | Details |
|------|---------|
| **File** | NEW: [`chimera_api/dependencies.py`](../chimera_api/dependencies.py) |
| **Purpose** | Centralized auth extraction |

```python
# chimera_api/dependencies.py
import os
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extracts and validates user_id from JWT.
    Returns the user_id (UUID string) or raises 401.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Target 2.2: Refactor Service Layer

**Pattern:** Services receive `user_id` as a parameter, never import it.

#### [`workout_service.py`](../chimera_api/services/workout_service.py)

**REMOVE:**
```python
from services import hard_coded_values
HARDCODED_USER_ID = hard_coded_values.HARDCODED_USER_ID
```

**MODIFY all function signatures:**
```python
# Before
async def create_workout(workout: WorkoutCreate) -> dict:
    data["user_id"] = HARDCODED_USER_ID

# After
async def create_workout(workout: WorkoutCreate, user_id: str) -> dict:
    data["user_id"] = user_id
```

**Full signature changes:**
| Function | Old Signature | New Signature |
|----------|---------------|---------------|
| `create_workout` | `(workout: WorkoutCreate)` | `(workout: WorkoutCreate, user_id: str)` |
| `get_workouts` | `(start_date, end_date)` | `(user_id: str, start_date, end_date)` |
| `get_workout` | `(workout_id: UUID)` | `(workout_id: UUID, user_id: str)` |
| `update_workout` | `(workout_id: UUID, updates)` | `(workout_id: UUID, updates, user_id: str)` |
| `delete_workout` | `(workout_id: UUID)` | `(workout_id: UUID, user_id: str)` |

#### [`daily_log_service.py`](../chimera_api/services/daily_log_service.py)

**REMOVE:**
```python
from services.workout_service import HARDCODED_USER_ID
```

**MODIFY:**
```python
async def upsert_log(log_date: str, data: DailyLogCreate, user_id: str) -> dict:
    payload["user_id"] = user_id

async def get_log(log_date: str, user_id: str) -> dict:
    .eq("user_id", user_id)
```

### Target 2.3: Add Auth to Endpoints

#### [`main.py`](../chimera_api/main.py) - Workout Endpoints

**ADD import:**
```python
from dependencies import get_current_user
```

**MODIFY each endpoint:**
```python
# Before
@app.post("/v1/workouts", response_model=WorkoutResponse, tags=["Workouts"])
async def create_workout(workout: WorkoutCreate):
    return await workout_service.create_workout(workout)

# After
@app.post("/v1/workouts", response_model=WorkoutResponse, tags=["Workouts"])
async def create_workout(
    workout: WorkoutCreate, 
    user_id: str = Depends(get_current_user)
):
    return await workout_service.create_workout(workout, user_id)
```

**All endpoint changes:**
| Endpoint | Add Parameter |
|----------|---------------|
| `POST /v1/workouts` | `user_id: str = Depends(get_current_user)` |
| `GET /v1/workouts` | `user_id: str = Depends(get_current_user)` |
| `GET /v1/workouts/{id}` | `user_id: str = Depends(get_current_user)` |
| `PATCH /v1/workouts/{id}` | `user_id: str = Depends(get_current_user)` |
| `DELETE /v1/workouts/{id}` | `user_id: str = Depends(get_current_user)` |
| `GET /v1/workouts/{id}/activity` | `user_id: str = Depends(get_current_user)` |
| `PUT /v1/daily-logs/{date}` | `user_id: str = Depends(get_current_user)` |
| `GET /v1/daily-logs/{date}` | `user_id: str = Depends(get_current_user)` |

### Target 2.4: Delete Hardcoded Values File

| Item | Details |
|------|---------|
| **File** | [`hard_coded_values.py`](../chimera_api/services/hard_coded_values.py) |
| **Action** | DELETE entire file |
| **Verification** | Search codebase for any remaining imports |

```bash
# Run after deletion to verify no orphan imports
grep -r "hard_coded_values" chimera_api/
```

### Target 2.5: Frontend - Authenticated API Client

**PROBLEM:** [`api.ts`](../chimera_mobile_app/services/api.ts) makes ~15 fetch calls with no auth headers.

**SOLUTION:** Create authenticated fetch wrapper that auto-attaches JWT.

#### New File: [`chimera_mobile_app/services/config.ts`](../chimera_mobile_app/services/config.ts)

```typescript
// config.ts - Single source of truth for API configuration
import Constants from 'expo-constants';

export const API_BASE = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE || 
  'https://trainer-2-0.onrender.com/v1';
```

#### New File: [`chimera_mobile_app/services/authFetch.ts`](../chimera_mobile_app/services/authFetch.ts)

```typescript
// authFetch.ts - Authenticated fetch wrapper
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await SecureStore.getItemAsync('chimera_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}
```

#### Modify: [`api.ts`](../chimera_mobile_app/services/api.ts)

**REMOVE:**
```typescript
const API_BASE = 'https://trainer-2-0.onrender.com/v1';
```

**ADD:**
```typescript
import { authFetch } from './authFetch';
import { API_BASE } from './config';
```

**REPLACE fetch calls:**
```typescript
// Before
const response = await fetch(`${API_BASE}/workouts`);

// After
const response = await authFetch('/workouts');
```

#### Modify: [`chat.tsx`](../chimera_mobile_app/app/(tabs)/chat.tsx)

**REMOVE:**
```typescript
const BACKEND_URL = 'https://trainer-2-0.onrender.com/v1/chat';
```

**ADD:**
```typescript
import { authFetch } from '../../services/authFetch';
```

**REPLACE:**
```typescript
// Before
fetch(BACKEND_URL, { method: 'POST', ... })

// After
authFetch('/chat', { method: 'POST', body: JSON.stringify({ message: userMessage }) })
```

#### Modify: [`AuthContext.tsx`](../chimera_mobile_app/context/AuthContext.tsx)

**REMOVE:**
```typescript
const API_BASE = 'https://trainer-2-0.onrender.com/v1';
```

**ADD:**
```typescript
import { API_BASE } from '../services/config';
```

**Note:** AuthContext can't use `authFetch` for login (chicken-and-egg). Keep direct fetch but use centralized `API_BASE`.

---

## Execution Order

```
MISSION 1: LOCKDOWN (Do First - No Dependencies)
├── 1.1 Firebase Key Rotation (MANUAL - Owner Action)
├── 1.2 Gitignore Hardening
├── 1.3 Silent Failure Fix (main.py)
└── 1.4 Profile Update Schema (auth.py, schemas.py)

MISSION 2: DECOUPLE (Requires Mission 1 Complete)
├── 2.1 Create dependencies.py
├── 2.2 Refactor workout_service.py (add user_id params)
├── 2.3 Refactor daily_log_service.py (add user_id params)
├── 2.4 Add Depends(get_current_user) to main.py endpoints
├── 2.5 Delete hard_coded_values.py
├── 2.6 Create frontend config.ts + authFetch.ts
├── 2.7 Refactor api.ts to use authFetch
├── 2.8 Refactor chat.tsx to use authFetch
└── 2.9 Update AuthContext.tsx to use config.ts
```

---

## Testing Checklist

### Mission 1 Verification
- [ ] New Firebase key works in dev build
- [ ] Git status shows `google-services.json` as untracked
- [ ] Chat endpoint logs errors to console (not silent)
- [ ] Profile update rejects unknown fields (test with `{"is_admin": true}`)

### Mission 2 Verification
- [ ] `GET /v1/workouts` returns 401 without Bearer token
- [ ] `GET /v1/workouts` returns 200 with valid Bearer token
- [ ] User A cannot see User B's workouts (create second test user)
- [ ] Mobile app still logs in successfully
- [ ] Mobile app fetches workouts after login
- [ ] Offline mode still works (cache + queue)
- [ ] Strava connection still works (already uses auth)

---

## Rollback Plan

If Mission 2 breaks production:

1. **Revert service files** - Restore `HARDCODED_USER_ID` imports
2. **Remove Depends()** - Endpoints work without auth again
3. **Keep frontend changes** - `authFetch` doesn't break anything if backend doesn't require auth

The architectural change is reversible because we're adding auth, not changing business logic.

---

## Out of Scope (Medium Priority - Future Sprints)

These items were identified but intentionally deferred:

| Item | Reason for Deferral |
|------|---------------------|
| Timezone from user settings | Requires DB schema change + migration |
| Pin Python dependencies | Low risk, can be done in maintenance window |
| AI tool timeout handling | Edge case, not blocking |
| Emoji in logs → structured logging | Cosmetic, not blocking |
| `WorkoutUpdate` Pydantic schema | Nice-to-have, current dict works |

---

## Approval Gate

**Before executing, confirm:**

1. ✅ Firebase key rotation is scheduled/completed
2. ✅ Test environment available for verification
3. ✅ Rollback procedure understood

**Awaiting your GO/NO-GO, Commander.**
