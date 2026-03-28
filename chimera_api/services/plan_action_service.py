import logging
from datetime import datetime, timedelta, date as date_type
from typing import Optional
from uuid import UUID

from db_client import supabase_admin
from services import workout_service, gcal_service
from services import phase_service, template_service, race_service
from schemas import WorkoutCreate
from fastapi import HTTPException

logger = logging.getLogger(__name__)


# --- Agent Action Logging ---

async def _log_agent_action(
    user_id: str,
    action_type: str,
    description: str,
    snapshot_before=None,
    snapshot_after=None,
    affected_table: str = None,
    affected_ids: list = None,
):
    row = {
        "user_id": user_id,
        "action_type": action_type,
        "description": description,
        "snapshot_before": snapshot_before,
        "snapshot_after": snapshot_after,
        "affected_table": affected_table,
        "affected_ids": [str(i) for i in (affected_ids or [])],
    }
    try:
        supabase_admin.table("agent_actions").insert(row).execute()
    except Exception as e:
        logger.error(f"⚠️ Failed to log agent action: {e}")


# --- Workout Actions ---

async def move_workout(
    workout_id: str, new_date: date_type, user_id: str, source: str = "user"
) -> dict:
    workout = await workout_service.get_workout(UUID(workout_id), user_id)
    snapshot_before = dict(workout)

    old_start = datetime.fromisoformat(workout["start_time"].replace("Z", "+00:00"))
    old_end = datetime.fromisoformat(workout["end_time"].replace("Z", "+00:00"))
    duration = old_end - old_start

    new_start = old_start.replace(year=new_date.year, month=new_date.month, day=new_date.day)
    new_end = new_start + duration

    updated = await workout_service.update_workout(
        UUID(workout_id),
        {"start_time": new_start.isoformat(), "end_time": new_end.isoformat()},
        user_id,
    )

    if source == "agent":
        await _log_agent_action(
            user_id, "move_workout",
            f"Moved '{workout['title']}' from {old_start.date()} to {new_date}",
            snapshot_before=snapshot_before,
            snapshot_after=updated,
            affected_table="planned_workouts",
            affected_ids=[workout_id],
        )

    return updated


async def duplicate_workout(
    workout_id: str, target_date: date_type, user_id: str, source: str = "user"
) -> dict:
    workout = await workout_service.get_workout(UUID(workout_id), user_id)

    old_start = datetime.fromisoformat(workout["start_time"].replace("Z", "+00:00"))
    old_end = datetime.fromisoformat(workout["end_time"].replace("Z", "+00:00"))
    duration = old_end - old_start

    new_start = old_start.replace(year=target_date.year, month=target_date.month, day=target_date.day)
    new_end = new_start + duration

    new_workout = WorkoutCreate(
        title=workout["title"],
        description=workout.get("description"),
        activity_type=workout["activity_type"],
        start_time=new_start,
        end_time=new_end,
        status="planned",
    )
    result = await workout_service.create_workout(new_workout, user_id)

    if source == "agent":
        await _log_agent_action(
            user_id, "duplicate_workout",
            f"Duplicated '{workout['title']}' to {target_date}",
            snapshot_before=dict(workout),
            snapshot_after=result,
            affected_table="planned_workouts",
            affected_ids=[result["id"]],
        )

    return result


async def delete_workout(
    workout_id: str, user_id: str, source: str = "user"
) -> dict:
    workout = await workout_service.get_workout(UUID(workout_id), user_id)
    snapshot_before = dict(workout)

    await workout_service.delete_workout(UUID(workout_id), user_id)

    if source == "agent":
        await _log_agent_action(
            user_id, "delete_workout",
            f"Deleted '{workout['title']}'",
            snapshot_before=snapshot_before,
            affected_table="planned_workouts",
            affected_ids=[workout_id],
        )

    return {"status": "deleted", "id": workout_id}


# --- Week Actions ---

def _get_week_range(week_start: date_type):
    start = datetime.combine(week_start, datetime.min.time())
    end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return start.isoformat(), end.isoformat()


async def _get_week_workouts(week_start: date_type, user_id: str) -> list:
    start_str, end_str = _get_week_range(week_start)
    return await workout_service.get_workouts(user_id, start_str, end_str)


