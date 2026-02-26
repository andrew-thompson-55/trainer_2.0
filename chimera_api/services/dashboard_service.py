import logging
import json
from datetime import datetime, timedelta, date
from db_client import supabase_admin
from services.activity_filter_service import is_activity_included

logger = logging.getLogger(__name__)


async def get_dashboard(user_id: str) -> dict:
    """Single aggregated dashboard response — one API call, no waterfall."""
    today = date.today()
    twelve_weeks_ago = today - timedelta(weeks=12)

    # --- Parallel-safe queries (all independent) ---

    # 1. Completed activities — last 12 weeks
    activities_resp = (
        supabase_admin.table("completed_activities")
        .select("*")
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

    # 6. Upcoming planned workouts (include today's workouts)
    today_start = datetime.combine(today, datetime.min.time()).isoformat()
    upcoming_resp = (
        supabase_admin.table("planned_workouts")
        .select("id, title, activity_type, start_time, description, status")
        .eq("user_id", user_id)
        .gte("start_time", today_start)
        .order("start_time", desc=False)
        .limit(7)
        .execute()
    )
    # Tag today's workouts
    upcoming_workouts = []
    for w in (upcoming_resp.data or []):
        w_date = w.get("start_time", "")[:10]
        w["is_today"] = w_date == today.isoformat()
        upcoming_workouts.append(w)

    # 7. User settings
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    # --- Activity filtering ---
    settings_data_raw = (settings_resp.data or [{}])[0] if settings_resp.data else {}
    tracked_types = settings_data_raw.get("tracked_activity_types") or []

    # Split: stats_activities for metrics, all_activities for display
    stats_activities = [a for a in all_activities if is_activity_included(a, tracked_types)]

    # --- Aggregate weekly metrics (stats-included only) ---
    weekly_metrics = _aggregate_weekly(stats_activities, weight_resp.data or [], twelve_weeks_ago, today)

    # --- Recent activities (up to 8, all activities with stats_included flag) ---
    recent_activities = []
    for a in all_activities[:8]:
        name = _extract_activity_name(a)
        recent_activities.append({
            "id": a["id"],
            "name": name,
            "activity_type": a.get("original_activity_type") or a.get("activity_type"),
            "original_activity_type": a.get("original_activity_type"),
            "start_time": a.get("start_time"),
            "distance_meters": a.get("distance_meters") or 0,
            "moving_time_seconds": a.get("moving_time_seconds") or 0,
            "total_elevation_gain": a.get("total_elevation_gain") or 0,
            "average_heartrate": a.get("average_heartrate"),
            "session_rpe": rpe_map.get(a.get("source_id")),
            "stats_included": is_activity_included(a, tracked_types),
        })

    # --- Today's checkin ---
    today_checkin = None
    if today_checkin_resp.data:
        today_checkin = today_checkin_resp.data[0]

    # --- Week summary (current week Mon-Sun, stats-included only) ---
    week_start = today - timedelta(days=today.weekday())
    week_activities = [
        a for a in stats_activities
        if a.get("start_time") and a["start_time"][:10] >= week_start.isoformat()
    ]
    week_distance = sum(a.get("distance_meters") or 0 for a in week_activities)
    week_vert = sum(a.get("total_elevation_gain") or 0 for a in week_activities)

    # --- Race info ---
    settings_data = settings_data_raw
    race = None
    if settings_data.get("target_race") and settings_data.get("target_race_date"):
        race = {
            "name": settings_data["target_race"],
            "date": settings_data["target_race_date"],
        }

    # --- Paced deltas (week-to-date vs same point last week, stats-included only) ---
    paced_deltas = _compute_paced_deltas(stats_activities, today)

    # --- Compliance score ---
    compliance = await _compute_compliance(user_id, today)

    return {
        "weekly_metrics": weekly_metrics,
        "paced_deltas": paced_deltas,
        "recent_activities": recent_activities,
        "today": {
            "checkin": today_checkin,
            "streak": streak,
        },
        "upcoming_workouts": upcoming_workouts,
        "week_summary": {
            "runs": len(week_activities),
            "miles": round(week_distance / 1609.34, 1),
            "vert_ft": round(week_vert * 3.28084),
        },
        "race": race,
        "compliance": compliance,
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


def _compute_paced_deltas(all_activities: list, today: date) -> dict:
    """Compare current week-to-date vs same point in previous week."""
    days_elapsed = today.weekday() + 1  # Mon=1..Sun=7
    current_week_start = today - timedelta(days=today.weekday())
    prev_week_start = current_week_start - timedelta(weeks=1)
    prev_week_cutoff = prev_week_start + timedelta(days=days_elapsed - 1)

    def _sum_period(start: date, end: date):
        totals = {"volume_m": 0, "vert_m": 0, "duration_s": 0, "long_run_m": 0}
        for a in all_activities:
            if not a.get("start_time"):
                continue
            d = datetime.fromisoformat(a["start_time"].replace("Z", "+00:00")).date()
            if start <= d <= end:
                dist = a.get("distance_meters") or 0
                totals["volume_m"] += dist
                totals["vert_m"] += a.get("total_elevation_gain") or 0
                totals["duration_s"] += a.get("moving_time_seconds") or 0
                if dist > totals["long_run_m"]:
                    totals["long_run_m"] = dist
        return totals

    current = _sum_period(current_week_start, today)
    previous = _sum_period(prev_week_start, prev_week_cutoff)

    result = {}
    for key in ("volume_m", "vert_m", "duration_s", "long_run_m"):
        cur_val = current[key]
        prev_val = previous[key]
        if prev_val > 0:
            delta_pct = round(((cur_val - prev_val) / prev_val) * 100)
        elif cur_val > 0:
            delta_pct = 100
        else:
            delta_pct = None  # both zero
        result[key] = {"current": cur_val, "previous": prev_val, "delta_pct": delta_pct}

    return result


async def _compute_compliance(user_id: str, today: date) -> dict | None:
    """Compute plan compliance over the past 4 weeks."""
    four_weeks_ago = today - timedelta(weeks=4)

    planned_resp = (
        supabase_admin.table("planned_workouts")
        .select("start_time, activity_type, status")
        .eq("user_id", user_id)
        .gte("start_time", four_weeks_ago.isoformat())
        .lte("start_time", today.isoformat() + "T23:59:59")
        .order("start_time", desc=False)
        .execute()
    )
    planned = planned_resp.data or []
    if not planned:
        return None

    # Get completed activities for the same period (filtered by tracked types)
    completed_resp = (
        supabase_admin.table("completed_activities")
        .select("start_time, original_activity_type, stats_override, stats_excluded")
        .eq("user_id", user_id)
        .gte("start_time", four_weeks_ago.isoformat())
        .lte("start_time", today.isoformat() + "T23:59:59")
        .execute()
    )

    # Get tracked types for filtering
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("tracked_activity_types")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    tracked_types = (settings_resp.data or [{}])[0].get("tracked_activity_types") or []

    completed_dates = set()
    for a in (completed_resp.data or []):
        if a.get("start_time") and is_activity_included(a, tracked_types):
            completed_dates.add(a["start_time"][:10])

    # Evaluate compliance per planned day
    compliant_days = 0
    total_days = 0
    current_week_start = today - timedelta(days=today.weekday())
    current_week_compliant = 0
    current_week_total = 0
    by_week = {}

    for p in planned:
        p_date = p.get("start_time", "")[:10]
        if not p_date:
            continue
        total_days += 1
        is_rest = "rest" in (p.get("activity_type") or "").lower()
        has_activity = p_date in completed_dates

        compliant = (is_rest and not has_activity) or (not is_rest and has_activity)
        if compliant:
            compliant_days += 1

        # Track current week
        try:
            p_date_obj = datetime.strptime(p_date, "%Y-%m-%d").date()
        except ValueError:
            continue
        wk = _week_start(p_date_obj).isoformat()
        if wk not in by_week:
            by_week[wk] = {"compliant": 0, "total": 0}
        by_week[wk]["total"] += 1
        if compliant:
            by_week[wk]["compliant"] += 1

        if p_date_obj >= current_week_start:
            current_week_total += 1
            if compliant:
                current_week_compliant += 1

    score = round((compliant_days / total_days) * 100) if total_days > 0 else 0

    return {
        "score": score,
        "compliant_days": compliant_days,
        "total_days": total_days,
        "current_week": {"compliant": current_week_compliant, "total": current_week_total},
        "by_week": [{"week_start": k, **v} for k, v in sorted(by_week.items())],
    }


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
    return (activity.get("original_activity_type") or activity.get("activity_type") or "Activity").replace("_", " ").title()
