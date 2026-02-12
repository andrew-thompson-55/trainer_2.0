import logging
import google.generativeai as genai
from datetime import datetime, timedelta
from services import workout_service
from schemas import WorkoutCreate

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
        ]
    }
]


# --- HELPER: Find Workout by Date ---
async def _find_workout_on_day(date_iso: str, user_id: str, activity_type: str = None):
    """
    Helper to search for workouts on a specific calendar day.
    """
    # Parse the target date string (e.g. "2025-12-02")
    target_date = datetime.fromisoformat(date_iso.split("T")[0])

    # Define the search window (Start of day to End of day)
    start_range = target_date.replace(hour=0, minute=0, second=0).isoformat()
    end_range = target_date.replace(hour=23, minute=59, second=59).isoformat()

    # Call our service to get workouts in that range
    workouts = await workout_service.get_workouts(
        user_id=user_id, start_date=start_range, end_date=end_range
    )

    if not workouts:
        return None

    # If specific type requested, filter for it
    if activity_type:
        filtered = [w for w in workouts if w["activity_type"] == activity_type]
        if filtered:
            return filtered[0]  # Return the first match

    # Default: Return the first workout found on that day
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
        return f"Success. Created '{result['title']}' ID: {result['id']}"

    # 2. UPDATE
    elif function_name == "update_workout":
        # First, find the workout
        target = await _find_workout_on_day(args["target_date_iso"], user_id)
        if not target:
            return "Error: No workout found on that date to update."

        # Build updates dictionary
        updates = {}
        if "new_title" in args:
            updates["title"] = args["new_title"]
        if "new_description" in args:
            updates["description"] = args["new_description"]
        if "new_status" in args:
            updates["status"] = args["new_status"]
        if "new_start_time_iso" in args:
            # If moving time, calculate new end time too (keep same duration)
            old_start = datetime.fromisoformat(target["start_time"])
            old_end = datetime.fromisoformat(target["end_time"])
            duration = old_end - old_start

            new_start = datetime.fromisoformat(args["new_start_time_iso"])
            new_end = new_start + duration

            updates["start_time"] = new_start.isoformat()
            updates["end_time"] = new_end.isoformat()

        if not updates:
            return "No changes requested."

        await workout_service.update_workout(target["id"], updates, user_id)
        return f"Success. Updated workout '{target['title']}'."

    # 3. DELETE
    elif function_name == "delete_workout":
        target = await _find_workout_on_day(
            args["target_date_iso"], user_id, args.get("activity_type")
        )
        if not target:
            return "Error: No workout found on that date to delete."

        await workout_service.delete_workout(target["id"], user_id)
        return f"Success. Deleted workout '{target['title']}'."

    return "Error: Unknown function."