async def move_week(
    source_week_start: date_type,
    target_week_start: date_type,
    user_id: str,
    source: str = "user",
) -> dict:
    workouts = await _get_week_workouts(source_week_start, user_id)
    if not workouts:
        return {"status": "no_workouts", "moved": 0}

    day_offset = (target_week_start - source_week_start).days
    moved_ids = []

    for w in workouts:
        old_start = datetime.fromisoformat(w["start_time"].replace("Z", "+00:00"))
        old_end = datetime.fromisoformat(w["end_time"].replace("Z", "+00:00"))
        new_start = old_start + timedelta(days=day_offset)
        new_end = old_end + timedelta(days=day_offset)

        await workout_service.update_workout(
            UUID(w["id"]),
            {"start_time": new_start.isoformat(), "end_time": new_end.isoformat()},
            user_id,
        )
        moved_ids.append(w["id"])

    if source == "agent":
        await _log_agent_action(
            user_id, "move_week",
            f"Moved week {source_week_start} → {target_week_start} ({len(moved_ids)} workouts)",
            snapshot_before=[dict(w) for w in workouts],
            affected_table="planned_workouts",
            affected_ids=moved_ids,
        )

    return {"status": "success", "moved": len(moved_ids)}


async def duplicate_week(
    source_week_start: date_type,
    target_week_start: date_type,
    user_id: str,
    source: str = "user",
) -> dict:
    workouts = await _get_week_workouts(source_week_start, user_id)
    if not workouts:
        return {"status": "no_workouts", "duplicated": 0}

    day_offset = (target_week_start - source_week_start).days
    new_ids = []

    for w in workouts:
        old_start = datetime.fromisoformat(w["start_time"].replace("Z", "+00:00"))
        old_end = datetime.fromisoformat(w["end_time"].replace("Z", "+00:00"))
        new_start = old_start + timedelta(days=day_offset)
        new_end = old_end + timedelta(days=day_offset)

        new_workout = WorkoutCreate(
            title=w["title"],
            description=w.get("description"),
            activity_type=w["activity_type"],
            start_time=new_start,
            end_time=new_end,
            status="planned",
        )
        result = await workout_service.create_workout(new_workout, user_id)
        new_ids.append(result["id"])

    if source == "agent":
        await _log_agent_action(
            user_id, "duplicate_week",
            f"Duplicated week {source_week_start} → {target_week_start} ({len(new_ids)} workouts)",
            snapshot_before=[dict(w) for w in workouts],
            affected_table="planned_workouts",
            affected_ids=new_ids,
        )

    return {"status": "success", "duplicated": len(new_ids)}


async def clear_week(
    week_start: date_type, user_id: str, source: str = "user"
) -> dict:
    workouts = await _get_week_workouts(week_start, user_id)
    if not workouts:
        return {"status": "no_workouts", "deleted": 0}

    snapshot = [dict(w) for w in workouts]
    deleted_ids = []

    for w in workouts:
        await workout_service.delete_workout(UUID(w["id"]), user_id)
        deleted_ids.append(w["id"])

    if source == "agent":
        await _log_agent_action(
            user_id, "clear_week",
            f"Cleared week of {week_start} ({len(deleted_ids)} workouts)",
            snapshot_before=snapshot,
            affected_table="planned_workouts",
            affected_ids=deleted_ids,
        )

    return {"status": "success", "deleted": len(deleted_ids)}


# --- Save Week as Template ---

async def save_week_as_template(
    week_start: date_type, title: str, user_id: str
) -> dict:
    workouts = await _get_week_workouts(week_start, user_id)
    if not workouts:
        raise HTTPException(status_code=400, detail="No workouts found in that week")

    # Store workouts as relative day offsets (0=Monday, 6=Sunday)
    content_workouts = []
    for w in workouts:
        start = datetime.fromisoformat(w["start_time"].replace("Z", "+00:00"))
        day_offset = (start.date() - week_start).days
        content_workouts.append({
            "day_offset": day_offset,
            "title": w["title"],
            "activity_type": w["activity_type"],
            "description": w.get("description"),
            "time_of_day": start.strftime("%H:%M"),
            "duration_minutes": int(
                (
                    datetime.fromisoformat(w["end_time"].replace("Z", "+00:00")) - start
                ).total_seconds() / 60
            ),
        })

    template_data = {
        "title": title,
        "template_type": "week",
        "content": {"workouts": content_workouts},
    }
    return await template_service.create_template(template_data, user_id)


