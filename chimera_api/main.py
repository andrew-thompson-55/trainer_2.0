import os
import google.generativeai as genai
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from typing import List, Optional
from uuid import UUID

# Internal modules
from schemas import ChatRequest, WorkoutCreate, WorkoutResponse
from services import workout_service
from db_client import supabase_admin
from ai_tools import tools_schema, execute_tool_call

load_dotenv()

app = FastAPI()

# --- SETUP GEMINI SDK ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY missing from environment.")

# Clean the key just in case
api_key = api_key.strip()

# Configure the SDK
genai.configure(api_key=api_key)


@app.get("/")
def health_check():
    return {"status": "Chimera is Online"}


# --- AI CHAT ENDPOINT (With Tools) ---
@app.post("/v1/chat")
async def chat_with_gemini(request: ChatRequest):
    try:
        # 1. Initialize Model with Tools
        model = genai.GenerativeModel(model_name="gemini-1.5-flash", tools=tools_schema)

        # 2. Define System Context WITH TIMEZONE
        # Calculate Eastern Time (UTC-5)
        # Note: A real production app would get this from the user's phone,
        # but for your personal app, hardcoding your timezone is perfect.
        utc_now = datetime.now(timezone.utc)
        est_offset = timedelta(hours=-5)
        local_time = utc_now + est_offset

        current_time_str = local_time.strftime("%Y-%m-%d %H:%M:%S")

        system_instructions = f"""
        You are Chimera, an expert endurance training coach.
        
        CRITICAL CONTEXT:
        - The user is in Eastern Standard Time (UTC-5).
        - The current local time for the user is: {current_time_str}.
        - Today is {local_time.strftime("%A")}.
        
        RULES:
        1. When the user asks for a time (e.g. "6am"), ALWAYS append the timezone offset "-05:00" to the ISO string.
           Example: "2025-12-02T06:00:00-05:00"
        2. If the user asks to schedule, add, or plan a workout, YOU MUST use the 'create_workout' tool.
        3. Do not ask for confirmation if the user provides enough info.
        """

        # 3. Start Chat Session
        chat = model.start_chat(
            history=[
                {"role": "user", "parts": system_instructions},
                {
                    "role": "model",
                    "parts": "Understood. I will use Eastern Time (UTC-5) for all scheduling.",
                },
            ]
        )

        # ... (Rest of the function remains exactly the same) ...
        # 4. Send User Message
        response = chat.send_message(request.message)

        final_reply = ""
        part = response.candidates[0].content.parts[0]

        if part.function_call:
            fname = part.function_call.name
            fargs = dict(part.function_call.args)
            tool_result = await execute_tool_call(fname, fargs)

            function_response = {
                "function_response": {
                    "name": fname,
                    "response": {"result": tool_result},
                }
            }
            final_response = chat.send_message([function_response])
            final_reply = final_response.text
        else:
            final_reply = response.text

        if supabase_admin:
            try:
                supabase_admin.table("chat_logs").insert(
                    {"user_message": request.message, "ai_response": final_reply}
                ).execute()
            except Exception:
                pass

        return {"reply": final_reply}

    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- WORKOUT ENDPOINTS (Unchanged) ---


@app.post("/v1/workouts", response_model=WorkoutResponse, tags=["Workouts"])
async def create_workout(workout: WorkoutCreate):
    return await workout_service.create_workout(workout)


@app.get("/v1/workouts", response_model=List[WorkoutResponse], tags=["Workouts"])
async def get_workouts(
    start_date: Optional[str] = None, end_date: Optional[str] = None
):
    return await workout_service.get_workouts(start_date, end_date)


@app.patch("/v1/workouts/{workout_id}", tags=["Workouts"])
async def update_workout(workout_id: UUID, workout: dict):
    return await workout_service.update_workout(workout_id, workout)


@app.delete("/v1/workouts/{workout_id}", tags=["Workouts"])
async def delete_workout(workout_id: UUID):
    await workout_service.delete_workout(workout_id)
    return {"status": "deleted"}
