from datetime import datetime, date as date_type
from typing import Optional, Literal, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# --- Chat Models ---
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


# --- Auth Models ---
class GoogleLoginRequest(BaseModel):
    token: str


# --- Workout Models ---
class WorkoutBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    activity_type: Literal["run", "bike", "swim", "strength", "other"]
    status: Literal["planned", "completed", "missed"] = "planned"


class WorkoutCreate(WorkoutBase):
    pass


class WorkoutUpdate(BaseModel):
    """Partial update model for workouts - all fields optional"""
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    activity_type: Optional[Literal["run", "bike", "swim", "strength", "other"]] = None
    status: Optional[Literal["planned", "completed", "missed"]] = None


class WorkoutResponse(WorkoutBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Daily Log Models ---
class DailyLogBase(BaseModel):
    sleep_total: Optional[float] = None
    deep_sleep: Optional[float] = None
    rem_sleep: Optional[float] = None
    resources_percent: Optional[int] = None
    hrv_score: Optional[int] = None
    min_sleep_hr: Optional[int] = None
    motivation: Optional[int] = None
    soreness: Optional[int] = None
    stress: Optional[int] = None
    body_weight_kg: Optional[float] = None


class DailyLogCreate(DailyLogBase):
    pass


class DailyLogResponse(DailyLogBase):
    id: UUID
    date: date_type
    user_id: UUID


# --- Strava Auth Models (Restored) ---
class StravaAuthCode(BaseModel):
    code: str


# --- Strava Webhook Models ---
class StravaChallengeResponse(BaseModel):
    # Allows mapping 'hub_challenge' to 'hub.challenge'
    model_config = ConfigDict(populate_by_name=True)

    hub_challenge: str = Field(..., alias="hub.challenge")


class StravaWebhookEvent(BaseModel):
    aspect_type: Literal["create", "update", "delete"]
    event_time: int
    object_id: int
    object_type: Literal["activity", "athlete"]
    owner_id: int
    subscription_id: int
    updates: Optional[Dict[str, Any]] = None


# --- User Profile Models ---
class ProfileUpdate(BaseModel):
    """Whitelisted fields for user profile updates"""

    name: Optional[str] = None
    timezone: Optional[str] = None


class UserProfileUpdate(BaseModel):
    """Extended profile fields for training context"""

    training_goals: Optional[str] = None
    target_race: Optional[str] = None
    target_race_date: Optional[str] = None
    weekly_volume_target_hours: Optional[float] = None
    preferred_workout_time: Optional[str] = None
    injury_notes: Optional[str] = None
