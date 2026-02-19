import os
import logging
import requests
from datetime import datetime, timedelta, timezone
from db_client import supabase_admin
from services.user_settings_service import get_user_settings, get_user_timezone

logger = logging.getLogger(__name__)

STRAVA_AUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"


def _safe_int(value):
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


# 👇 NEW: Helper to find which user owns this Strava Account
def _get_user_by_strava_id(strava_athlete_id: int):
    response = (
        supabase_admin.table("user_settings")
        .select("user_id")
        .eq("strava_athlete_id", str(strava_athlete_id))
        .execute()
    )
    if not response.data:
        raise Exception(f"No user found for Strava Athlete ID: {strava_athlete_id}")
    return response.data[0]["user_id"]


# 👇 UPDATED: Requires user_id explicitly
def _get_access_token(user_id: str):
    # 1. Get tokens from DB for THIS user
    response = (
        supabase_admin.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise Exception(f"No Strava tokens found for user {user_id}")

    settings = response.data[0]
    refresh_token = settings.get("strava_refresh_token")

    # 2. Refresh the Token
    payload = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    r = requests.post(STRAVA_AUTH_URL, data=payload)
    r.raise_for_status()
    tokens = r.json()

    # 3. Save new tokens
    supabase_admin.table("user_settings").update(
        {
            "strava_access_token": tokens["access_token"],
            "strava_refresh_token": tokens["refresh_token"],
            "strava_expires_at": tokens["expires_at"],
        }
    ).eq("user_id", user_id).execute()

    return tokens["access_token"]


# 👇 UPDATED: Main Logic
async def handle_webhook_event(object_id: int, owner_id: int):
    logger.info(f"Processing Strava Activity: {object_id} for Athlete: {owner_id}")

    try:
        # 1. Dynamically find the user
        user_id = _get_user_by_strava_id(owner_id)
        logger.info(f"Found User ID: {user_id}")

        # 2. Get Token for THAT user
        token = _get_access_token(user_id)

        # 3. Fetch Activity
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{STRAVA_API_URL}/activities/{object_id}", headers=headers)
        r.raise_for_status()
        data = r.json()

        # 4. Process Data
        strava_type = data.get("type", "").lower()
        activity_type = "other"
        if "run" in strava_type:
            activity_type = "run"
        elif "ride" in strava_type:
            activity_type = "bike"
        elif "swim" in strava_type:
            activity_type = "swim"
        elif "weight" in strava_type or "strength" in strava_type:
            activity_type = "strength"

        activity_record = {
            "user_id": user_id,  # Use dynamic ID
            "source_type": "strava",
            "source_id": str(data["id"]),
            "start_time": data["start_date"],
            "distance_meters": data.get("distance"),
            "moving_time_seconds": _safe_int(data.get("moving_time")),
            "elapsed_time_seconds": _safe_int(data.get("elapsed_time")),
            "total_elevation_gain": data.get("total_elevation_gain"),
            "average_heartrate": _safe_int(data.get("average_heartrate")),
            "activity_data_blob": data,
        }

        result = (
            supabase_admin.table("completed_activities")
            .upsert(activity_record, on_conflict="user_id,source_type,source_id")
            .execute()
        )

        # 5. Link to Plan (Need to pass user_id down)
        await _auto_link_to_plan(user_id, result.data[0]["id"], data)

    except Exception as e:
        logger.error(f"Strava Processing Error: {e}")


# 👇 UPDATED: Auto-Linker
async def _auto_link_to_plan(user_id: str, completed_id, strava_data):
    local_iso = strava_data.get("start_date_local")
    if not local_iso:
        return
    target_date_str = local_iso.split("T")[0]

    # Use UTC Window for DB Query
    target_date = datetime.fromisoformat(target_date_str)
    search_start = (target_date - timedelta(days=1)).isoformat()
    search_end = (target_date + timedelta(days=2)).isoformat()

    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", user_id)  # Dynamic User
        .gte("start_time", search_start)
        .lte("start_time", search_end)
        .execute()
    )

    candidates = response.data
    match = None

    # Dynamic timezone lookup from user_settings
    settings = await get_user_settings(user_id)
    user_tz = get_user_timezone(settings)

    for plan in candidates:
        plan_utc = datetime.fromisoformat(plan["start_time"].replace("Z", "+00:00"))
        plan_local = plan_utc.astimezone(user_tz)
        if plan_local.strftime("%Y-%m-%d") == target_date_str:
            match = plan
            break

    if match:
        logger.info(f"MATCH! Linking to: {match['title']}")
        supabase_admin.table("completed_activities").update(
            {"planned_workout_id": match["id"]}
        ).eq("id", completed_id).execute()

        supabase_admin.table("planned_workouts").update({"status": "completed"}).eq(
            "id", match["id"]
        ).execute()
    else:
        logger.info(f"No match found for {target_date_str}")
