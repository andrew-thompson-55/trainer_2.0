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


class UserSettingsUpdate(BaseModel):
    """User-facing settings stored in user_settings table"""
    weight_unit: Optional[Literal['kg', 'lbs']] = None
    morning_checkin_reminder: Optional[bool] = None
    morning_checkin_reminder_time: Optional[str] = None
    workout_update_reminder: Optional[bool] = None
    streak_reminder: Optional[bool] = None
    streak_reminder_time: Optional[str] = None

    # Profile fields
    date_of_birth: Optional[str] = None
    gender: Optional[Literal['male', 'female', 'non-binary', 'prefer_not_to_say']] = None
    height_value: Optional[float] = None
    height_unit: Optional[Literal['in', 'cm']] = None

    # Training profile
    training_experience: Optional[Literal['beginner', 'intermediate', 'advanced', 'elite']] = None
    primary_activities: Optional[list[str]] = None
    weekly_training_days: Optional[int] = None
    rest_day_preference: Optional[Literal['none', 'fixed', 'flexible']] = None
    rest_days: Optional[list[str]] = None
    max_heart_rate: Optional[int] = None

    # Distance unit
    distance_unit: Optional[Literal['mi', 'km']] = None

    # Expanded notifications
    notification_weekly_summary: Optional[bool] = None
    notification_weekly_summary_day: Optional[str] = None
    notification_weekly_summary_time: Optional[str] = None

    # Activity filtering
    tracked_activity_types: Optional[list[str]] = None


class UserSettingsResponse(BaseModel):
    weight_unit: str = 'kg'
    morning_checkin_reminder: bool = False
    morning_checkin_reminder_time: str = '08:00'
    workout_update_reminder: bool = False
    streak_reminder: bool = False
    streak_reminder_time: str = '10:00'

    # Profile fields
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    height_value: Optional[float] = None
    height_unit: Optional[str] = None

    # Training profile
    training_experience: Optional[str] = None
    primary_activities: Optional[list[str]] = None
    weekly_training_days: Optional[int] = None
    rest_day_preference: Optional[str] = None
    rest_days: Optional[list[str]] = None
    max_heart_rate: Optional[int] = None

    # Distance unit
    distance_unit: str = 'mi'

    # Expanded notifications
    notification_weekly_summary: bool = False
    notification_weekly_summary_day: Optional[str] = None
    notification_weekly_summary_time: Optional[str] = None

    # Strava connected state
    strava_athlete_id: Optional[int] = None
    strava_athlete_name: Optional[str] = None

    # Activity filtering
    tracked_activity_types: Optional[list[str]] = None


# --- Activity Stats Toggle ---
class ActivityStatsToggle(BaseModel):
    include: bool


# --- Daily Check-in Models ---
class MorningCheckinCreate(BaseModel):
    readiness: Optional[int] = Field(None, ge=1, le=5)
    soreness: Optional[int] = Field(None, ge=1, le=5)
    energy: Optional[int] = Field(None, ge=1, le=5)
    mood: Optional[int] = Field(None, ge=1, le=5)
    note: Optional[str] = None
    body_weight: Optional[float] = None
    body_weight_unit: Optional[Literal['kg', 'lbs']] = 'lbs'


class WorkoutUpdateCreate(BaseModel):
    session_rpe: int = Field(..., ge=1, le=5)


# --- Plan Import Models ---
class PlannedWorkoutImport(BaseModel):
    date: date_type
    title: str
    activity_type: str
    description: Optional[str] = None
    target_duration_minutes: Optional[int] = None
    target_notes: Optional[str] = None


class PlanImportRequest(BaseModel):
    workouts: list[PlannedWorkoutImport] = Field(..., min_length=1)