# --- Phase Actions (delegate to phase_service, with optional agent logging) ---

async def create_phase(data: dict, user_id: str, source: str = "user") -> dict:
    result = await phase_service.create_phase(data, user_id)
    if source == "agent":
        await _log_agent_action(
            user_id, "create_phase",
            f"Created phase '{data.get('title', '')}'",
            snapshot_after=result,
            affected_table="training_phases",
            affected_ids=[result["id"]],
        )
    return result


async def update_phase(
    phase_id: str, updates: dict, user_id: str, source: str = "user"
) -> dict:
    before = await phase_service.get_phase(phase_id, user_id)
    result = await phase_service.update_phase(phase_id, updates, user_id)
    if source == "agent":
        await _log_agent_action(
            user_id, "update_phase",
            f"Updated phase '{before.get('title', '')}'",
            snapshot_before=before,
            snapshot_after=result,
            affected_table="training_phases",
            affected_ids=[phase_id],
        )
    return result


async def delete_phase(phase_id: str, user_id: str, source: str = "user"):
    before = await phase_service.get_phase(phase_id, user_id)
    await phase_service.delete_phase(phase_id, user_id)
    if source == "agent":
        await _log_agent_action(
            user_id, "delete_phase",
            f"Deleted phase '{before.get('title', '')}'",
            snapshot_before=before,
            affected_table="training_phases",
            affected_ids=[phase_id],
        )
    return {"status": "deleted", "id": phase_id}


# --- Template Application ---

async def apply_template(
    template_id: str,
    start_date: date_type,
    detail_level: str,
    user_id: str,
    source: str = "user",
) -> dict:
    tmpl = await template_service.get_template(template_id, user_id)
    content = tmpl.get("content", {})
    created_ids = []

    if tmpl["template_type"] == "week":
        for w in content.get("workouts", []):
            day = start_date + timedelta(days=w.get("day_offset", 0))
            hour, minute = (w.get("time_of_day") or "08:00").split(":")
            start_dt = datetime.combine(day, datetime.min.time().replace(hour=int(hour), minute=int(minute)))
            duration = w.get("duration_minutes", 60)
            end_dt = start_dt + timedelta(minutes=duration)

            desc = w.get("description") if detail_level == "full" else None

            workout_data = WorkoutCreate(
                title=w["title"],
                description=desc,
                activity_type=w.get("activity_type", "other"),
                start_time=start_dt,
                end_time=end_dt,
                status="planned",
            )
            result = await workout_service.create_workout(workout_data, user_id)
            # Link back to template source
            supabase_admin.table("planned_workouts").update(
                {"template_source_id": template_id}
            ).eq("id", result["id"]).execute()
            created_ids.append(result["id"])

    elif tmpl["template_type"] == "workout":
        w = content
        start_dt = datetime.combine(start_date, datetime.min.time().replace(hour=8))
        duration = w.get("duration_minutes", 60)
        end_dt = start_dt + timedelta(minutes=duration)

        desc = w.get("description") if detail_level == "full" else None

        workout_data = WorkoutCreate(
            title=w.get("title", tmpl["title"]),
            description=desc,
            activity_type=w.get("activity_type", "other"),
            start_time=start_dt,
            end_time=end_dt,
            status="planned",
        )
        result = await workout_service.create_workout(workout_data, user_id)
        supabase_admin.table("planned_workouts").update(
            {"template_source_id": template_id}
        ).eq("id", result["id"]).execute()
        created_ids.append(result["id"])

    if source == "agent":
        await _log_agent_action(
            user_id, "apply_template",
            f"Applied template '{tmpl['title']}' starting {start_date}",
            snapshot_after={"template_id": template_id, "created_ids": [str(i) for i in created_ids]},
            affected_table="planned_workouts",
            affected_ids=created_ids,
        )

    return {"status": "success", "created": len(created_ids), "ids": created_ids}


# --- Agent Action Management ---

