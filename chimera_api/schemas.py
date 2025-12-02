from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import date as date_type


class ChatRequest(BaseModel):
    message: str


class WorkoutBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    activity_type: Literal["run", "bike", "swim", "strength", "other"]
    status: Literal["planned", "completed", "missed"] = "planned"


class WorkoutCreate(WorkoutBase):
    # User ID will be handled by the system for now
    pass


class WorkoutResponse(WorkoutBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


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
