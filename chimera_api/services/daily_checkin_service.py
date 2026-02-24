import logging
from datetime import datetime, timedelta
from db_client import supabase_admin

logger = logging.getLogger(__name__)


async def get_today_status(user_id: str, date: str) -> dict:
    """Return morning checkin, workout updates, and pending workouts for a date."""
    # Get all checkin entries for this date
    response = (
        supabase_admin.table("daily_checkin")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date)
        .order("created_at", desc=False)
        .execute()
    )
    entries = response.data or []

    morning_checkin = None
    workout_updates = []
    for entry in entries:
        if entry["entry_type"] == "morning_checkin":
            morning_checkin = entry
        elif entry["entry_type"] == "workout_update":
            workout_updates.append(entry)

    # Get today's completed activities that don't have a workout_update yet
    rated_strava_ids = {
        wu["strava_activity_id"] for wu in workout_updates if wu.get("strava_activity_id")
    }

    pending_workouts = []
    try:
        activities_resp = (
            supabase_admin.table("completed_activities")
            .select("id, source_id, activity_type, start_time, distance_meters, moving_time_seconds")
            .eq("user_id", user_id)
            .eq("source_type", "strava")
            .gte("start_time", f"{date}T00:00:00")
            .lte("start_time", f"{date}T23:59:59")
            .order("start_time", desc=True)
            .execute()
        )
        for activity in activities_resp.data or []:
            if activity["source_id"] not in rated_strava_ids:
                pending_workouts.append(activity)
    except Exception as e:
        logger.warning(f"Failed to fetch today's activities: {e}")

    # Get streak
    streak = await get_streak(user_id, date)

    return {
        "morning_checkin": morning_checkin,
        "workout_updates": workout_updates,
        "pending_workouts": pending_workouts,
        "streak": streak,
    }


async def upsert_morning_checkin(user_id: str, date: str, data: dict) -> dict:
    """Upsert morning check-in for a given date."""
    record = {
        "user_id": user_id,
        "date": date,
        "entry_type": "morning_checkin",
        "readiness": data.get("readiness"),
        "soreness": data.get("soreness"),
        "energy": data.get("energy"),
        "mood": data.get("mood"),
        "note": data.get("note"),
        "body_weight": data.get("body_weight"),
        "body_weight_unit": data.get("body_weight_unit", "lbs"),
    }

    response = (
        supabase_admin.table("daily_checkin")
        .upsert(record, on_conflict="user_id,date,entry_type")
        .execute()
    )

    if not response.data:
        raise Exception("Failed to upsert morning checkin")

    return response.data[0]


async def upsert_workout_update(user_id: str, strava_activity_id: str, data: dict) -> dict:
    """Upsert workout RPE for a given strava activity."""
    # Get the activity date from completed_activities
    activity_resp = (
        supabase_admin.table("completed_activities")
        .select("start_time")
        .eq("user_id", user_id)
        .eq("source_id", strava_activity_id)
        .execute()
    )

    if not activity_resp.data:
        raise Exception(f"Activity {strava_activity_id} not found")

    activity_date = activity_resp.data[0]["start_time"].split("T")[0]

    record = {
        "user_id": user_id,
        "date": activity_date,
        "entry_type": "workout_update",
        "strava_activity_id": strava_activity_id,
        "session_rpe": data.get("session_rpe"),
    }

    response = (
        supabase_admin.table("daily_checkin")
        .upsert(record, on_conflict="user_id,strava_activity_id")
        .execute()
    )

    if not response.data:
        raise Exception("Failed to upsert workout update")

    return response.data[0]


async def get_streak(user_id: str, date: str) -> int:
    """Count consecutive days with any checkin entry, ending at given date."""
    try:
        # Get distinct dates with entries, ordered descending
        response = (
            supabase_admin.table("daily_checkin")
            .select("date")
            .eq("user_id", user_id)
            .lte("date", date)
            .order("date", desc=True)
            .limit(90)
            .execute()
        )

        if not response.data:
            return 0

        # Get unique dates
        dates = sorted(set(row["date"] for row in response.data), reverse=True)

        streak = 0
        current = datetime.strptime(date, "%Y-%m-%d").date()

        for d_str in dates:
            d = datetime.strptime(d_str, "%Y-%m-%d").date()
            if d == current:
                streak += 1
                current -= timedelta(days=1)
            elif d < current:
                break

        return streak

    except Exception as e:
        logger.warning(f"Failed to calculate streak: {e}")
        return 0


async def get_checkins_range(user_id: str, start_date: str, end_date: str) -> list:
    """Get all checkin entries for a date range (for AI context)."""
    try:
        response = (
            supabase_admin.table("daily_checkin")
            .select("*")
            .eq("user_id", user_id)
            .gte("date", start_date)
            .lte("date", end_date)
            .order("date", desc=False)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.warning(f"Failed to fetch checkins range: {e}")
        return []
