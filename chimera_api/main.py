import os
import logging
import google.generativeai as genai
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
from services.agent_service import run_agent
from dependencies import get_current_user

from routers import auth, strava

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


app = FastAPI()

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


# --- AI CHAT (Agent-powered) ---
@app.post("/v1/chat")
async def chat_with_gemini(
    request: ChatRequest, user_id: str = Depends(get_current_user)
):
    try:
        result = await run_agent(user_id, request.message)
        return {"reply": result["reply"]}
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
