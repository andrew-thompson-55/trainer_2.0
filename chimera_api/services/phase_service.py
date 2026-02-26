import logging
from typing import Optional
from db_client import supabase_admin
from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def create_phase(data: dict, user_id: str) -> dict:
    row = {**data, "user_id": user_id}
    # Convert date objects to ISO strings
    for key in ("start_date", "end_date"):
        if key in row and hasattr(row[key], "isoformat"):
            row[key] = row[key].isoformat()
    if "parent_phase_id" in row and row["parent_phase_id"]:
        row["parent_phase_id"] = str(row["parent_phase_id"])

    response = supabase_admin.table("training_phases").insert(row).execute()
    return response.data[0]


async def get_phases(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list:
    query = supabase_admin.table("training_phases").select("*").eq("user_id", user_id)
    if start_date:
        query = query.gte("end_date", start_date)
    if end_date:
        query = query.lte("start_date", end_date)
    query = query.order("start_date", desc=False)
    response = query.execute()
    return response.data or []


async def get_phase(phase_id: str, user_id: str) -> dict:
    response = (
        supabase_admin.table("training_phases")
        .select("*")
        .eq("id", phase_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Phase not found")
    return response.data


async def update_phase(phase_id: str, updates: dict, user_id: str) -> dict:
    for key in ("start_date", "end_date"):
        if key in updates and hasattr(updates[key], "isoformat"):
            updates[key] = updates[key].isoformat()
    if "parent_phase_id" in updates and updates["parent_phase_id"]:
        updates["parent_phase_id"] = str(updates["parent_phase_id"])

    response = (
        supabase_admin.table("training_phases")
        .update(updates)
        .eq("id", phase_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Phase not found")
    return response.data[0]


async def delete_phase(phase_id: str, user_id: str):
    supabase_admin.table("training_phases").delete().eq(
        "id", phase_id
    ).eq("user_id", user_id).execute()
