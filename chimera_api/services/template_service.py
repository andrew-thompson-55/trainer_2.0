import logging
from typing import Optional
from db_client import supabase_admin
from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def create_template(data: dict, user_id: str) -> dict:
    row = {**data, "user_id": user_id}
    response = supabase_admin.table("plan_templates").insert(row).execute()
    return response.data[0]


async def get_templates(user_id: str, template_type: Optional[str] = None) -> list:
    query = supabase_admin.table("plan_templates").select("*").eq("user_id", user_id)
    if template_type:
        query = query.eq("template_type", template_type)
    query = query.order("created_at", desc=True)
    response = query.execute()
    return response.data or []


async def get_template(template_id: str, user_id: str) -> dict:
    response = (
        supabase_admin.table("plan_templates")
        .select("*")
        .eq("id", template_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return response.data


async def delete_template(template_id: str, user_id: str):
    supabase_admin.table("plan_templates").delete().eq(
        "id", template_id
    ).eq("user_id", user_id).execute()
