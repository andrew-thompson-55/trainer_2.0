import logging
from db_client import supabase_admin

logger = logging.getLogger(__name__)


async def initialize_tracked_types(user_id: str) -> list[str]:
    """Query distinct original_activity_type from completed_activities,
    set all as tracked in user_settings. Only runs if tracked_activity_types is empty."""
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("tracked_activity_types")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    existing = (settings_resp.data or [{}])[0].get("tracked_activity_types") or []
    if existing:
        return existing

    # Get distinct types from completed activities
    activities_resp = (
        supabase_admin.table("completed_activities")
        .select("original_activity_type")
        .eq("user_id", user_id)
        .not_.is_("original_activity_type", "null")
        .execute()
    )
    types = sorted(set(
        a["original_activity_type"]
        for a in (activities_resp.data or [])
        if a.get("original_activity_type")
    ))

    if types:
        supabase_admin.table("user_settings").update(
            {"tracked_activity_types": types}
        ).eq("user_id", user_id).execute()

    return types


def is_activity_included(activity: dict, tracked_types: list[str]) -> bool:
    """In-memory filter: determine if an activity should count toward stats.

    When tracked_types is empty, no filtering is configured — include everything.
    Activities without original_activity_type (pre-migration) are also included.
    """
    if activity.get("stats_override"):
        return not activity.get("stats_excluded", False)
    if not tracked_types:
        return True
    original_type = activity.get("original_activity_type")
    if not original_type:
        return True
    return original_type in tracked_types


async def get_activities_for_stats(
    user_id: str, start_date: str, end_date: str
) -> list[dict]:
    """Fetch completed activities filtered by tracked types and overrides."""
    # Get tracked types
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("tracked_activity_types")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    tracked_types = (settings_resp.data or [{}])[0].get("tracked_activity_types") or []

    # Fetch all activities in range
    activities_resp = (
        supabase_admin.table("completed_activities")
        .select("*")
        .eq("user_id", user_id)
        .gte("start_time", start_date)
        .lte("start_time", end_date)
        .order("start_time", desc=True)
        .execute()
    )
    all_activities = activities_resp.data or []

    return [a for a in all_activities if is_activity_included(a, tracked_types)]


async def toggle_activity_stats(
    user_id: str, activity_id: str, include: bool
) -> dict:
    """Set per-activity stats override. Clears override when matching global default."""
    # Fetch the activity
    activity_resp = (
        supabase_admin.table("completed_activities")
        .select("original_activity_type")
        .eq("id", activity_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not activity_resp.data:
        raise Exception(f"Activity {activity_id} not found")

    activity = activity_resp.data[0]

    # Fetch tracked types
    settings_resp = (
        supabase_admin.table("user_settings")
        .select("tracked_activity_types")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    tracked_types = (settings_resp.data or [{}])[0].get("tracked_activity_types") or []

    # Determine if the override matches the global default
    globally_included = activity.get("original_activity_type") in tracked_types

    if include == globally_included:
        # Clear override — matches global default
        update = {"stats_override": False, "stats_excluded": False}
    else:
        # Set override
        update = {"stats_override": True, "stats_excluded": not include}

    supabase_admin.table("completed_activities").update(
        update
    ).eq("id", activity_id).eq("user_id", user_id).execute()

    return {"status": "updated", "stats_included": include}


async def auto_add_new_type(user_id: str, activity_type: str):
    """Check if activity type is new to the user, add to tracked list if so."""
    if not activity_type:
        return

    try:
        settings_resp = (
            supabase_admin.table("user_settings")
            .select("tracked_activity_types")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        tracked = (settings_resp.data or [{}])[0].get("tracked_activity_types") or []

        if activity_type not in tracked:
            updated = sorted(tracked + [activity_type])
            supabase_admin.table("user_settings").update(
                {"tracked_activity_types": updated}
            ).eq("user_id", user_id).execute()
            logger.info(f"Auto-added activity type '{activity_type}' for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to auto-add activity type: {e}")
