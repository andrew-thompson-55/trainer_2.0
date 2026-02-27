import logging
from datetime import datetime, timedelta, date as date_type
from typing import Optional, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from dependencies import get_current_user
from schemas import (
    PlanImportRequest,
    PhaseCreate,
    PhaseUpdate,
    TemplateCreate,
    MoveWorkoutRequest,
    DuplicateWorkoutRequest,
    WeekActionRequest,
    SaveWeekTemplateRequest,
    ApplyTemplateRequest,
)
from db_client import supabase_admin
from services import plan_action_service, phase_service, template_service, plan_import_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/plan", tags=["Plan"])


# --- Plan Import (flexible format) ---

@router.post("/import")
async def import_plan(
    raw_input: Any = Body(...),
    user_id: str = Depends(get_current_user),
):
    """
    Flexible plan import accepting multiple shapes:
    - Shape A: bare array of entries, e.g. [{date, title, ...}, ...]
    - Shape B: {entries: [...], distance_unit?: str}
    - Shape C: system format {workouts: [...], phases?: [...]}
    """
    try:
        return await plan_import_service.import_plan(user_id, raw_input)
    except Exception as e:
        logger.error(f"Plan import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


# --- Plan Export ---

@router.get("/export")
async def export_plan(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    user_id: str = Depends(get_current_user),
):
    """Export plan as system format JSON for a date range."""
    try:
        sd = date_type.fromisoformat(start_date)
        ed = date_type.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    return await plan_import_service.export_plan(user_id, sd, ed)


# --- Combined Calendar Data ---

@router.get("/calendar")
async def get_calendar_data(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    weeks: int = Query(5, ge=1, le=12),
    user_id: str = Depends(get_current_user),
):
    """Single fetch for the web training plan view."""
    return await plan_action_service.get_calendar_data(user_id, start_date, weeks)


# --- Workout Actions ---

@router.put("/workouts/{workout_id}/move")
async def move_workout(
    workout_id: UUID,
    body: MoveWorkoutRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.move_workout(str(workout_id), body.new_date, user_id)


@router.post("/workouts/{workout_id}/duplicate")
async def duplicate_workout(
    workout_id: UUID,
    body: DuplicateWorkoutRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.duplicate_workout(str(workout_id), body.target_date, user_id)


@router.delete("/workouts/{workout_id}")
async def delete_workout(
    workout_id: UUID,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.delete_workout(str(workout_id), user_id)


# --- Week Actions ---

@router.put("/weeks/move")
async def move_week(
    body: WeekActionRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.move_week(
        body.source_week_start, body.target_week_start, user_id
    )


@router.post("/weeks/duplicate")
async def duplicate_week(
    body: WeekActionRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.duplicate_week(
        body.source_week_start, body.target_week_start, user_id
    )


@router.delete("/weeks/{week_start}/clear")
async def clear_week(
    week_start: date_type,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.clear_week(week_start, user_id)


@router.post("/weeks/save-template")
async def save_week_as_template(
    body: SaveWeekTemplateRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.save_week_as_template(
        body.week_start, body.title, user_id
    )


# --- Phase CRUD ---

@router.get("/phases")
async def get_phases(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: str = Depends(get_current_user),
):
    return await phase_service.get_phases(user_id, start_date, end_date)


@router.post("/phases")
async def create_phase(
    body: PhaseCreate,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.create_phase(
        body.model_dump(exclude_unset=True), user_id
    )


@router.patch("/phases/{phase_id}")
async def update_phase(
    phase_id: UUID,
    body: PhaseUpdate,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.update_phase(
        str(phase_id), body.model_dump(exclude_unset=True), user_id
    )


@router.delete("/phases/{phase_id}")
async def delete_phase(
    phase_id: UUID,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.delete_phase(str(phase_id), user_id)


# --- Template CRUD + Apply ---

@router.get("/templates")
async def get_templates(
    type: Optional[str] = Query(None, alias="type"),
    user_id: str = Depends(get_current_user),
):
    return await template_service.get_templates(user_id, type)


@router.post("/templates")
async def create_template(
    body: TemplateCreate,
    user_id: str = Depends(get_current_user),
):
    return await template_service.create_template(
        body.model_dump(), user_id
    )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: UUID,
    user_id: str = Depends(get_current_user),
):
    await template_service.delete_template(str(template_id), user_id)
    return {"status": "deleted"}


@router.post("/templates/{template_id}/apply")
async def apply_template(
    template_id: UUID,
    body: ApplyTemplateRequest,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.apply_template(
        str(template_id), body.start_date, body.detail_level, user_id
    )


# --- Agent Action Log ---

@router.get("/agent-actions")
async def get_agent_actions(
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.get_agent_actions(user_id, limit)


@router.post("/agent-actions/{action_id}/revert")
async def revert_agent_action(
    action_id: UUID,
    user_id: str = Depends(get_current_user),
):
    return await plan_action_service.revert_agent_action(str(action_id), user_id)
