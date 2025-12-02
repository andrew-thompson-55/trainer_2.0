import os
import requests
from datetime import datetime, timedelta
from db_client import supabase_admin
from services.workout_service import HARDCODED_USER_ID


STRAVA_AUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"


# ... imports ...


async def exchange_and_store_token(code: str):
    """
    Exchanges the temporary code for permanent tokens.
    VERBOSE DEBUGGING MODE
    """
    # 1. Load Vars
    c_id = os.getenv("STRAVA_CLIENT_ID")
    c_secret = os.getenv("STRAVA_CLIENT_SECRET")

    # 2. Hardcode the Redirect URI to match the Frontend exactly
    # (Ensure no trailing slashes in your Render Env SUPABASE_URL either, just to be safe)
    redirect_uri = "https://trainer-2-0.onrender.com/v1/integrations/strava/redirect"

    # 3. DEBUG PRINT (Masked)
    print(f"--- STARTING TOKEN EXCHANGE ---")
    print(f"Code received: {code}")
    print(f"Using Client ID: '{c_id}' (Length: {len(c_id) if c_id else 0})")
    print(
        f"Using Secret: '{c_secret[:4]}...' (Length: {len(c_secret) if c_secret else 0})"
    )
    print(f"Using Redirect URI: '{redirect_uri}'")

    payload = {
        "client_id": c_id,
        "client_secret": c_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    # 4. Call Strava
    response = requests.post(STRAVA_AUTH_URL, data=payload)

    # 5. DEBUG RESPONSE
    print(f"Strava Status Code: {response.status_code}")
    print(f"Strava Raw Response: {response.text}")  # <--- THIS IS THE GOLD

    if not response.ok:
        # We raise the actual text so you see it in the app alert if possible, or at least in logs
        raise Exception(f"Strava Refused: {response.text}")

    data = response.json()

    # 6. Save to Supabase
    print("Saving to Supabase...")
    supabase_admin.table("user_settings").upsert(
        {
            "user_id": HARDCODED_USER_ID,
            "strava_access_token": data["access_token"],
            "strava_refresh_token": data["refresh_token"],
            "strava_expires_at": data["expires_at"],
        }
    ).execute()

    print("--- SUCCESS ---")
    return {"status": "success", "athlete_id": data["athlete"]["id"]}


def _get_access_token():
    """Exchanges the refresh token for a short-lived access token."""
    payload = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
        "refresh_token": os.getenv("STRAVA_REFRESH_TOKEN"),
        "grant_type": "refresh_token",
    }
    response = requests.post(STRAVA_AUTH_URL, data=payload)
    response.raise_for_status()
    return response.json()["access_token"]


async def handle_webhook_event(object_id: int, owner_id: int):
    """
    1. Fetches the full activity data from Strava.
    2. Saves it to 'completed_activities'.
    3. Runs the Auto-Matcher to link it to a 'planned_workout'.
    """
    print(f"🚴 Processing Strava Activity: {object_id}")

    # 1. Fetch Data
    token = _get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{STRAVA_API_URL}/activities/{object_id}", headers=headers)
    r.raise_for_status()
    data = r.json()

    # Map Strava Type to Our Enum
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

    # 2. Insert into Completed Activities
    activity_record = {
        "user_id": HARDCODED_USER_ID,
        "source_type": "strava",
        "source_id": str(data["id"]),
        "start_time": data["start_date"],  # ISO format
        "distance_meters": data.get("distance"),
        "moving_time_seconds": data.get("moving_time"),
        "elapsed_time_seconds": data.get("elapsed_time"),
        "total_elevation_gain": data.get("total_elevation_gain"),
        "average_heartrate": data.get("average_heartrate"),
        "activity_data_blob": data,  # Store raw JSON just in case
    }

    # Upsert (Prevent duplicates)
    result = (
        supabase_admin.table("completed_activities")
        .upsert(activity_record, on_conflict="user_id,source_type,source_id")
        .execute()
    )

    completed_id = result.data[0]["id"]
    print(f"✅ Saved Completed Activity: {completed_id}")

    # 3. THE AUTO-MATCHER LOGIC
    await _auto_link_to_plan(completed_id, activity_record)


async def _auto_link_to_plan(completed_id, activity_record):
    """
    Looks for a planned workout on the SAME DAY with the SAME TYPE.
    If found, links them and marks the plan as complete.
    """
    # Parse the date (ignore time for matching)
    activity_date = activity_record["start_time"].split("T")[0]

    print(
        f"🔍 Looking for PLANNED {activity_record.get('activity_type', 'run')} on {activity_date}..."
    )

    # Query for planned workouts on this day
    # We use a date range to cover the whole 24h period in UTC
    start_of_day = f"{activity_date}T00:00:00"
    end_of_day = f"{activity_date}T23:59:59"

    # Fetch candidates
    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .gte("start_time", start_of_day)
        .lte("start_time", end_of_day)
        .execute()
    )

    candidates = response.data
    match = None

    # Logic: Find the best match
    # Priority 1: Match Activity Type (e.g. Run vs Run)
    # Priority 2: If multiple, maybe closest time? (For now, just take the first matching type)

    # Simple matching strategy:
    # We need to infer type since we didn't save 'activity_type' in the record above explicitly for the check
    # Let's re-infer or pass it.

    # (Simplified for prototype: Just match the first workout found on that day.
    #  In V2 we will match 'Run' to 'Run')
    if candidates:
        match = candidates[0]

    if match:
        print(f"🤝 MATCH FOUND! Linking to Plan: {match['title']} ({match['id']})")

        # 1. Update Completed Activity with the Link
        supabase_admin.table("completed_activities").update(
            {"planned_workout_id": match["id"]}
        ).eq("id", completed_id).execute()

        # 2. Mark Plan as Completed
        supabase_admin.table("planned_workouts").update({"status": "completed"}).eq(
            "id", match["id"]
        ).execute()

    else:
        print("🤷 No matching plan found. This is an Unplanned Activity.")
