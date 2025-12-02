from db_client import supabase_admin
from schemas import DailyLogCreate
from services.workout_service import HARDCODED_USER_ID


async def upsert_log(log_date: str, data: DailyLogCreate) -> dict:
    payload = data.model_dump(exclude_unset=True)
    payload["user_id"] = HARDCODED_USER_ID
    payload["date"] = log_date

    # Supabase "upsert" looks for conflict on (user_id, date)
    response = (
        supabase_admin.table("daily_logs")
        .upsert(payload, on_conflict="user_id,date")
        .execute()
    )

    return response.data[0]


async def get_log(log_date: str) -> dict:
    response = (
        supabase_admin.table("daily_logs")
        .select("*")
        .eq("user_id", HARDCODED_USER_ID)
        .eq("date", log_date)
        .execute()
    )

    if response.data:
        return response.data[0]
    return {}