async def get_agent_actions(user_id: str, limit: int = 20) -> list:
    response = (
        supabase_admin.table("agent_actions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


async def revert_agent_action(action_id: str, user_id: str) -> dict:
    response = (
        supabase_admin.table("agent_actions")
        .select("*")
        .eq("id", action_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Agent action not found")

    action = response.data
    if action.get("reverted"):
        raise HTTPException(status_code=400, detail="Action already reverted")

    snapshot = action.get("snapshot_before")
    table = action.get("affected_table")
    affected_ids = action.get("affected_ids", [])

    if not snapshot or not table:
        raise HTTPException(status_code=400, detail="Cannot revert: no snapshot data")

    # Restore based on action type
    if action["action_type"] in ("move_workout", "update_workout"):
        if isinstance(snapshot, dict) and "id" in snapshot:
            restore = {k: v for k, v in snapshot.items() if k not in ("id", "user_id", "created_at")}
            supabase_admin.table(table).update(restore).eq("id", snapshot["id"]).eq("user_id", user_id).execute()

    elif action["action_type"] in ("delete_workout", "clear_week", "delete_phase"):
        # Re-insert deleted records
        if isinstance(snapshot, list):
            for record in snapshot:
                record.pop("id", None)  # Let DB generate new ID
                supabase_admin.table(table).insert(record).execute()
        elif isinstance(snapshot, dict):
            snapshot.pop("id", None)
            supabase_admin.table(table).insert(snapshot).execute()

    elif action["action_type"] in ("duplicate_workout", "duplicate_week", "create_phase", "apply_template"):
        # Delete the created records
        for aid in affected_ids:
            supabase_admin.table(table).delete().eq("id", aid).eq("user_id", user_id).execute()

    elif action["action_type"] in ("move_week",):
        # Restore all workouts to their original state
        if isinstance(snapshot, list):
            for record in snapshot:
                wid = record.get("id")
                if wid:
                    restore = {k: v for k, v in record.items() if k not in ("id", "user_id", "created_at")}
                    supabase_admin.table(table).update(restore).eq("id", wid).eq("user_id", user_id).execute()

    elif action["action_type"] == "update_phase":
        if isinstance(snapshot, dict) and "id" in snapshot:
            restore = {k: v for k, v in snapshot.items() if k not in ("id", "user_id", "created_at")}
            supabase_admin.table(table).update(restore).eq("id", snapshot["id"]).eq("user_id", user_id).execute()

    # Mark as reverted
    supabase_admin.table("agent_actions").update(
        {"reverted": True, "reverted_at": datetime.now().isoformat()}
    ).eq("id", action_id).execute()

    return {"status": "reverted", "action_id": action_id}


# --- Calendar Data (Combined fetch for web view) ---

async def get_calendar_data(
    user_id: str, start_date: str, weeks: int = 5
) -> dict:
    from datetime import date as dt_date

    start = dt_date.fromisoformat(start_date)
    end = start + timedelta(weeks=weeks) - timedelta(days=1)
    start_str = f"{start.isoformat()}T00:00:00"
    end_str = f"{end.isoformat()}T23:59:59"

    # Fetch all three in sequence (Supabase client is sync)
    workouts = await workout_service.get_workouts(user_id, start_str, end_str)
    phases = await phase_service.get_phases(user_id, start.isoformat(), end.isoformat())

    # Fetch completed activities in range
    try:
        activities_resp = (
            supabase_admin.table("completed_activities")
            .select("id, start_time, original_activity_type, distance_meters, moving_time_seconds, planned_workout_id, source_type, total_elevation_gain")
            .eq("user_id", user_id)
            .gte("start_time", start_str)
            .lte("start_time", end_str)
            .order("start_time", desc=False)
            .execute()
        )
        activities = activities_resp.data or []
    except Exception as e:
        logger.error(f"⚠️ Failed to fetch activities for calendar: {e}")
        activities = []

    # Fetch races in range
    try:
        races = await race_service.get_races(user_id, start.isoformat(), end.isoformat())
    except Exception as e:
        logger.error(f"⚠️ Failed to fetch races for calendar: {e}")
        races = []

    return {
        "phases": phases,
        "workouts": workouts,
        "activities": activities,
        "races": races,
    }
