import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from db_client import supabase_admin

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "America/New_York"


async def get_user_settings(user_id: str) -> dict:
    """Fetch user_settings row for a given user."""
    try:
        response = (
            supabase_admin.table("user_settings")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if response.data:
            return response.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch user settings: {e}")
    return {}


def get_user_timezone(settings: dict) -> ZoneInfo:
    """Extract ZoneInfo from settings dict, fallback to America/New_York."""
    tz_str = settings.get("timezone")
    if tz_str:
        try:
            return ZoneInfo(tz_str)
        except (KeyError, Exception):
            logger.warning(f"Invalid timezone '{tz_str}', using default")
    return ZoneInfo(DEFAULT_TIMEZONE)


def get_local_now(tz: ZoneInfo) -> datetime:
    """Return the current time in the given timezone."""
    return datetime.now(tz)


async def get_user_profile(user_id: str) -> dict:
    """Fetch user profile from users table."""
    try:
        response = (
            supabase_admin.table("users")
            .select("id, name, email")
            .eq("id", user_id)
            .execute()
        )
        if response.data:
            return response.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch user profile: {e}")
    return {}


async def update_coach_notes(user_id: str, note: str) -> dict:
    """Append a coach note to user_settings.coach_notes."""
    settings = await get_user_settings(user_id)
    existing_notes = settings.get("coach_notes") or ""
    timestamp = datetime.now(ZoneInfo(DEFAULT_TIMEZONE)).strftime("%Y-%m-%d")
    updated_notes = f"{existing_notes}\n[{timestamp}] {note}".strip()

    try:
        response = (
            supabase_admin.table("user_settings")
            .update({"coach_notes": updated_notes})
            .eq("user_id", user_id)
            .execute()
        )
        if response.data:
            return {"status": "success", "notes": updated_notes}
    except Exception as e:
        logger.warning(f"Failed to update coach notes: {e}")
    return {"status": "error", "message": "Failed to save coach note"}
