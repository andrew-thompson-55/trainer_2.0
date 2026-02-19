import logging
from datetime import datetime, timedelta
from services import workout_service
from services.user_settings_service import update_coach_notes
from schemas import WorkoutCreate
from db_client import supabase_admin

logger = logging.getLogger(__name__)

# --- TOOL DEFINITIONS ---
tools_schema = [
    {
        "function_declarations": [
            {
                "name": "create_workout",
                "description": "Add a new workout to the user's training plan.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "activity_type": {
                            "type": "string",
                            "enum": ["run", "bike", "swim", "strength", "other"],
                        },
                        "start_time_iso": {
                            "type": "string",
                            "description": "ISO 8601 format (YYYY-MM-DDTHH:MM:SS).",
                        },
                        "duration_minutes": {"type": "integer"},
                        "description": {"type": "string"},
                    },
                    "required": ["title", "activity_type", "start_time_iso"],
                },
            },
            {
                "name": "update_workout",
                "description": "Modify an existing workout. You must identify it by its CURRENT date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_date_iso": {
                            "type": "string",
                            "description": "The CURRENT date of the workout to find (YYYY-MM-DD).",
                        },
                        "new_title": {"type": "string"},
                        "new_start_time_iso": {
                            "type": "string",
                            "description": "The NEW start time if changing.",
                        },
                        "new_description": {"type": "string"},
                        "new_status": {
                            "type": "string",
                            "enum": ["planned", "completed", "missed"],
                        },
                    },
                    "required": ["target_date_iso"],
                },
            },
            {
                "name": "delete_workout",
                "description": "Remove a workout from the plan.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_date_iso": {
                            "type": "string",
                            "description": "The date of the workout to delete (YYYY-MM-DD).",
                        },
                        "activity_type": {
                            "type": "string",
                            "description": "Optional: 'run' or 'bike' to help identify the specific workout.",
                        },
                    },
                    "required": ["target_date_iso"],
                },
            },
            {
                "name": "get_upcoming_workouts",
                "description": "Query the user's planned workouts within a date range. Use this to check their schedule before making changes.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {
                            "type": "string",
                            "description": "Start of range (YYYY-MM-DD). Defaults to today.",
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End of range (YYYY-MM-DD). Defaults to 7 days from start.",
                        },
                    },
                },
            },
            {
                "name": "get_daily_logs",
                "description": "Query the user's daily wellness logs (sleep, HRV, soreness, motivation) for a date range.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {
                            "type": "string",
                            "description": "Start of range (YYYY-MM-DD).",
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End of range (YYYY-MM-DD). Defaults to today.",
                        },
                    },
                    "required": ["start_date"],
                },
            },
            {
                "name": "get_completed_activities",
                "description": "Query the user's completed activities (from Strava or manual entry) with summarized metrics.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {
                            "type": "string",
                            "description": "Start of range (YYYY-MM-DD).",
                        },
                        "end_date": {
                            "type": "string",
                            "description": "End of range (YYYY-MM-DD). Defaults to today.",
                        },
                        "activity_type": {
                            "type": "string",
                            "description": "Filter by type: run, bike, swim, strength, other.",
                        },
                    },
                    "required": ["start_date"],
                },
            },
            {
                "name": "get_training_summary",
                "description": "Get an aggregated training summary: completion rate, missed workouts, activity counts over a period.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Number of days to look back. Defaults to 7.",
                        },
                    },
                },
            },
            {
                "name": "save_coach_note",
                "description": "Save an observation or note about the athlete for future reference. Use this to remember important patterns, concerns, or decisions across sessions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "note": {
                            "type": "string",
                            "description": "The coaching observation to save.",
                        },
                    },
                    "required": ["note"],
                },
            },
        ]
    }
]


