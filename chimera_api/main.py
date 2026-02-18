import os
import asyncio
import logging
import google.generativeai as genai
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List, Optional
from uuid import UUID

# Import Schemas & Services (for the endpoints we kept here)
from schemas import (
    ChatRequest,
    WorkoutCreate,
    WorkoutUpdate,
    WorkoutResponse,
    DailyLogCreate,
    DailyLogResponse,
)
from services import workout_service, daily_log_service
from services import stream_service
from db_client import supabase_admin
from ai_tools import tools_schema, execute_tool_call
from dependencies import get_current_user

# 👇 NEW IMPORTS
from routers import auth, strava

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    # Startup: bootstrap the Stream bot user
    try:
        await asyncio.to_thread(stream_service.bootstrap_bot_user)
        logger.info("Stream bot user ready")
    except Exception as e:
        logger.warning(f"Stream bootstrap failed (non-fatal): {e}")
    yield


app = FastAPI(lifespan=lifespan)

# 👇 CONFIGURE CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:3000",
        "https://chimera-amber.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 👇 REGISTER ROUTERS
app.include_router(auth.router)
app.include_router(strava.router)

# --- GEMINI SETUP ---
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key.strip())


@app.get("/")
def health_check():
    return {"status": "Chimera is Online"}


# --- AI CHAT (Kept in Main for now) ---
@app.post("/v1/chat")
async def chat_with_gemini(
    request: ChatRequest, user_id: str = Depends(get_current_user)
):
    # ... (Your existing AI Chat logic - abbreviated for safety) ...
    # (Paste your existing /v1/chat function body here exactly as it was)
    try:
        model = genai.GenerativeModel(model_name="gemini-2.5-flash", tools=tools_schema)
        utc_now = datetime.now(timezone.utc)
        local_time = utc_now + timedelta(hours=-5)
        current_time_str = local_time.strftime("%Y-%m-%d %H:%M:%S")

        system_instructions = f"""
        You are Chimera, an expert endurance training coach.
        CRITICAL CONTEXT:
        - The user is in Eastern Standard Time (UTC-5).
        - The current local time for the user is: {current_time_str}.
        - Today is {local_time.strftime("%A")}.
        RULES:
        1. When the user asks for a time (e.g. "6am"), ALWAYS append the timezone offset "-05:00".
        2. If the user asks to schedule, add, or plan a workout, YOU MUST use the 'create_workout' tool.
        """

        chat = model.start_chat(
            history=[
                {"role": "user", "parts": system_instructions},
                {
                    "role": "model",
                    "parts": "Understood. I will use Eastern Time (UTC-5).",
                },
            ]
        )
        response = chat.send_message(request.message)

        # Tool Handling Logic
        final_reply = ""
        if not response.candidates:
            raise HTTPException(status_code=500, detail="Empty response from AI")
        part = response.candidates[0].content.parts[0]
        if part.function_call:
            fname = part.function_call.name
            fargs = dict(part.function_call.args)
            tool_result = await execute_tool_call(fname, fargs, user_id)
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

        # Push AI reply to Stream channel
        try:
            channel = await asyncio.to_thread(stream_service.get_or_create_coach_channel, user_id)
            await asyncio.to_thread(stream_service.send_typing_start, channel)
            await asyncio.to_thread(stream_service.push_ai_message, channel, final_reply)
            await asyncio.to_thread(stream_service.send_typing_stop, channel)
        except Exception as e:
            logger.warning(f"Stream push failed: {e}")

        # Log to DB
        if supabase_admin:
            try:
                supabase_admin.table("chat_logs").insert(
                    {
                        "user_id": user_id,
                        "user_message": request.message,
                        "ai_response": final_reply,
                    }
                ).execute()
            except Exception as e:
                logger.warning(f"Chat log failed: {e}")

        return {"reply": final_reply}
    except Exception as e:
        logger.error(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- WORKOUTS (Kept in Main for now) ---
@app.post("/v1/workouts", response_model=WorkoutResponse, tags=["Workouts"])
async def create_workout(
    workout: WorkoutCreate, user_id: str = Depends(get_current_user)
):
    return await workout_service.create_workout(workout, user_id)


@app.get("/v1/workouts", response_model=List[WorkoutResponse], tags=["Workouts"])
async def get_workouts(
    user_id: str = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return await workout_service.get_workouts(user_id, start_date, end_date)


@app.get("/v1/workouts/{workout_id}", response_model=WorkoutResponse, tags=["Workouts"])
async def get_workout(workout_id: UUID, user_id: str = Depends(get_current_user)):
    return await workout_service.get_workout(workout_id, user_id)


@app.patch("/v1/workouts/{workout_id}", tags=["Workouts"])
async def update_workout(
    workout_id: UUID, workout: WorkoutUpdate, user_id: str = Depends(get_current_user)
):
    return await workout_service.update_workout(
        workout_id, workout.model_dump(exclude_unset=True), user_id
    )


@app.delete("/v1/workouts/{workout_id}", tags=["Workouts"])
async def delete_workout(workout_id: UUID, user_id: str = Depends(get_current_user)):
    await workout_service.delete_workout(workout_id, user_id)
    return {"status": "deleted"}


@app.get("/v1/workouts/{workout_id}/activity", tags=["Workouts"])
async def get_linked_activity(
    workout_id: UUID, user_id: str = Depends(get_current_user)
):
    activity = await workout_service.get_linked_activity(workout_id, user_id)
    return activity if activity else {}


# --- DAILY LOGS (Kept in Main for now) ---
@app.put("/v1/daily-logs/{date_str}", response_model=DailyLogResponse, tags=["Tracker"])
async def upsert_daily_log(
    date_str: str, log_data: DailyLogCreate, user_id: str = Depends(get_current_user)
):
    return await daily_log_service.upsert_log(date_str, log_data, user_id)


@app.get("/v1/daily-logs/{date_str}", tags=["Tracker"])
async def get_daily_log(date_str: str, user_id: str = Depends(get_current_user)):
    return await daily_log_service.get_log(date_str, user_id)
