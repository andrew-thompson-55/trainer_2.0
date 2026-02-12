from typing import List, Optional
from uuid import UUID
from schemas import WorkoutCreate
from db_client import supabase_admin
from services import gcal_service
from fastapi import HTTPException


async def create_workout(workout: WorkoutCreate, user_id: str) -> dict:
    data = workout.model_dump()
    data["user_id"] = user_id

    # Convert datetimes to ISO strings for Supabase
    data["start_time"] = data["start_time"].isoformat()
    data["end_time"] = data["end_time"].isoformat()

    response = supabase_admin.table("planned_workouts").insert(data).execute()
    new_workout = response.data[0]

    # TRIGGER GCAL SYNC (Create)
    # We run this in a fire-and-forget manner effectively, or you could await it if you made it async
    # For now, synchronous call is fine given it's fast enough
    gcal_service.sync_workout_to_calendar(new_workout, is_new=True)

    return new_workout


async def get_workouts(
    user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None
) -> List[dict]:
    query = supabase_admin.table("planned_workouts").select("*").eq("user_id", user_id)

    if start_date and end_date:
        query = query.gte("start_time", start_date).lte("start_time", end_date)

    # Order by start time
    response = query.order("start_time", desc=False).execute()
    return response.data


async def get_workout(workout_id: UUID, user_id: str) -> dict:
    """
    Fetches a single workout by its unique ID.
    """
    response = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("id", str(workout_id))
        .eq("user_id", user_id)  # Security: Ensure it belongs to this user
        .single()  # Tells Supabase to return one object, not a list
        .execute()
    )

    # Supabase .single() raises an error if not found,
    # but depending on client version it might return None data.
    if not response.data:
        raise HTTPException(status_code=404, detail="Workout not found")

    return response.data


async def update_workout(workout_id: UUID, updates: dict, user_id: str) -> dict:
    # Ensure datetimes in updates are strings if they exist
    if "start_time" in updates and hasattr(updates["start_time"], "isoformat"):
        updates["start_time"] = updates["start_time"].isoformat()
    if "end_time" in updates and hasattr(updates["end_time"], "isoformat"):
        updates["end_time"] = updates["end_time"].isoformat()

    response = (
        supabase_admin.table("planned_workouts")
        .update(updates)
        .eq("id", str(workout_id))
        .eq("user_id", user_id)
        .execute()
    )

    if response.data:
        updated_workout = response.data[0]
        # TRIGGER GCAL SYNC (Update)
        gcal_service.sync_workout_to_calendar(updated_workout, is_new=False)
        return updated_workout

    return response.data[0] if response.data else {}


async def delete_workout(workout_id: UUID, user_id: str):
    # Fetch first to get GCal ID before we delete the record
    data = (
        supabase_admin.table("planned_workouts")
        .select("google_event_id")
        .eq("id", str(workout_id))
        .eq("user_id", user_id)
        .execute()
    )

    # Check if we have a google event to delete
    if data.data and data.data[0].get("google_event_id"):
        gcal_service.delete_calendar_event(data.data[0]["google_event_id"])

    # Now delete from DB
    supabase_admin.table("planned_workouts").delete().eq(
        "id", str(workout_id)
    ).eq("user_id", user_id).execute()


async def get_linked_activity(workout_id: UUID, user_id: str) -> dict:
    response = (
        supabase_admin.table("completed_activities")
        .select("*")
        .eq("planned_workout_id", str(workout_id))
        .execute()
    )
    if response.data:
        return response.data[0]
    return None
