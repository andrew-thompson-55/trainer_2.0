import os
import requests
from datetime import datetime, timedelta, timezone
from db_client import supabase_admin
from services.workout_service import HARDCODED_USER_ID

STRAVA_AUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"

# Hardcode user's timezone offset for matching (same as main.py)
USER_TIMEZONE_OFFSET = -5


def _get_access_token():
    # 1. Get tokens from DB
    response = (
        supabase_admin.table("user_settings")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .execute()
    )
    if not response.data:
        raise Exception("No Strava tokens found for user.")

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
    ).eq("user_id", HARDCODED_USER_ID).execute()

    return tokens["access_token"]


async def handle_webhook_event(object_id: int, owner_id: int):
    print(f"🚴 Processing Strava Activity ID: {object_id}")

    try:
        token = _get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{STRAVA_API_URL}/activities/{object_id}", headers=headers)
        r.raise_for_status()
        data = r.json()

        # Map Type
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

        # Insert
        activity_record = {
            "user_id": HARDCODED_USER_ID,
            "source_type": "strava",
            "source_id": str(data["id"]),
            "start_time": data["start_date"],  # Save UTC for physics truth
            "distance_meters": data.get("distance"),
            "moving_time_seconds": data.get("moving_time"),
            "elapsed_time_seconds": data.get("elapsed_time"),
            "total_elevation_gain": data.get("total_elevation_gain"),
            "average_heartrate": data.get("average_heartrate"),
            "activity_data_blob": data,
        }

        result = (
            supabase_admin.table("completed_activities")
            .upsert(activity_record, on_conflict="user_id,source_type,source_id")
            .execute()
        )

        # Pass the FULL data object (which has start_date_local) to the linker
        await _auto_link_to_plan(result.data[0]["id"], data)

    except Exception as e:
        print(f"❌ Strava Processing Error: {e}")


async def _auto_link_to_plan(completed_id, strava_data):
    """
    Links actual activity to planned workout using LOCAL DATE matching.
    """
    # 1. Use Local Date (The time on your watch)
    local_iso = strava_data.get("start_date_local")  # "2025-12-02T18:00:00"
    target_date_str = local_iso.split("T")[0]  # "2025-12-02"

    print(f"🔍 Matching against Plan Date: {target_date_str} (Local Time)")

    # 2. Query a WIDE Window (UTC)
    # We query 24h BEFORE and AFTER the target date to ensure we catch the planned workout
    # regardless of how Postgres stored the timezone.
    target_date = datetime.fromisoformat(target_date_str)
    search_start = (target_date - timedelta(days=1)).isoformat()
    search_end = (target_date + timedelta(days=2)).isoformat()

    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .gte("start_time", search_start)
        .lte("start_time", search_end)
        .execute()
    )

    candidates = response.data
    match = None

    # 3. Filter in Python (The Precise Match)
    # We shift the DB timestamps to User's Local Time and check if the DATE matches.
    for plan in candidates:
        # Parse DB time (UTC)
        plan_utc = datetime.fromisoformat(plan["start_time"].replace("Z", "+00:00"))

        # Shift to User's Timezone
        plan_local = plan_utc + timedelta(hours=USER_TIMEZONE_OFFSET)
        plan_date_str = plan_local.strftime("%Y-%m-%d")

        if plan_date_str == target_date_str:
            match = plan
            break

    if match:
        print(f"🤝 MATCH! Linking to: {match['title']}")

        supabase_admin.table("completed_activities").update(
            {"planned_workout_id": match["id"]}
        ).eq("id", completed_id).execute()

        supabase_admin.table("planned_workouts").update({"status": "completed"}).eq(
            "id", match["id"]
        ).execute()
    else:
        print(
            f"🤷 No match found for {target_date_str}. Candidates checked: {len(candidates)}"
        )