# --- HELPER: Find Workout by Date ---
async def _find_workout_on_day(date_iso: str, user_id: str, activity_type: str = None):
    target_date = datetime.fromisoformat(date_iso.split("T")[0])
    start_range = target_date.replace(hour=0, minute=0, second=0).isoformat()
    end_range = target_date.replace(hour=23, minute=59, second=59).isoformat()

    workouts = await workout_service.get_workouts(
        user_id=user_id, start_date=start_range, end_date=end_range
    )

    if not workouts:
        return None

    if activity_type:
        filtered = [w for w in workouts if w["activity_type"] == activity_type]
        if filtered:
            return filtered[0]

    return workouts[0]


# --- EXECUTION LOGIC ---
async def execute_tool_call(function_name, args, user_id: str):
    logger.info(f"Tool Execution: {function_name} | Args: {args}")

    # 1. CREATE
    if function_name == "create_workout":
        start_dt = datetime.fromisoformat(args["start_time_iso"])
        duration = args.get("duration_minutes", 60)
        end_dt = start_dt + timedelta(minutes=duration)

        workout_data = WorkoutCreate(
            title=args["title"],
            description=args.get("description", "AI Generated"),
            activity_type=args["activity_type"],
            start_time=start_dt,
            end_time=end_dt,
            status="planned",
        )
        result = await workout_service.create_workout(workout_data, user_id)
        return {
            "status": "success",
            "action": "created",
            "workout": {
                "id": result["id"],
                "title": result["title"],
                "start_time": result["start_time"],
                "activity_type": result["activity_type"],
            },
        }

    # 2. UPDATE
    elif function_name == "update_workout":
        target = await _find_workout_on_day(args["target_date_iso"], user_id)
        if not target:
            return {"status": "error", "message": "No workout found on that date to update."}

        updates = {}
        if "new_title" in args:
            updates["title"] = args["new_title"]
        if "new_description" in args:
            updates["description"] = args["new_description"]
        if "new_status" in args:
            updates["status"] = args["new_status"]
        if "new_start_time_iso" in args:
            old_start = datetime.fromisoformat(target["start_time"])
            old_end = datetime.fromisoformat(target["end_time"])
            duration = old_end - old_start

            new_start = datetime.fromisoformat(args["new_start_time_iso"])
            new_end = new_start + duration

            updates["start_time"] = new_start.isoformat()
            updates["end_time"] = new_end.isoformat()

        if not updates:
            return {"status": "error", "message": "No changes requested."}

        await workout_service.update_workout(target["id"], updates, user_id)
        return {
            "status": "success",
            "action": "updated",
            "workout": {"id": target["id"], "title": target["title"]},
        }

    # 3. DELETE
    elif function_name == "delete_workout":
        target = await _find_workout_on_day(
            args["target_date_iso"], user_id, args.get("activity_type")
        )
        if not target:
            return {"status": "error", "message": "No workout found on that date to delete."}

        await workout_service.delete_workout(target["id"], user_id)
        return {
            "status": "success",
            "action": "deleted",
            "workout": {"id": target["id"], "title": target["title"]},
        }

    # 4. GET UPCOMING WORKOUTS
    elif function_name == "get_upcoming_workouts":
        start = args.get("start_date", datetime.now().strftime("%Y-%m-%d"))
        end = args.get("end_date")
        if not end:
            end_dt = datetime.fromisoformat(start) + timedelta(days=7)
            end = end_dt.strftime("%Y-%m-%d")

        start_range = f"{start}T00:00:00"
        end_range = f"{end}T23:59:59"
        workouts = await workout_service.get_workouts(user_id, start_range, end_range)

        return {
            "status": "success",
            "count": len(workouts),
            "workouts": [
                {
                    "id": w["id"],
                    "title": w["title"],
                    "activity_type": w["activity_type"],
                    "start_time": w["start_time"],
                    "status": w["status"],
                    "description": w.get("description"),
                }
                for w in workouts
            ],
        }

    # 5. GET DAILY LOGS
    elif function_name == "get_daily_logs":
        start = args["start_date"]
        end = args.get("end_date", datetime.now().strftime("%Y-%m-%d"))

        try:
            response = (
                supabase_admin.table("daily_logs")
                .select("*")
                .eq("user_id", user_id)
                .gte("date", start)
                .lte("date", end)
                .order("date", desc=False)
                .execute()
            )
            logs = response.data or []
            return {
                "status": "success",
                "count": len(logs),
                "logs": [
                    {
                        "date": l["date"],
                        "sleep_total": l.get("sleep_total"),
                        "deep_sleep": l.get("deep_sleep"),
                        "rem_sleep": l.get("rem_sleep"),
                        "hrv_score": l.get("hrv_score"),
                        "motivation": l.get("motivation"),
                        "soreness": l.get("soreness"),
                        "stress": l.get("stress"),
                        "body_weight_kg": l.get("body_weight_kg"),
                    }
                    for l in logs
                ],
            }
        except Exception as e:
            logger.error(f"Failed to fetch daily logs: {e}")
            return {"status": "error", "message": str(e)}

    # 6. GET COMPLETED ACTIVITIES
    elif function_name == "get_completed_activities":
        start = args["start_date"]
        end = args.get("end_date", datetime.now().strftime("%Y-%m-%d"))

        try:
            query = (
                supabase_admin.table("completed_activities")
                .select("id, start_time, distance_meters, moving_time_seconds, elapsed_time_seconds, total_elevation_gain, average_heartrate, planned_workout_id, source_type")
                .eq("user_id", user_id)
                .gte("start_time", f"{start}T00:00:00")
                .lte("start_time", f"{end}T23:59:59")
                .order("start_time", desc=False)
            )
            response = query.execute()
            activities = response.data or []

            return {
                "status": "success",
                "count": len(activities),
                "activities": [
                    {
                        "id": a["id"],
                        "start_time": a["start_time"],
                        "distance_km": round(a["distance_meters"] / 1000, 2) if a.get("distance_meters") else None,
                        "moving_time_minutes": round(a["moving_time_seconds"] / 60, 1) if a.get("moving_time_seconds") else None,
                        "elevation_gain_m": a.get("total_elevation_gain"),
                        "avg_hr": a.get("average_heartrate"),
                        "linked_to_plan": bool(a.get("planned_workout_id")),
                        "source": a.get("source_type"),
                    }
                    for a in activities
                ],
            }
        except Exception as e:
            logger.error(f"Failed to fetch completed activities: {e}")
            return {"status": "error", "message": str(e)}

    # 7. GET TRAINING SUMMARY
    elif function_name == "get_training_summary":
        days = args.get("days", 7)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        start_str = start_date.strftime("%Y-%m-%dT00:00:00")
        end_str = end_date.strftime("%Y-%m-%dT23:59:59")

        try:
            # Get planned workouts in range
            planned_resp = (
                supabase_admin.table("planned_workouts")
                .select("id, status, activity_type")
                .eq("user_id", user_id)
                .gte("start_time", start_str)
                .lte("start_time", end_str)
                .execute()
            )
            planned = planned_resp.data or []

            # Get completed activities in range
            completed_resp = (
                supabase_admin.table("completed_activities")
                .select("id")
                .eq("user_id", user_id)
                .gte("start_time", start_str)
                .lte("start_time", end_str)
                .execute()
            )
            completed = completed_resp.data or []

            total_planned = len(planned)
            completed_count = sum(1 for w in planned if w.get("status") == "completed")
            missed_count = sum(1 for w in planned if w.get("status") == "missed")
            completion_rate = round(completed_count / total_planned * 100) if total_planned > 0 else 0

            by_type = {}
            for w in planned:
                t = w.get("activity_type", "other")
                by_type[t] = by_type.get(t, 0) + 1

            return {
                "status": "success",
                "period_days": days,
                "planned_workouts": total_planned,
                "completed_workouts": completed_count,
                "missed_workouts": missed_count,
                "completion_rate_percent": completion_rate,
                "total_activities_logged": len(completed),
                "workouts_by_type": by_type,
            }
        except Exception as e:
            logger.error(f"Failed to build training summary: {e}")
            return {"status": "error", "message": str(e)}

    # 8. SAVE COACH NOTE
    elif function_name == "save_coach_note":
        result = await update_coach_notes(user_id, args["note"])
        return result

    return {"status": "error", "message": f"Unknown function: {function_name}"}
