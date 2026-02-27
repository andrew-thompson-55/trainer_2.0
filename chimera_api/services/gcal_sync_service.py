import time
import logging
from datetime import datetime, timedelta, timezone
from db_client import supabase_admin
from services.gcal_service import sync_workout_to_calendar

logger = logging.getLogger(__name__)

BATCH_SIZE = 10
BATCH_DELAY = 0.5  # seconds between batches


async def resync_all(user_id: str) -> dict:
    """
    Resync all workouts (past 30 days + future) to Google Calendar.
    Creates events for workouts missing google_event_id, updates existing ones.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    result = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", user_id)
        .gte("start_time", cutoff)
        .order("start_time", desc=False)
        .execute()
    )

    workouts = result.data or []
    counts = {"created": 0, "updated": 0, "errors": 0, "total": len(workouts)}

    for i in range(0, len(workouts), BATCH_SIZE):
        batch = workouts[i : i + BATCH_SIZE]

        for workout in batch:
            try:
                is_new = not workout.get("google_event_id")
                sync_workout_to_calendar(workout, is_new=is_new)
                if is_new:
                    counts["created"] += 1
                else:
                    counts["updated"] += 1
            except Exception as e:
                logger.error(f"⚠️ Resync failed for workout {workout.get('id')}: {e}")
                counts["errors"] += 1

        # Rate-limit between batches
        if i + BATCH_SIZE < len(workouts):
            time.sleep(BATCH_DELAY)

    logger.info(f"GCal resync complete for user {user_id}: {counts}")
    return counts
