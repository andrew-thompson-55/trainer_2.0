import os
import logging
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from db_client import supabase_admin
from schemas import ProfileUpdate, GoogleLoginRequest, UserSettingsUpdate, UserSettingsResponse
from services import user_settings_service
from services import activity_filter_service
from dependencies import get_current_user
from package_loader import get_persona, get_config

logger = logging.getLogger(__name__)

_persona = get_persona()
_config = get_config()
router = APIRouter(prefix="/v1", tags=["Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")


# --- LOGIN ---
@router.post("/auth/google")
def login_with_google(body: GoogleLoginRequest):
    token = body.token

    try:
        # 1. Verify Google Token
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        email = id_info.get("email")
        google_sub = id_info.get("sub")
        name = id_info.get("name", _persona["defaultUserName"])

        # 2. Check DB
        response = (
            supabase_admin.table("users").select("*").eq("email", email).execute()
        )
        user = response.data[0] if response.data else None
        is_new_user = False

        # TEMP: Only allow existing users (for public testing/pen testing)
        if not user:
            logger.warning(f"Login attempt from non-existent user: {email}")
            raise HTTPException(
                status_code=403, detail="Access restricted to existing users"
            )

        # COMMENTED OUT: New user registration (restore after testing)
        # if not user:
        #     is_new_user = True
        #     new_user_data = {"email": email, "name": name, "google_id": google_sub}
        #     insert_res = supabase_admin.table("users").insert(new_user_data).execute()
        #     user = insert_res.data[0]

        # 3. Create Session Token (JWT)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {"sub": str(user["id"]), "email": user["email"], "exp": expiry}
        session_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {"token": session_token, "user": user, "isNewUser": is_new_user}

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
    except HTTPException as he:
        raise he  # Let the 403 (or any other HTTP error) pass through!
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# --- WEB LOGIN (Access Token) ---
@router.post("/auth/google/web")
def login_with_google_web(body: dict):
    access_token = body.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access_token")

    try:
        # 1. Verify Access Token and get user info from Google
        import urllib.request
        import json

        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}

        req = urllib.request.Request(userinfo_url, headers=headers)

        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                raise ValueError("Invalid access token")
            user_info = json.loads(response.read().decode())

        email = user_info.get("email")
        name = user_info.get("name", _persona["defaultUserName"])
        google_sub = user_info.get("id")

        if not email:
            raise ValueError("No email in user info")

        # 2. Check DB
        db_response = (
            supabase_admin.table("users").select("*").eq("email", email).execute()
        )
        user = db_response.data[0] if db_response.data else None
        is_new_user = False

        # TEMP: Only allow existing users (for public testing/pen testing)
        if not user:
            logger.warning(f"Web login attempt from non-existent user: {email}")
            raise HTTPException(
                status_code=403, detail="Access restricted to existing users"
            )

        # 3. Create Session Token (JWT)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {"sub": str(user["id"]), "email": user["email"], "exp": expiry}
        session_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        logger.info(f"✅ Web login successful for {email}")
        return {"token": session_token, "user": user, "isNewUser": is_new_user}

    except ValueError as ve:
        logger.error(f"Web auth error: {ve}")
        raise HTTPException(status_code=401, detail="Invalid access token")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Web Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# --- VERIFY ---
@router.get("/auth/verify")
def verify_session(user_id: str = Depends(get_current_user)):
    return {"status": "valid", "user_id": user_id}


# --- USER MANAGEMENT ---
@router.delete("/users/me")
def delete_my_account(user_id: str = Depends(get_current_user)):
    supabase_admin.table("users").delete().eq("id", user_id).execute()
    return {"status": "deleted"}


@router.put("/users/profile")
def update_profile(data: ProfileUpdate, user_id: str = Depends(get_current_user)):
    update_dict = data.model_dump(exclude_unset=True)
    supabase_admin.table("users").update(update_dict).eq("id", user_id).execute()
    return {"status": "updated"}


@router.get("/users/settings", response_model=UserSettingsResponse)
async def get_user_settings_route(user_id: str = Depends(get_current_user)):
    settings = await user_settings_service.get_user_settings(user_id)
    _nd = _config["notificationDefaults"]
    return UserSettingsResponse(
        weight_unit=settings.get("weight_unit", _config["defaultWeightUnit"]),
        morning_checkin_reminder=settings.get("morning_checkin_reminder", _nd["morningCheckinReminder"]),
        morning_checkin_reminder_time=settings.get("morning_checkin_reminder_time", _nd["morningCheckinReminderTime"]),
        workout_update_reminder=settings.get("workout_update_reminder", _nd["workoutUpdateReminder"]),
        streak_reminder=settings.get("streak_reminder", _nd["streakReminder"]),
        streak_reminder_time=settings.get("streak_reminder_time", _nd["streakReminderTime"]),
        # Profile fields
        date_of_birth=settings.get("date_of_birth"),
        gender=settings.get("gender"),
        height_value=settings.get("height_value"),
        height_unit=settings.get("height_unit"),
        # Training profile
        training_experience=settings.get("training_experience"),
        primary_activities=settings.get("primary_activities"),
        weekly_training_days=settings.get("weekly_training_days"),
        rest_day_preference=settings.get("rest_day_preference"),
        rest_days=settings.get("rest_days"),
        max_heart_rate=settings.get("max_heart_rate"),
        # Distance unit
        distance_unit=settings.get("distance_unit", "mi"),
        # Expanded notifications
        notification_weekly_summary=settings.get("notification_weekly_summary", False),
        notification_weekly_summary_day=settings.get("notification_weekly_summary_day"),
        notification_weekly_summary_time=settings.get("notification_weekly_summary_time"),
        # Strava connected state
        strava_athlete_id=settings.get("strava_athlete_id"),
        strava_athlete_name=settings.get("strava_athlete_name"),
        # Activity filtering
        tracked_activity_types=settings.get("tracked_activity_types"),
        # Default workout time
        default_workout_time=settings.get("default_workout_time", "06:00"),
    )


@router.put("/users/settings")
async def update_user_settings_route(
    data: UserSettingsUpdate,
    user_id: str = Depends(get_current_user)
):
    updates = data.model_dump(exclude_unset=True)
    await user_settings_service.update_user_settings(user_id, updates)
    return {"status": "updated"}


@router.post("/settings/initialize-tracked-types")
async def initialize_tracked_types_route(user_id: str = Depends(get_current_user)):
    types = await activity_filter_service.initialize_tracked_types(user_id)
    return {"tracked_activity_types": types}
