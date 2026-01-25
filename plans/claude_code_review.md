# TECHNICAL DEBT LEDGER

## chimera_api (Backend)

| Severity | Location | Issue | Recommendation | Architect Note |
| :--- | :--- | :--- | :--- | :--- |
| CRITICAL | [`hard_coded_values.py:1`](chimera_api/services/hard_coded_values.py:1) | Hardcoded user UUID bypasses entire auth system | Remove file; inject `user_id` from JWT in request context | **Architectural rewrite required** |
| CRITICAL | [`main.py:100-101`](chimera_api/main.py:100) | Bare `except: pass` silently swallows all DB errors | Add specific exception handling; log errors | Silent failure = data corruption risk |
| CRITICAL | [`auth.py:84-95`](chimera_api/routers/auth.py:84) | `update_profile` accepts arbitrary dict - no validation | Create `ProfileUpdate` Pydantic schema; whitelist fields | Potential NoSQL injection |
| HIGH | [`main.py:110-135`](chimera_api/main.py:110) | Workout CRUD endpoints have no authentication | Add `Depends(get_current_user)` to all routes | All data currently public |
| HIGH | [`workout_service.py:10-11`](chimera_api/services/workout_service.py:10) | Service hardcodes user ID from import | Pass `user_id` as function parameter | Blocks multi-tenancy |
| HIGH | [`daily_log_service.py:3,8,25`](chimera_api/services/daily_log_service.py:3) | Imports hardcoded user ID | Same fix as workout_service | Blocks multi-tenancy |
| HIGH | [`strava_service.py:149-150`](chimera_api/services/strava_service.py:149) | Hardcoded timezone offset `USER_TIMEZONE_OFFSET = -5` | Fetch from `user_settings.timezone` | Wrong time matching for non-EST users |
| HIGH | [`requirements.txt:1-10`](chimera_api/requirements.txt:1) | No version pinning (`fastapi`, `supabase`, etc.) | Pin all versions: `fastapi==0.109.0` | Supply chain attack vector |
| HIGH | [`main.py:51-52`](chimera_api/main.py:51) | Hardcoded timezone in AI system prompt | Fetch user timezone from DB | All AI scheduling breaks for non-EST |
| MEDIUM | [`main.py:128`](chimera_api/main.py:128) | `update_workout` accepts raw `dict` not Pydantic model | Create `WorkoutUpdate` schema | Type safety gap |
| MEDIUM | [`main.py:43-106`](chimera_api/main.py:43) | `chat_with_gemini` function is ~60 lines | Extract tool handling to separate function | Readability |
| MEDIUM | [`ai_tools.py:109-173`](chimera_api/ai_tools.py:109) | No timeout handling for AI tool execution | Add `asyncio.wait_for()` with timeout | Potential hang on AI failure |
| MEDIUM | [`strava_service.py:73,78`](chimera_api/services/strava_service.py:73) | Emoji in print statements (`🚴`, `✅`) | Use structured logging | Unprofessional in prod logs |
| MEDIUM | [`db_client.py:18-22`](chimera_api/db_client.py:18) | Client init can fail silently, returns `None` | Fail fast or implement health check endpoint | Silent failure |

## chimera_mobile_app (Frontend)

| Severity | Location | Issue | Recommendation | Architect Note |
| :--- | :--- | :--- | :--- | :--- |
| CRITICAL | [`google-services.json:18`](chimera_mobile_app/google-services.json:18) | Firebase API key committed to repo | Add to `.gitignore`; rotate key immediately | **Key exposed in git history** |
| HIGH | [`AuthContext.tsx:12`](chimera_mobile_app/context/AuthContext.tsx:12) | Hardcoded `API_BASE` ignoring `EXPO_PUBLIC_API_BASE` | Use `Constants.expoConfig.extra.EXPO_PUBLIC_API_BASE` | Env var exists but unused |
| HIGH | [`api.ts:6`](chimera_mobile_app/services/api.ts:6) | Hardcoded `API_BASE` (duplicate) | Centralize to single config import | 4 different hardcoded URLs |
| HIGH | [`chat.tsx:6`](chimera_mobile_app/app/(tabs)/chat.tsx:6) | Hardcoded `BACKEND_URL` (duplicate) | Same central config | Maintenance nightmare |
| HIGH | [`settings.tsx:10`](chimera_mobile_app/app/(tabs)/settings.tsx:10) | Hardcoded `API_BASE` (duplicate) | Same central config | 4th instance found |
| HIGH | [`AuthContext.tsx:11`](chimera_mobile_app/context/AuthContext.tsx:11) | Hardcoded `WEB_CLIENT_ID` | Move to `app.json` extra or env | Credential in source |
| HIGH | [`api.ts:26,54,94,etc`](chimera_mobile_app/services/api.ts:26) | API calls don't attach auth token from context | Create authenticated fetch wrapper | Backend auth is bypassed |
| MEDIUM | [`chat.tsx:21,54`](chimera_mobile_app/app/(tabs)/chat.tsx:21) | Using `placeimg.com` for avatar (deprecated service) | Use local asset or remove | External dependency risk |
| MEDIUM | [`.gitignore:1-43`](chimera_mobile_app/.gitignore:1) | `google-services.json` not in gitignore | Add `google-services.json` to ignore list | Key already leaked |
| MEDIUM | [`offline_queue.ts:46`](chimera_mobile_app/services/offline_queue.ts:46) | Using `Math.random()` for queue item IDs | Use `uuid` or `crypto.randomUUID()` | Collision risk at scale |

## Configuration & Security

| Severity | Location | Issue | Recommendation | Architect Note |
| :--- | :--- | :--- | :--- | :--- |
| CRITICAL | [`google-services.json:18`](chimera_mobile_app/google-services.json:18) | API Key `AIzaSyAPo0Nvq23yOLPZEPDpVeyStPNrl2D2x8g` exposed | Rotate in Firebase Console; restrict key | Immediate action required |
| HIGH | [`.gitignore:1`](.gitignore:1) | Root `.gitignore` only ignores `.venv` | Add standard Python patterns (`.env`, `__pycache__`, etc.) | Backend secrets at risk |
| MEDIUM | [`app.json:55`](chimera_mobile_app/app.json:55) | EAS project ID committed | Generally safe but consider `.env` for cleaner separation | Low risk |

---

## Summary for System Architect

**Approval Status: ❌ BLOCK**

### Immediate Refactor Sprint (Week 1):
1. **Kill the hardcoded user ID** - This is the biggest architectural debt. Every service needs to accept `user_id` from authenticated context.
2. **Rotate the Firebase API key** - It's in git history forever. Restrict the new key by package name.
3. **Add auth middleware to workout/daily-log endpoints** - Currently all data is public.
4. **Centralize API_BASE** - 4 different files hardcode the same URL.

### Phase 2 Sprint (Week 2-3):
1. Pin all Python dependencies with exact versions
2. Extract timezone from user settings, remove all `-5` hardcodes
3. Create authenticated fetch wrapper in frontend that auto-attaches JWT
4. Add proper error handling to AI tool execution

### Technical Debt Score: **7.2/10** (High)
- Security: 3/10 (Critical gaps)
- Architecture: 5/10 (Tight coupling via hardcoded IDs)
- Code Quality: 8/10 (Clean, readable, good patterns in tracker.tsx)
- Performance: 7/10 (Good offline-first design, minor optimization opportunities)