import logging
from fastapi import APIRouter, Depends
from dependencies import get_current_user
from services import dashboard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["Dashboard"])


@router.get("/dashboard")
async def get_dashboard(user_id: str = Depends(get_current_user)):
    return await dashboard_service.get_dashboard(user_id)
