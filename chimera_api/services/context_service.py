import logging
from datetime import timedelta
from db_client import supabase_admin
from services.user_settings_service import (
    get_user_settings,
    get_user_profile,
    get_user_timezone,
    get_local_now,
)

logger = logging.getLogger(__name__)


async def build_agent_context(user_id: str) -> dict:
    """Assemble full training context for the agent's system prompt."""
    context = {}

    # User profile
    context["profile"] = await get_user_profile(user_id)

    # User settings & timezone
    settings = await get_user_settings(user_id)
    tz = get_user_timezone(settings)
    now = get_local_now(tz)
    context["timezone"] = str(tz)
    context["local_time"] = now.strftime("%Y-%m-%d %H:%M:%S")
    context["day_of_week"] = now.strftime("%A")
    context["tz_offset"] = now.strftime("%z")

    # Training profile fields
    context["training_goals"] = settings.get("training_goals")
    context["target_race"] = settings.get("target_race")
    context["target_race_date"] = settings.get("target_race_date")
    context["weekly_volume_target_hours"] = settings.get("weekly_volume_target_hours")
    context["preferred_workout_time"] = settings.get("preferred_workout_time")
    context["injury_notes"] = settings.get("injury_notes")
    context["coach_notes"] = settings.get("coach_notes")
    context["strava_connected"] = bool(settings.get("strava_athlete_id"))

    # Upcoming workouts (next 7 days)
    try:
        start = now.strftime("%Y-%m-%dT00:00:00")
        end = (now + timedelta(days=7)).strftime("%Y-%m-%dT23:59:59")
        resp = (
            supabase_admin.table("planned_workouts")
            .select("title, activity_type, start_time, status, description")
            .eq("user_id", user_id)
            .gte("start_time", start)
            .lte("start_time", end)
            .order("start_time", desc=False)
            .execute()
        )
        context["upcoming_workouts"] = resp.data or []
    except Exception as e:
        logger.warning(f"Failed to fetch upcoming workouts: {e}")
        context["upcoming_workouts"] = []

    # Recent daily logs (last 7 days)
    try:
        log_start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        log_end = now.strftime("%Y-%m-%d")
        resp = (
            supabase_admin.table("daily_logs")
            .select("date, sleep_total, deep_sleep, hrv_score, motivation, soreness, stress, body_weight_kg")
            .eq("user_id", user_id)
            .gte("date", log_start)
            .lte("date", log_end)
            .order("date", desc=False)
            .execute()
        )
        context["recent_daily_logs"] = resp.data or []
    except Exception as e:
        logger.warning(f"Failed to fetch daily logs: {e}")
        context["recent_daily_logs"] = []

    # Recent completed activities (last 7 days, summarized)
    try:
        act_start = (now - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00")
        act_end = now.strftime("%Y-%m-%dT23:59:59")
        resp = (
            supabase_admin.table("completed_activities")
            .select("start_time, distance_meters, moving_time_seconds, average_heartrate, total_elevation_gain")
            .eq("user_id", user_id)
            .gte("start_time", act_start)
            .lte("start_time", act_end)
            .order("start_time", desc=False)
            .execute()
        )
        activities = resp.data or []
        context["recent_activities"] = [
            {
                "start_time": a["start_time"],
                "distance_km": round(a["distance_meters"] / 1000, 2) if a.get("distance_meters") else None,
                "moving_time_min": round(a["moving_time_seconds"] / 60, 1) if a.get("moving_time_seconds") else None,
                "avg_hr": a.get("average_heartrate"),
                "elevation_m": a.get("total_elevation_gain"),
            }
            for a in activities
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch completed activities: {e}")
        context["recent_activities"] = []

    return context


def format_context_for_prompt(ctx: dict) -> str:
    """Convert context dict into a readable text block for the system prompt."""
    lines = []

    # Time
    lines.append(f"CURRENT TIME: {ctx['local_time']} ({ctx['day_of_week']})")
    lines.append(f"TIMEZONE: {ctx['timezone']} (UTC offset: {ctx['tz_offset']})")
    lines.append("")

    # Profile
    profile = ctx.get("profile", {})
    if profile.get("name"):
        lines.append(f"ATHLETE: {profile['name']}")

    # Training profile
    if ctx.get("training_goals"):
        lines.append(f"TRAINING GOALS: {ctx['training_goals']}")
    if ctx.get("target_race"):
        race_info = ctx["target_race"]
        if ctx.get("target_race_date"):
            race_info += f" (Date: {ctx['target_race_date']})"
        lines.append(f"TARGET RACE: {race_info}")
    if ctx.get("weekly_volume_target_hours"):
        lines.append(f"WEEKLY VOLUME TARGET: {ctx['weekly_volume_target_hours']} hours")
    if ctx.get("preferred_workout_time"):
        lines.append(f"PREFERRED WORKOUT TIME: {ctx['preferred_workout_time']}")
    if ctx.get("injury_notes"):
        lines.append(f"INJURY NOTES: {ctx['injury_notes']}")
    lines.append(f"STRAVA: {'Connected' if ctx.get('strava_connected') else 'Not connected'}")
    lines.append("")

    # Upcoming workouts
    workouts = ctx.get("upcoming_workouts", [])
    if workouts:
        lines.append("UPCOMING WORKOUTS (next 7 days):")
        for w in workouts:
            status = w.get("status", "planned")
            lines.append(f"  - {w['start_time']}: {w['title']} ({w['activity_type']}) [{status}]")
    else:
        lines.append("UPCOMING WORKOUTS: None scheduled in next 7 days")
    lines.append("")

    # Daily logs
    logs = ctx.get("recent_daily_logs", [])
    if logs:
        lines.append("RECENT DAILY LOGS (last 7 days):")
        for l in logs:
            parts = [f"Date: {l['date']}"]
            if l.get("sleep_total") is not None:
                parts.append(f"Sleep: {l['sleep_total']}h")
            if l.get("hrv_score") is not None:
                parts.append(f"HRV: {l['hrv_score']}")
            if l.get("soreness") is not None:
                parts.append(f"Soreness: {l['soreness']}/10")
            if l.get("motivation") is not None:
                parts.append(f"Motivation: {l['motivation']}/10")
            if l.get("stress") is not None:
                parts.append(f"Stress: {l['stress']}/10")
            lines.append(f"  - {' | '.join(parts)}")
    lines.append("")

    # Recent activities
    activities = ctx.get("recent_activities", [])
    if activities:
        lines.append("RECENT COMPLETED ACTIVITIES (last 7 days):")
        for a in activities:
            parts = [a["start_time"]]
            if a.get("distance_km"):
                parts.append(f"{a['distance_km']}km")
            if a.get("moving_time_min"):
                parts.append(f"{a['moving_time_min']}min")
            if a.get("avg_hr"):
                parts.append(f"HR:{a['avg_hr']}")
            lines.append(f"  - {' | '.join(parts)}")
    lines.append("")

    # Coach notes
    if ctx.get("coach_notes"):
        lines.append("COACH NOTES (your previous observations):")
        lines.append(ctx["coach_notes"])

    return "\n".join(lines)
