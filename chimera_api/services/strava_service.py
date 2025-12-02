import os
import requests
from datetime import datetime, timedelta
from db_client import supabase_admin
from services.workout_service import HARDCODED_USER_ID

STRAVA_AUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"


def _get_access_token():
    """
    Fetches the latest tokens from the Database (not Environment)
    and refreshes them if necessary.
    """
    # 1. Get tokens from DB
    response = (
        supabase_admin.table("user_settings")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .execute()
    )
    if not response.data:
        raise Exception(
            "No Strava tokens found for user. Please connect Strava in Settings."
        )

    settings = response.data[0]
    refresh_token = settings.get("strava_refresh_token")

    if not refresh_token:
        raise Exception("Strava refresh token is missing.")

    # 2. Refresh the Token with Strava
    payload = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    r = requests.post(STRAVA_AUTH_URL, data=payload)
    r.raise_for_status()
    tokens = r.json()

    # 3. Save new tokens back to DB (Strava rotates them!)
    supabase_admin.table("user_settings").update(
        {
            "strava_access_token": tokens["access_token"],
            "strava_refresh_token": tokens["refresh_token"],
            "strava_expires_at": tokens["expires_at"],
        }
    ).eq("user_id", HARDCODED_USER_ID).execute()

    return tokens["access_token"]


async def exchange_and_store_token(code: str):
    """
    Initial setup: Exchanges code for token.
    """
    # Hardcoded redirect to match the Frontend/Settings config
    redirect_uri = "https://trainer-2-0.onrender.com/v1/integrations/strava/redirect"

    payload = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    print(f"Swapping code for token...")
    response = requests.post(STRAVA_AUTH_URL, data=payload)

    if not response.ok:
        print(f"Strava Exchange Failed: {response.text}")
        response.raise_for_status()

    data = response.json()
    athlete = data.get("athlete", {})

    # Save to Supabase
    supabase_admin.table("user_settings").upsert(
        {
            "user_id": HARDCODED_USER_ID,
            "strava_access_token": data["access_token"],
            "strava_refresh_token": data["refresh_token"],
            "strava_expires_at": data["expires_at"],
        }
    ).execute()

    return {"status": "success", "athlete_id": athlete.get("id")}


async def handle_webhook_event(object_id: int, owner_id: int):
    """
    Triggered by Webhook. Fetches data and saves it.
    """
    print(f"🚴 Processing Strava Activity ID: {object_id}")

    try:
        # 1. Get Fresh Token
        token = _get_access_token()

        # 2. Fetch Activity Data
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

        # 3. Save to Completed Activities
        activity_record = {
            "user_id": HARDCODED_USER_ID,
            "source_type": "strava",
            "source_id": str(data["id"]),
            "start_time": data["start_date"],
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

        print(f"✅ Activity Saved. ID: {result.data[0]['id']}")

        # 4. Run Auto-Matcher
        await _auto_link_to_plan(result.data[0]["id"], activity_record)

    except Exception as e:
        print(f"❌ Strava Processing Error: {e}")


async def _auto_link_to_plan(completed_id, activity_record):
    """
    Links actual activity to planned workout.
    """
    activity_date = activity_record["start_time"].split("T")[0]
    print(f"🔍 Checking plan for {activity_date}...")

    start_of_day = f"{activity_date}T00:00:00"
    end_of_day = f"{activity_date}T23:59:59"

    # Find planned workouts for that day
    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .gte("start_time", start_of_day)
        .lte("start_time", end_of_day)
        .execute()
    )

    candidates = response.data

    if candidates:
        # Simple match: Take the first one. (V2: Match by type)
        match = candidates[0]
        print(f"🤝 MATCH! Linking to: {match['title']}")

        # Link records
        supabase_admin.table("completed_activities").update(
            {"planned_workout_id": match["id"]}
        ).eq("id", completed_id).execute()

        # Mark plan complete
        supabase_admin.table("planned_workouts").update({"status": "completed"}).eq(
            "id", match["id"]
        ).execute()
    else:
        print("No matching plan found.")
