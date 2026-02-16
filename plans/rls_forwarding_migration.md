# RLS Forwarding Migration Plan

**Date:** 2026-02-15
**Status:** DRAFT - Ready for Review
**Goal:** Migrate from "God Mode" (Service Role Key) to "RLS Forwarding" (User Token)

---

## Executive Summary

### Current State: "God Mode" ⚠️
- All user requests use the global `supabase_admin` client initialized with `SUPABASE_SERVICE_KEY`
- This bypasses all Row Level Security (RLS) policies in the database
- Security depends on manually adding `.eq("user_id", user_id)` to every query
- **Risk:** If a developer forgets a filter, it's an immediate data leak
- **No Defense in Depth:** Application-layer security only

### Target State: "RLS Forwarding" ✅
- User requests use a lightweight Supabase client initialized with the user's JWT token
- Database RLS policies automatically enforce access control at the database layer
- Even if a developer forgets to add filters, the database prevents unauthorized access
- **Defense in Depth:** Application + Database layer security
- Admin operations (webhooks, background jobs) still use Service Role Key where needed

---

## Phase 1: Database Preparation

### 1.1 Set Up RLS Policies in Supabase

**Tables requiring RLS policies:**
- `users` - User profiles
- `user_settings` - User preferences and integration tokens
- `planned_workouts` - Workout schedules
- `daily_logs` - Daily tracking data
- `chat_logs` - AI conversation history
- `completed_activities` - Synced Strava activities (if user-scoped)

**Example RLS Policy (for `planned_workouts`):**
```sql
-- Enable RLS
ALTER TABLE planned_workouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own workouts
CREATE POLICY "Users can view own workouts"
ON planned_workouts
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
ON planned_workouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workouts
CREATE POLICY "Users can update own workouts"
ON planned_workouts
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
ON planned_workouts
FOR DELETE
USING (auth.uid() = user_id);
```

**Repeat for all user-scoped tables.**

### 1.2 Enable Supabase Auth (if not already)

Since we're using custom JWT (not Supabase Auth JWT), we have two options:

**Option A: Continue with Custom JWT + Manual RLS (Hybrid)**
- Keep our custom JWT system
- Manually set the Supabase session context using the Service Role Key
- Use `supabase.rpc('set_user_id', {'user_id': user_id})` before queries
- **Complexity:** Medium
- **Migration:** Easier (no auth system changes)

**Option B: Switch to Supabase Auth JWT (Recommended)**
- During Google OAuth, create/link a Supabase Auth user
- Use Supabase's built-in `auth.uid()` in RLS policies
- Forward the Supabase JWT token to the frontend
- **Complexity:** Higher upfront
- **Long-term Benefit:** Native RLS support, better Supabase integration

**Recommendation:** Start with **Option A** for faster migration, then consider Option B in a future iteration.

---

## Phase 2: Backend Code Changes

### 2.1 Add Environment Variable for ANON_KEY

