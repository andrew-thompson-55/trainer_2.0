from typing import List, Optional
from uuid import UUID
from schemas import WorkoutCreate, WorkoutResponse
from db_client import supabase_admin

# TODO: Replace with your actual User UUID from Supabase Authentication > Users
# For now, we hardcode it to bypass the need for a Login screen in the app immediately.
HARDCODED_USER_ID = "dc43c3a8-9d6a-4bc1-83da-68e7a5bfca89"


async def create_workout(workout: WorkoutCreate) -> dict:
    data = workout.model_dump()
    data["user_id"] = HARDCODED_USER_ID

    # Convert datetimes to ISO strings for Supabase
    data["start_time"] = data["start_time"].isoformat()
    data["end_time"] = data["end_time"].isoformat()

    response = supabase_admin.table("planned_workouts").insert(data).execute()
    return response.data[0]


async def get_workouts(
    start_date: Optional[str] = None, end_date: Optional[str] = None
) -> List[dict]:
    query = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
    )

    if start_date and end_date:
        query = query.gte("start_time", start_date).lte("start_time", end_date)

    # Order by start time
    response = query.order("start_time", desc=False).execute()
    return response.data


async def update_workout(workout_id: UUID, updates: dict) -> dict:
    response = (
        supabase_admin.table("planned_workouts")
        .update(updates)
        .eq("id", str(workout_id))
        .execute()
    )
    return response.data[0]


async def delete_workout(workout_id: UUID):
    supabase_admin.table("planned_workouts").delete().eq(
        "id", str(workout_id)
    ).execute()
