from db_client import supabase_admin
from schemas import DailyLogCreate


async def upsert_log(log_date: str, data: DailyLogCreate, user_id: str) -> dict:
    payload = data.model_dump(exclude_unset=True)
    payload["user_id"] = user_id
    payload["date"] = log_date

    # Supabase "upsert" looks for conflict on (user_id, date)
    response = (
        supabase_admin.table("daily_logs")
        .upsert(payload, on_conflict="user_id,date")
        .execute()
    )

    return response.data[0]


async def get_log(log_date: str, user_id: str) -> dict:
    response = (
        supabase_admin.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", log_date)
        .execute()
    )

    if response.data:
        return response.data[0]
    return {}
