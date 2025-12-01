import google.generativeai as genai
from datetime import datetime, timedelta
from services import workout_service
from schemas import WorkoutCreate

# Configure the tool definition
tools_schema = [
    {
        "function_declarations": [
            {
                "name": "create_workout",
                "description": "Add a new workout to the user's training plan.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Short title of the workout (e.g. '5k Run', 'Leg Day')",
                        },
                        "activity_type": {
                            "type": "string",
                            "enum": ["run", "bike", "swim", "strength", "other"],
                            "description": "The type of activity.",
                        },
                        "start_time_iso": {
                            "type": "string",
                            "description": "The start time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). Calculate this based on the user's relative time request (e.g. 'tomorrow at 2pm').",
                        },
                        "duration_minutes": {
                            "type": "integer",
                            "description": "Duration in minutes. Default to 60 if not specified.",
                        },
                        "description": {
                            "type": "string",
                            "description": "Any additional notes or details about the workout.",
                        },
                    },
                    "required": ["title", "activity_type", "start_time_iso"],
                },
            }
        ]
    }
]


# The actual Python function the API will execute
async def execute_tool_call(function_name, args):
    if function_name == "create_workout":
        print(f"🤖 AI is creating a workout: {args}")

        # 1. Calculate End Time
        start_dt = datetime.fromisoformat(args["start_time_iso"])
        duration = args.get("duration_minutes", 60)
        end_dt = start_dt + timedelta(minutes=duration)

        # 2. Build Schema
        workout_data = WorkoutCreate(
            title=args["title"],
            description=args.get("description", "AI Generated"),
            activity_type=args["activity_type"],
            start_time=start_dt,
            end_time=end_dt,
            status="planned",
        )

        # 3. Save to DB
        result = await workout_service.create_workout(workout_data)
        return f"Success! Workout '{result['title']}' created with ID {result['id']}."

    return "Error: Unknown function called."
