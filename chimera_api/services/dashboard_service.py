import logging
import json
from datetime import datetime, timedelta, date
from db_client import supabase_admin

logger = logging.getLogger(__name__)


async def get_dashboard(user_id: str) -> dict:
    """Single aggregated dashboard response — one API call, no waterfall."""
    today = date.today()
    twelve_weeks_ago = today - timedelta(weeks=12)

    # --- Parallel-safe queries (all independent) ---

    # 1. Completed activities — last 12 weeks
    activities_resp = (
        supabase_admin.table("completed_activities")
        .select(
            "id, source_id, activity_type, start_time, distance_meters, "
            "moving_time_seconds, total_elevation_gain, average_heartrate, "
            "activity_data_blob"
        )
        .eq("user_id", user_id)
        .gte("start_time", twelve_weeks_ago.isoformat())
        .order("start_time", desc=True)
        .execute()
    )
    all_activities = activities_resp.data or []

    # 2. Today's morning checkin
    today_checkin_resp = (
        supabase_admin.table("daily_checkin")
        .select("readiness, soreness, energy, mood")
        .eq("user_id", user_id)
        .eq("date", today.isoformat())
        .eq("entry_type", "morning_checkin")
        .limit(1)
        .execute()
    )

    # 3. Checkin streak
    from services.daily_checkin_service import get_streak
    streak = await get_streak(user_id, today.isoformat())

    # 4. Body weight entries — last 12 weeks
    weight_resp = (
        supabase_admin.table("daily_checkin")
        .select("date, body_weight")
        .eq("user_id", user_id)
        .eq("entry_type", "morning_checkin")
        .gte("date", twelve_weeks_ago.isoformat())
        .not_.is_("body_weight", "null")
        .order("date", desc=True)
        .execute()
    )

    # 5. Workout RPE entries — for recent activities
    recent_source_ids = [a["source_id"] for a in all_activities[:20] if a.get("source_id")]
    rpe_map = {}
    if recent_source_ids:
        rpe_resp = (
            supabase_admin.table("daily_checkin")
            .select("strava_activity_id, session_rpe")
            .eq("user_id", user_id)
            .eq("entry_type", "workout_update")
            .in_("strava_activity_id", recent_source_ids)
            .execute()
        )
        rpe_map = {
            r["strava_activity_id"]: r["session_rpe"]
            for r in (rpe_resp.data or [])
        }

    # 6. Upcoming planned workouts
    upcoming_resp = (
        supabase_admin.table("planned_workouts")
        .select("id, title, activity_type, start_time, description")
        .eq("user_id", user_id)
        .eq("status", "planned")
        .gte("start_time", datetime.now().isoformat())
        .order("start_time", desc=False)
        .limit(5)
        .execute()
    )

    # 7. User settings
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("target_race, target_race_date, distance_unit")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    # --- Aggregate weekly metrics ---
    weekly_metrics = _aggregate_weekly(all_activities, weight_resp.data or [], twelve_weeks_ago, today)

    # --- Recent activities (up to 8) ---
    recent_activities = []
    for a in all_activities[:8]:
        name = _extract_activity_name(a)
        recent_activities.append({
            "id": a["id"],
            "name": name,
            "activity_type": a.get("activity_type"),
            "start_time": a.get("start_time"),
            "distance_meters": a.get("distance_meters") or 0,
            "moving_time_seconds": a.get("moving_time_seconds") or 0,
            "total_elevation_gain": a.get("total_elevation_gain") or 0,
            "average_heartrate": a.get("average_heartrate"),
            "session_rpe": rpe_map.get(a.get("source_id")),
        })

    # --- Today's checkin ---
    today_checkin = None
    if today_checkin_resp.data:
        today_checkin = today_checkin_resp.data[0]

    # --- Week summary (current week Mon-Sun) ---
    week_start = today - timedelta(days=today.weekday())
    week_activities = [
        a for a in all_activities
        if a.get("start_time") and a["start_time"][:10] >= week_start.isoformat()
    ]
    week_distance = sum(a.get("distance_meters") or 0 for a in week_activities)
    week_vert = sum(a.get("total_elevation_gain") or 0 for a in week_activities)

    # --- Race info ---
    settings_data = (settings_resp.data or [{}])[0] if settings_resp.data else {}
    race = None
    if settings_data.get("target_race") and settings_data.get("target_race_date"):
        race = {
            "name": settings_data["target_race"],
            "date": settings_data["target_race_date"],
        }

    return {
        "weekly_metrics": weekly_metrics,
        "recent_activities": recent_activities,
        "today": {
            "checkin": today_checkin,
            "streak": streak,
        },
        "upcoming_workouts": upcoming_resp.data or [],
        "week_summary": {
            "runs": len(week_activities),
            "miles": round(week_distance / 1609.34, 1),
            "vert_ft": round(week_vert * 3.28084),
        },
        "race": race,
        "settings": {
            "distance_unit": settings_data.get("distance_unit", "mi"),
        },
    }


