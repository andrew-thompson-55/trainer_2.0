import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from schemas import PlanImportRequest
from db_client import supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/plan", tags=["Plan"])


@router.post("/import")
async def import_plan(
    request: PlanImportRequest,
    user_id: str = Depends(get_current_user),
):
    """Bulk import planned workouts."""
    rows = []
    for w in request.workouts:
        start = datetime.combine(w.date, datetime.min.time().replace(hour=8))
        duration = timedelta(minutes=w.target_duration_minutes or 60)
        desc_parts = []
        if w.description:
            desc_parts.append(w.description)
        if w.target_notes:
            desc_parts.append(w.target_notes)

        rows.append({
            "user_id": user_id,
            "title": w.title,
            "activity_type": w.activity_type,
            "start_time": start.isoformat(),
            "end_time": (start + duration).isoformat(),
            "description": "\n".join(desc_parts) if desc_parts else None,
            "status": "planned",
        })

    try:
        resp = supabase_admin.table("planned_workouts").insert(rows).execute()
        return {"imported": len(resp.data or []), "workouts": resp.data}
    except Exception as e:
        logger.error(f"Plan import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
