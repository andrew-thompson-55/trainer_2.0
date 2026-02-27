import logging
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from services import gcal_sync_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/integrations", tags=["Integrations"])


@router.post("/gcal/resync")
async def resync_google_calendar(user_id: str = Depends(get_current_user)):
    try:
        result = await gcal_sync_service.resync_all(user_id)
        return result
    except Exception as e:
        logger.error(f"⚠️ GCal resync error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Google Calendar resync failed")