def _aggregate_weekly(activities: list, weight_entries: list, start: date, end: date) -> list:
    """Aggregate activities into weekly buckets."""
    # Build weight lookup: latest weight per ISO week
    weight_by_week = {}
    for w in weight_entries:
        d = datetime.strptime(w["date"], "%Y-%m-%d").date()
        week_key = _week_start(d).isoformat()
        if week_key not in weight_by_week:
            weight_by_week[week_key] = w["body_weight"]

    # Bucket activities by week
    weeks = {}
    current = _week_start(start)
    while current <= end:
        weeks[current.isoformat()] = {
            "week_start": current.isoformat(),
            "volume_m": 0,
            "vert_m": 0,
            "duration_s": 0,
            "hr_sum": 0,
            "hr_count": 0,
            "long_run_m": 0,
            "body_weight": weight_by_week.get(current.isoformat()),
        }
        current += timedelta(weeks=1)

    for a in activities:
        if not a.get("start_time"):
            continue
        d = datetime.fromisoformat(a["start_time"].replace("Z", "+00:00")).date()
        wk = _week_start(d).isoformat()
        if wk not in weeks:
            continue
        w = weeks[wk]
        dist = a.get("distance_meters") or 0
        w["volume_m"] += dist
        w["vert_m"] += a.get("total_elevation_gain") or 0
        w["duration_s"] += a.get("moving_time_seconds") or 0
        hr = a.get("average_heartrate")
        if hr:
            w["hr_sum"] += hr * (a.get("moving_time_seconds") or 1)
            w["hr_count"] += a.get("moving_time_seconds") or 1
        if dist > w["long_run_m"]:
            w["long_run_m"] = dist

    # Finalize
    result = []
    for wk in sorted(weeks.keys()):
        w = weeks[wk]
        avg_hr = round(w["hr_sum"] / w["hr_count"]) if w["hr_count"] > 0 else None
        result.append({
            "week_start": w["week_start"],
            "volume_m": round(w["volume_m"]),
            "vert_m": round(w["vert_m"]),
            "duration_s": round(w["duration_s"]),
            "avg_hr": avg_hr,
            "long_run_m": round(w["long_run_m"]),
            "body_weight": w["body_weight"],
        })

    return result


def _week_start(d: date) -> date:
    """Return Monday of the week containing date d."""
    return d - timedelta(days=d.weekday())


def _extract_activity_name(activity: dict) -> str:
    """Extract activity name from activity_data_blob JSON or fallback."""
    blob = activity.get("activity_data_blob")
    if blob:
        try:
            if isinstance(blob, str):
                blob = json.loads(blob)
            if isinstance(blob, dict):
                return blob.get("name", "Activity")
        except (json.JSONDecodeError, TypeError):
            pass
    return activity.get("activity_type", "Activity").replace("_", " ").title()
