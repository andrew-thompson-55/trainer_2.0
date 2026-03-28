import logging
from typing import Optional
from db_client import supabase_admin
from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def create_race(data: dict, user_id: str) -> dict:
    row = {**data, "user_id": user_id}
    if "date" in row and hasattr(row["date"], "isoformat"):
        row["date"] = row["date"].isoformat()

    response = supabase_admin.table("races").insert(row).execute()
    return response.data[0]


async def get_races(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list:
    query = supabase_admin.table("races").select("*").eq("user_id", user_id)
    if start_date:
        query = query.gte("date", start_date)
    if end_date:
        query = query.lte("date", end_date)
    query = query.order("date", desc=False)
    response = query.execute()
    return response.data or []


async def get_race(race_id: str, user_id: str) -> dict:
    response = (
        supabase_admin.table("races")
        .select("*")
        .eq("id", race_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Race not found")
    return response.data


async def update_race(race_id: str, updates: dict, user_id: str) -> dict:
    if "date" in updates and hasattr(updates["date"], "isoformat"):
        updates["date"] = updates["date"].isoformat()

    response = (
        supabase_admin.table("races")
        .update(updates)
        .eq("id", race_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Race not found")
    return response.data[0]


async def delete_race(race_id: str, user_id: str):
    supabase_admin.table("races").delete().eq(
        "id", race_id
    ).eq("user_id", user_id).execute()
