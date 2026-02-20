import os
import logging
import time
import httpx
from datetime import datetime, timedelta
from db_client import supabase_admin
from services.user_settings_service import get_user_settings, get_user_timezone

logger = logging.getLogger(__name__)

STRAVA_AUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"

# Map Strava sport types to internal activity types
STRAVA_TYPE_MAP = {
    "run": "run",
    "trail run": "run",
    "virtual run": "run",
    "ride": "bike",
    "virtual ride": "bike",
    "gravel ride": "bike",
    "mountain bike ride": "bike",
    "e-bike ride": "bike",
    "swim": "swim",
    "open water swimming": "swim",
    "weight training": "strength",
    "workout": "strength",
    "crossfit": "strength",
}


def _safe_int(value):
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def _map_activity_type(strava_type: str) -> str:
    """Map a Strava activity type string to our internal type."""
    key = strava_type.lower().strip()
    if key in STRAVA_TYPE_MAP:
        return STRAVA_TYPE_MAP[key]
    # Fallback: substring matching for less common types
    if "run" in key:
        return "run"
    if "ride" in key or "cycling" in key:
        return "bike"
    if "swim" in key:
        return "swim"
    if "weight" in key or "strength" in key:
        return "strength"
    return "other"


def _get_user_by_strava_id(strava_athlete_id: int) -> str:
    """Find the user_id that owns a given Strava athlete account."""
    response = (
        supabase_admin.table("user_settings")
        .select("user_id")
        .eq("strava_athlete_id", str(strava_athlete_id))
        .execute()
    )
    if not response.data:
        raise Exception(f"No user found for Strava Athlete ID: {strava_athlete_id}")
    return response.data[0]["user_id"]