Update `.env` and deployment configs:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Keep for admin operations
SUPABASE_ANON_KEY=eyJhbGc...     # NEW: For user-scoped operations
```

### 2.2 Create New Dependency: `get_db_user_client`

**File:** `chimera_api/dependencies.py`

```python
import os
from typing import Optional
from supabase import create_client, Client
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Existing function (keep as-is)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Extracts and validates user_id from JWT."""
    # ... (existing code)
    return user_id


# NEW: RLS-aware Supabase client
async def get_db_user_client(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Client:
    """
    Creates a Supabase client authenticated with the user's JWT token.
    This enables Row Level Security (RLS) policies.

    IMPORTANT: This client should be used for all user-scoped operations.
    Use `supabase_admin` only for admin tasks (webhooks, background jobs).
    """
    try:
        user_token = credentials.credentials

        # Validate the JWT first (reuse existing logic)
        user_id = await get_current_user(credentials)

        # Create a user-scoped Supabase client
        # This client uses the ANON_KEY + the user's JWT
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        # Set the user's JWT as the auth token
        # Supabase will use this to evaluate RLS policies
        user_client.auth.set_session(user_token)

        return user_client

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")
```

**Note:** The exact implementation of `set_session()` may vary depending on the Supabase Python client version. If using Option A (custom JWT), we may need to use `supabase.rpc('set_user_id', {'user_id': user_id})` instead.

### 2.3 Update Service Functions

Refactor all service functions to accept a `db_client: Client` parameter instead of using the global `supabase_admin`.

**Example: `services/workout_service.py`**

**BEFORE:**
```python
from db_client import supabase_admin

async def create_workout(workout: WorkoutCreate, user_id: str) -> dict:
    data = workout.model_dump()
    data["user_id"] = user_id
    response = supabase_admin.table("planned_workouts").insert(data).execute()
    return response.data[0]
```

**AFTER:**
```python
from supabase import Client

async def create_workout(
    workout: WorkoutCreate,
    user_id: str,
    db_client: Client  # NEW: Accept client as parameter
) -> dict:
    data = workout.model_dump()
    data["user_id"] = user_id

    # Use the passed client instead of global supabase_admin
    response = db_client.table("planned_workouts").insert(data).execute()
    return response.data[0]
```

**Repeat for ALL service functions.**

### 2.4 Update Router Endpoints

Change all endpoint handlers to use the new dependency.

**Example: `main.py` workout endpoints**

**BEFORE:**
```python
@app.post("/v1/workouts", response_model=WorkoutResponse)
async def create_workout(
    workout: WorkoutCreate,
    user_id: str = Depends(get_current_user)
):
    return await workout_service.create_workout(workout, user_id)
```

**AFTER:**
```python
from dependencies import get_current_user, get_db_user_client

@app.post("/v1/workouts", response_model=WorkoutResponse)
async def create_workout(
    workout: WorkoutCreate,
    user_id: str = Depends(get_current_user),
    db_client: Client = Depends(get_db_user_client)  # NEW: Inject user client
):
    return await workout_service.create_workout(workout, user_id, db_client)
```

---

## Phase 3: Admin Operations Mapping

### 3.1 Operations That MUST Keep Using `supabase_admin`

These operations don't have a user JWT token and need elevated privileges:

| File | Function/Endpoint | Reason |
|------|-------------------|--------|
| `routers/auth.py` | `/auth/google` (POST) | User doesn't exist yet during OAuth |
| `routers/strava.py` | `/webhooks/strava` (GET/POST) | Webhook callbacks have no user JWT |
| `services/strava_service.py` | `handle_webhook_event()` | Background processing of webhook data |
| `main.py` | `/v1/chat` (chat_logs insert) | Could be migrated, but low risk |

**Action:** Keep these using `supabase_admin` as-is.

### 3.2 Operations That SHOULD Migrate to RLS

| File | Endpoints/Functions | Priority |
|------|---------------------|----------|
| `main.py` | All `/v1/workouts/*` endpoints | HIGH |
| `main.py` | All `/v1/daily-logs/*` endpoints | HIGH |
| `services/workout_service.py` | All functions | HIGH |
| `services/daily_log_service.py` | All functions | HIGH |
| `routers/auth.py` | `/auth/verify`, `/users/me`, `/users/profile` | MEDIUM |

---

## Phase 4: File-by-File Migration Checklist

### ✅ Files to Update

#### 1. `chimera_api/dependencies.py`
- [ ] Add `get_db_user_client()` function
- [ ] Import `create_client` from supabase
- [ ] Add `SUPABASE_ANON_KEY` environment variable

#### 2. `chimera_api/services/workout_service.py`
- [ ] Add `db_client: Client` parameter to all functions
- [ ] Replace `supabase_admin` with `db_client` in all queries
- [ ] Update function signatures:
  - [ ] `create_workout()`
  - [ ] `get_workouts()`
  - [ ] `get_workout()`
  - [ ] `update_workout()`
  - [ ] `delete_workout()`
  - [ ] `get_linked_activity()`

#### 3. `chimera_api/services/daily_log_service.py`
- [ ] Add `db_client: Client` parameter to all functions
- [ ] Replace `supabase_admin` with `db_client`
- [ ] Update function signatures:
  - [ ] `upsert_log()`
  - [ ] `get_log()`

#### 4. `chimera_api/main.py`
- [ ] Import `get_db_user_client` from dependencies
- [ ] Update all workout endpoints (6 endpoints)
- [ ] Update all daily log endpoints (2 endpoints)
- [ ] Add `db_client: Client = Depends(get_db_user_client)` to each
- [ ] Pass `db_client` to service function calls

#### 5. `chimera_api/routers/auth.py`
- [ ] **DECISION NEEDED:** Keep `/auth/google` using `supabase_admin` (no user JWT yet)
- [ ] Update `/auth/verify` to use RLS (optional)
- [ ] Update `/users/me` (DELETE) to use RLS
- [ ] Update `/users/profile` (PUT) to use RLS

#### 6. `chimera_api/routers/strava.py`
- [ ] **KEEP** `/webhooks/strava` using `supabase_admin` (webhook callback)
- [ ] **KEEP** `/integrations/strava/redirect` using `supabase_admin` (no auth context)
- [ ] Update `/integrations/strava/exchange` to use RLS

#### 7. `chimera_api/services/strava_service.py`
- [ ] Review functions - likely keep using `supabase_admin` (webhook processing)
- [ ] Document which functions are admin-only

#### 8. `chimera_api/services/gcal_service.py`
- [ ] Review functions - likely keep using `supabase_admin` (service account operations)

---

## Phase 5: Testing Strategy

### 5.1 Pre-Migration Testing
1. **Test Current System:**
   - Verify all user-scoped operations work with current `supabase_admin` setup
   - Document expected behavior

### 5.2 Migration Testing
1. **Enable RLS Policies in Supabase Dashboard:**
   - Start with ONE table (e.g., `planned_workouts`)
   - Verify policies are correct using SQL Editor test queries

2. **Unit Test RLS Dependency:**
   - Create a test endpoint that uses `get_db_user_client`
   - Verify it correctly authenticates and returns user-scoped data
   - Test with invalid token → should fail

3. **Integration Testing:**
   - Migrate one endpoint at a time
   - Test CRUD operations:
     - Create workout → verify it appears for that user only
     - Read workouts → verify only user's workouts are returned
     - Update workout → verify user can only update their own
     - Delete workout → verify user can only delete their own
   - Test with multiple user accounts to ensure isolation

4. **Negative Testing:**
   - Attempt to query another user's data
   - Attempt to forge user_id in request body
   - Verify RLS policies block unauthorized access

### 5.3 Rollback Plan
- Keep `supabase_admin` client available as fallback
- If issues arise, temporarily revert endpoints to use `supabase_admin`
- Fix RLS policies and re-migrate

---

## Phase 6: Deployment Strategy

### 6.1 Staging Environment (Recommended)
1. Deploy to staging environment first
2. Run full test suite
3. Monitor logs for RLS-related errors
4. Fix any policy issues before production

### 6.2 Production Deployment
1. **Add SUPABASE_ANON_KEY to Render Environment Variables**
2. **Enable RLS policies in Production Supabase**
3. **Deploy code changes** (backend only - no frontend changes needed)
4. **Monitor logs** for any RLS permission errors
5. **Test key user flows:**
   - Login
   - Create workout
   - View workouts
   - Sync Strava activity

### 6.3 Gradual Rollout (Optional)
- Use feature flags to enable RLS forwarding for a subset of users
- Monitor for issues before full rollout

---

## Phase 7: Post-Migration Validation

### 7.1 Security Audit
- [ ] Verify all user-scoped endpoints use `get_db_user_client`
- [ ] Confirm admin endpoints still use `supabase_admin` (documented)
- [ ] Test with security scanner (e.g., OWASP ZAP)

### 7.2 Performance Monitoring
- [ ] Compare query performance (RLS may add slight overhead)
- [ ] Monitor connection pool usage (one client per request)

### 7.3 Documentation Updates
- [ ] Update CLAUDE.md with new architecture
- [ ] Document when to use `supabase_admin` vs `get_db_user_client`
- [ ] Add RLS policy examples to developer guide

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **RLS policies incorrect** | Data leak or users locked out | Test policies thoroughly in staging |
| **Performance degradation** | Slower queries | Benchmark before/after, optimize policies |
| **Breaking admin operations** | Webhooks fail | Clearly identify admin-only operations |
| **Token forwarding issues** | Auth failures | Test JWT validation in `get_db_user_client` |
| **Incomplete migration** | Mixed security models | Use checklist to track all changes |

---

## Estimated Effort

| Phase | Estimated Time |
|-------|----------------|
| Database RLS setup | 2-4 hours |
| Backend code changes | 4-6 hours |
| Testing (staging) | 2-3 hours |
| Deployment & monitoring | 1-2 hours |
| **Total** | **9-15 hours** |

---

## Success Criteria

- ✅ All user-scoped operations use RLS-aware client
- ✅ Admin operations (webhooks) still use Service Role Key
- ✅ No data leaks between users
- ✅ All tests pass
- ✅ No performance regressions
- ✅ Zero downtime deployment

---

## Open Questions

1. **Supabase Auth vs Custom JWT:**
   - Should we migrate to Supabase Auth JWT for native RLS support?
   - Or continue with custom JWT + manual session setting?

2. **Chat Logs:**
   - Should chat_logs insertion in `/v1/chat` use RLS or stay with `supabase_admin`?
   - Currently it's a simple insert with validated `user_id`

3. **Strava Webhook Processing:**
   - How do we link webhook events to users without a JWT?
   - Current approach: Look up user by `strava_athlete_id`, then process
   - Should this remain admin-only?

4. **Connection Pooling:**
   - Should we cache/reuse user clients or create fresh ones per request?
   - Supabase Python client behavior with `set_session()`?

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Python Client Docs](https://supabase.com/docs/reference/python/introduction)
- [FastAPI Dependency Injection](https://fastapi.tiangolo.com/tutorial/dependencies/)

---

**Next Steps:**
1. Review this plan with the team
2. Answer open questions
3. Set up staging environment (if not already)
4. Begin Phase 1 (Database preparation)
