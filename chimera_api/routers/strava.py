import os
import logging
import requests
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse
from db_client import supabase_admin
from urllib.parse import urlencode, urlparse
from html import escape

# Import services if you need to use the webhook handler,
# or you can move that logic here later.
from services import strava_service
from schemas import StravaWebhookEvent, StravaChallengeResponse, StravaAuthCode
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1", tags=["Integrations"])

STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
STRAVA_VERIFY_TOKEN = os.getenv("STRAVA_VERIFY_TOKEN")


# --- 1. TOKEN EXCHANGE (THE FIX) ---
@router.post("/integrations/strava/exchange")
def exchange_strava_token(
    payload: StravaAuthCode,
    user_id: str = Depends(get_current_user),
):
    """
    Exchanges Strava Code for Access Token.
    ASSUMPTION: User already exists in DB (handled by Auth Triggers).
    """

    # B. Exchange with Strava
    response = requests.post(
        "https://www.strava.com/oauth/token",
        data={
            "client_id": STRAVA_CLIENT_ID,
            "client_secret": STRAVA_CLIENT_SECRET,
            "code": payload.code,
            "grant_type": "authorization_code",
        },
    )

    if not response.ok:
        raise HTTPException(status_code=400, detail="Strava exchange failed")

    strava_data = response.json()

    # C. Update DB (Strict Update)
    try:
        data_to_update = {
            "strava_access_token": strava_data.get("access_token"),
            "strava_refresh_token": strava_data.get("refresh_token"),
            "strava_athlete_id": str(strava_data.get("athlete", {}).get("id")),
            "strava_expires_at": strava_data.get("expires_at"),
            "updated_at": "now()",
        }

        # We strictly UPDATE. If the user_settings row is missing, this returns error or 0 rows.
        # This enforces that users must be properly initialized by the Auth system first.
        result = (
            supabase_admin.table("user_settings")
            .update(data_to_update)
            .eq("user_id", user_id)
            .execute()
        )

        # Optional: Check if update actually happened
        if not result.data:
            # This means the Trigger failed or the user is in a bad state
            raise Exception("User settings not found. Please re-login to fix account.")

        return {"status": "connected", "athlete": strava_data.get("athlete")}

    except Exception as e:
        logger.error(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail="Database update failed")


# --- 2. REDIRECT BOUNCER ---
@router.get("/integrations/strava/redirect")
async def strava_bounce(code: str = None, state: str = None, error: str = None):
    mobile_base_url = "chimera://redirect"
    if state:
        # Validate state parameter to prevent open redirect
        parsed = urlparse(state)
        if parsed.scheme not in ["chimera", "exp"]:
            raise HTTPException(status_code=400, detail="Invalid redirect URL")
        mobile_base_url = state

    if error:
        final_url = f"{mobile_base_url}?error={escape(error)}"
        message = f"Error: {escape(error)}"
        color = "#FF3B30"
    else:
        separator = "&" if "?" in mobile_base_url else "?"
        final_url = f"{mobile_base_url}{separator}code={escape(code) if code else ''}"
        message = "Strava Connected!"
        color = "#FC4C02"

    # Escape all user-controlled content before injecting into HTML
    safe_message = escape(message)
    safe_color = escape(color)
    safe_final_url = escape(final_url)

    html_content = f"""
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: sans-serif; text-align: center; padding: 40px 20px; background-color: #f2f2f7; }}
                .card {{ background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                a {{ display: block; background: {safe_color}; color: white; padding: 16px; text-decoration: none; border-radius: 12px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>{safe_message}</h2>
                <p>Click below to return to the app.</p>
                <a href="{final_url}">Return to App</a>
            </div>
            <script>setTimeout(function() {{ window.location.href = "{safe_final_url}"; }}, 100);</script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# --- 3. WEBHOOKS ---
@router.get("/webhooks/strava", response_model=StravaChallengeResponse)
async def webhook_strava_validation(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == STRAVA_VERIFY_TOKEN:
        return StravaChallengeResponse(hub_challenge=hub_challenge)
    raise HTTPException(status_code=403, detail="Invalid verify token")


@router.post("/webhooks/strava", status_code=200)
async def webhook_strava_event(payload: StravaWebhookEvent):
    logger.info(f"Received Strava Event: {payload}")
    if payload.object_type == "activity" and payload.aspect_type == "create":
        # We can still use the service for complex processing if it exists
        if hasattr(strava_service, "handle_webhook_event"):
            await strava_service.handle_webhook_event(
                payload.object_id, payload.owner_id
            )
    return {"status": "event received"}


# --- 4. Integrations ---


@router.get("/integrations/strava/auth-url")
def get_strava_auth_url(return_url: str):
    """
    Generates the Strava OAuth URL on the server side.
    """
    # Load these from your Backend .env file
    client_id = os.getenv("STRAVA_CLIENT_ID")
    base_url = os.getenv("API_BASE_URL")  # e.g., https://api.chimera.com

    # The backend constructs the redirect URI
    # This matches the endpoint that handles the code exchange
    redirect_uri = f"{base_url}/integrations/strava/redirect"

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "approval_prompt": "force",
        "scope": "read,activity:read_all",
        "state": return_url,  # Pass the mobile app's deep link as 'state'
    }

    # Construct the full URL
    strava_url = f"https://www.strava.com/oauth/authorize?{urlencode(params)}"

    return {"url": strava_url}