async def _get_access_token(user_id: str) -> str:
    """Get a valid Strava access token, only refreshing if expired."""
    response = (
        supabase_admin.table("user_settings")
        .select("strava_access_token, strava_refresh_token, strava_expires_at")
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise Exception(f"No Strava tokens found for user {user_id}")

    settings = response.data[0]
    expires_at = settings.get("strava_expires_at")
    access_token = settings.get("strava_access_token")

    # Return cached token if it's still valid (with 60s buffer)
    if access_token and expires_at and int(expires_at) > time.time() + 60:
        return access_token

    refresh_token = settings.get("strava_refresh_token")
    if not refresh_token:
        raise Exception(f"No Strava refresh token for user {user_id}")

    payload = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(STRAVA_AUTH_URL, data=payload)
        r.raise_for_status()
        tokens = r.json()

    supabase_admin.table("user_settings").update(
        {
            "strava_access_token": tokens["access_token"],
            "strava_refresh_token": tokens["refresh_token"],
            "strava_expires_at": tokens["expires_at"],
        }
    ).eq("user_id", user_id).execute()

    return tokens["access_token"]


async def _fetch_strava_activity(token: str, activity_id: int) -> dict:
    """Fetch a single activity from the Strava API."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{STRAVA_API_URL}/activities/{activity_id}", headers=headers
        )
        r.raise_for_status()
        return r.json()


def _build_activity_record(user_id: str, data: dict) -> dict:
    """Build a completed_activities record from Strava API data."""
    return {
        "user_id": user_id,
        "source_type": "strava",
        "source_id": str(data["id"]),
        "activity_type": _map_activity_type(data.get("type", "")),
        "start_time": data["start_date"],
        "distance_meters": data.get("distance"),
        "moving_time_seconds": _safe_int(data.get("moving_time")),
        "elapsed_time_seconds": _safe_int(data.get("elapsed_time")),
        "total_elevation_gain": data.get("total_elevation_gain"),
        "average_heartrate": _safe_int(data.get("average_heartrate")),
        "activity_data_blob": data,
    }


# --- Webhook Handlers ---


async def handle_webhook_event(
    object_id: int, owner_id: int, aspect_type: str = "create"
):
    """Dispatch webhook events to the appropriate handler."""
    logger.info(
        f"Processing Strava event: {aspect_type} activity {object_id} "
        f"for athlete {owner_id}"
    )
    try:
        user_id = _get_user_by_strava_id(owner_id)

        if aspect_type == "create":
            await _handle_activity_create(user_id, object_id)
        elif aspect_type == "update":
            await _handle_activity_update(user_id, object_id)
        elif aspect_type == "delete":
            await _handle_activity_delete(user_id, object_id)

    except Exception as e:
        logger.error(f"Strava webhook error ({aspect_type} {object_id}): {e}")


async def _handle_activity_create(user_id: str, activity_id: int):
    """Fetch new activity from Strava, upsert into DB, and auto-link to plan."""
    token = await _get_access_token(user_id)
    data = await _fetch_strava_activity(token, activity_id)

    activity_record = _build_activity_record(user_id, data)

    result = (
        supabase_admin.table("completed_activities")
        .upsert(activity_record, on_conflict="user_id,source_type,source_id")
        .execute()
    )

    await _auto_link_to_plan(user_id, result.data[0]["id"], data)


async def _handle_activity_update(user_id: str, activity_id: int):
    """Re-fetch updated activity from Strava and upsert into DB."""
    token = await _get_access_token(user_id)
    data = await _fetch_strava_activity(token, activity_id)

    activity_record = _build_activity_record(user_id, data)

    supabase_admin.table("completed_activities").upsert(
        activity_record, on_conflict="user_id,source_type,source_id"
    ).execute()

    logger.info(f"Updated activity {activity_id} for user {user_id}")


async def _handle_activity_delete(user_id: str, activity_id: int):
    """Remove a deleted Strava activity and unlink any connected planned workout."""
    # Find the completed_activities row
    response = (
        supabase_admin.table("completed_activities")
        .select("id, planned_workout_id")
        .eq("user_id", user_id)
        .eq("source_type", "strava")
        .eq("source_id", str(activity_id))
        .execute()
    )

    if not response.data:
        logger.info(f"Activity {activity_id} not found in DB, nothing to delete")
        return

    row = response.data[0]

    # Unlink the planned workout back to "planned" status
    if row.get("planned_workout_id"):
        supabase_admin.table("planned_workouts").update(
            {"status": "planned"}
        ).eq("id", row["planned_workout_id"]).execute()

    # Delete the completed activity
    supabase_admin.table("completed_activities").delete().eq(
        "id", row["id"]
    ).execute()

    logger.info(f"Deleted activity {activity_id} for user {user_id}")


# --- Auto-Linker ---


async def _auto_link_to_plan(user_id: str, completed_id, strava_data: dict):
    """Match a completed activity to a planned workout by date and activity type."""
    local_iso = strava_data.get("start_date_local")
    if not local_iso:
        return
    target_date_str = local_iso.split("T")[0]
    activity_type = _map_activity_type(strava_data.get("type", ""))

    # Query a UTC window around the target date
    target_date = datetime.fromisoformat(target_date_str)
    search_start = (target_date - timedelta(days=1)).isoformat()
    search_end = (target_date + timedelta(days=2)).isoformat()

    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "planned")
        .gte("start_time", search_start)
        .lte("start_time", search_end)
        .execute()
    )

    candidates = response.data
    if not candidates:
        logger.info(f"No planned workouts found near {target_date_str}")
        return

    settings = await get_user_settings(user_id)
    user_tz = get_user_timezone(settings)

    # First pass: match on date AND activity type
    match = None
    for plan in candidates:
        plan_utc = datetime.fromisoformat(plan["start_time"].replace("Z", "+00:00"))
        plan_local = plan_utc.astimezone(user_tz)
        if plan_local.strftime("%Y-%m-%d") == target_date_str:
            if plan.get("activity_type") == activity_type:
                match = plan
                break

    # Second pass: match on date only (fallback for "other" types or mismatches)
    if not match:
        for plan in candidates:
            plan_utc = datetime.fromisoformat(
                plan["start_time"].replace("Z", "+00:00")
            )
            plan_local = plan_utc.astimezone(user_tz)
            if plan_local.strftime("%Y-%m-%d") == target_date_str:
                match = plan
                break

    if match:
        logger.info(f"Linked activity to planned workout: {match['title']}")
        supabase_admin.table("completed_activities").update(
            {"planned_workout_id": match["id"]}
        ).eq("id", completed_id).execute()

        supabase_admin.table("planned_workouts").update(
            {"status": "completed"}
        ).eq("id", match["id"]).execute()
    else:
        logger.info(f"No matching planned workout for {target_date_str}")


# --- Historical Sync ---


async def sync_recent_activities(user_id: str, days: int = 30) -> dict:
    """Fetch and store recent Strava activities for a user (backfill)."""
    token = await _get_access_token(user_id)
    after_epoch = int((datetime.utcnow() - timedelta(days=days)).timestamp())

    all_activities = []
    page = 1

    async with httpx.AsyncClient() as client:
        while True:
            r = await client.get(
                f"{STRAVA_API_URL}/athlete/activities",
                headers={"Authorization": f"Bearer {token}"},
                params={"after": after_epoch, "per_page": 100, "page": page},
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            all_activities.extend(batch)
            if len(batch) < 100:
                break
            page += 1

    synced = 0
    errors = 0
    for summary in all_activities:
        try:
            # List endpoint returns summaries; fetch full detail for each
            detail = await _fetch_strava_activity(token, summary["id"])
            record = _build_activity_record(user_id, detail)
            supabase_admin.table("completed_activities").upsert(
                record, on_conflict="user_id,source_type,source_id"
            ).execute()
            synced += 1
        except Exception as e:
            logger.error(f"Failed to sync activity {summary.get('id')}: {e}")
            errors += 1

    logger.info(f"Synced {synced} activities for user {user_id} ({errors} errors)")
    return {"synced": synced, "errors": errors, "total": len(all_activities)}


# --- Disconnect ---


async def disconnect_strava(user_id: str):
    """Clear Strava tokens and athlete ID from user settings."""
    supabase_admin.table("user_settings").update(
        {
            "strava_access_token": None,
            "strava_refresh_token": None,
            "strava_expires_at": None,
            "strava_athlete_id": None,
        }
    ).eq("user_id", user_id).execute()

    logger.info(f"Disconnected Strava for user {user_id}")
