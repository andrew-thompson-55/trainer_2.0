from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel


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
