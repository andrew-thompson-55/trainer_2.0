import os
import google.generativeai as genai
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Query
from dotenv import load_dotenv
from typing import List, Optional
from uuid import UUID
from fastapi.responses import RedirectResponse, HTMLResponse

# Internal modules
# ADDED: StravaWebhookEvent, StravaChallengeResponse
from schemas import (
    ChatRequest,
    WorkoutCreate,
    WorkoutResponse,
    DailyLogCreate,
    DailyLogResponse,
    StravaWebhookEvent,
    StravaChallengeResponse,
    StravaAuthCode,
)
from services import workout_service, strava_service, daily_log_service
from db_client import supabase_admin
from ai_tools import tools_schema, execute_tool_call

load_dotenv()

app = FastAPI()

# --- SETUP GEMINI SDK ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY missing from environment.")

api_key = api_key.strip()
genai.configure(api_key=api_key)


@app.get("/")
def health_check():
    return {"status": "Chimera is Online"}


# --- AI CHAT ENDPOINT ---
@app.post("/v1/chat")
async def chat_with_gemini(request: ChatRequest):
    try:
        model = genai.GenerativeModel(model_name="gemini-2.5-flash", tools=tools_schema)

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
        1. When the user asks for a time (e.g. "6am"), ALWAYS append the timezone offset "-05:00".
        2. If the user asks to schedule, add, or plan a workout, YOU MUST use the 'create_workout' tool.
        3. Do not ask for confirmation if the user provides enough info.
        """

        chat = model.start_chat(
            history=[
                {"role": "user", "parts": system_instructions},
                {
                    "role": "model",
                    "parts": "Understood. I will use Eastern Time (UTC-5) for all scheduling.",
                },
            ]
        )

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


# --- WORKOUT ENDPOINTS ---


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


# --- DAILY LOG ENDPOINTS ---


@app.put("/v1/daily-logs/{date_str}", response_model=DailyLogResponse, tags=["Tracker"])
async def upsert_daily_log(date_str: str, log_data: DailyLogCreate):
    return await daily_log_service.upsert_log(date_str, log_data)


@app.get("/v1/daily-logs/{date_str}", tags=["Tracker"])
async def get_daily_log(date_str: str):
    return await daily_log_service.get_log(date_str)


# --- STRAVA WEBHOOK ENDPOINTS (FIXED) ---


# auth token exchange
@app.post("/v1/integrations/strava/exchange", tags=["Integrations"])
async def exchange_strava_token(payload: StravaAuthCode):
    try:
        return await strava_service.exchange_and_store_token(payload.code)
    except Exception as e:
        print(f"Strava Auth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# 1. Verification Endpoint (GET) - Required for Setup
@app.get(
    "/v1/webhooks/strava", response_model=StravaChallengeResponse, tags=["Webhooks"]
)
async def webhook_strava_validation(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    # Verify the token matches what you set in Render
    verify_token = os.getenv("STRAVA_VERIFY_TOKEN")

    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        print("Strava Webhook Verified!")
        return StravaChallengeResponse(hub_challenge=hub_challenge)

    raise HTTPException(status_code=403, detail="Invalid verify token")


# 2. Event Endpoint (POST) - Receives Data
@app.post("/v1/webhooks/strava", status_code=200, tags=["Webhooks"])
async def webhook_strava_event(payload: StravaWebhookEvent):
    """Receives event notifications from Strava."""
    print(f"Received Strava Event: {payload}")

    if payload.object_type == "activity":
        if payload.aspect_type == "create":
            # Fire and forget (or await if you want logs visible immediately)
            await strava_service.handle_webhook_event(
                payload.object_id, payload.owner_id
            )
        elif payload.aspect_type == "delete":
            # Handle delete later
            pass

    return {"status": "event received"}


# --- STRAVA REDIRECT BOUNCER ---


@app.get("/v1/integrations/strava/redirect", tags=["Integrations"])
async def strava_bounce(code: str = None, state: str = None, error: str = None):
    """
    Strava sends the user here.
    We read the 'state' param to know exactly where to bounce them back to
    (supports both Expo Go and Production builds).
    """
    # Default fallback if state is missing
    mobile_base_url = "chimera://redirect"

    # Use the provided state as the return URL if it exists
    if state:
        mobile_base_url = state

    if error:
        final_url = f"{mobile_base_url}?error={error}"
        message = f"Error: {error}"
        color = "#FF3B30"
    else:
        # Append the code to the dynamic URL
        # Handle cases where the URL might already have query params (like expo go often does)
        separator = "&" if "?" in mobile_base_url else "?"
        final_url = f"{mobile_base_url}{separator}code={code}"
        message = "Strava Connected!"
        color = "#FC4C02"

    html_content = f"""
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ font-family: sans-serif; text-align: center; padding: 40px 20px; background-color: #f2f2f7; }}
                .card {{ background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                a {{ display: block; background: {color}; color: white; padding: 16px; text-decoration: none; border-radius: 12px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>{message}</h2>
                <p>Click below to return to the app.</p>
                <a href="{final_url}">Return to App</a>
            </div>
            <script>
                setTimeout(function() {{ window.location.href = "{final_url}"; }}, 100);
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/v1/workouts/{workout_id}/activity", tags=["Workouts"])
async def get_linked_activity(workout_id: UUID):
    activity = await workout_service.get_linked_activity(workout_id)
    if not activity:
        # Return empty dict instead of 404 to keep frontend logic simple
        return {}
    return activity
