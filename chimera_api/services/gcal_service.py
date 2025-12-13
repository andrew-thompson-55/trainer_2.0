import os
import json
import base64
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from db_client import supabase_admin

# Scopes needed
SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_calendar_service():
    """Authenticates and returns the Google Calendar Service"""
    # Load JSON from Env Var (Base64 Encoded for safety on Render)
    b64_creds = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not b64_creds:
        print("⚠️ No Google Credentials found.")
        return None

    try:
        creds_json = base64.b64decode(b64_creds).decode("utf-8")
        creds_dict = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(
            creds_dict, scopes=SCOPES
        )
        return build("calendar", "v3", credentials=creds)
    except Exception as e:
        print(f"❌ Google Auth Failed: {e}")
        return None


def sync_workout_to_calendar(workout_data: dict, is_new=False):
    """
    Creates or Updates a Google Calendar Event from a Workout.
    """
    service = _get_calendar_service()
    if not service:
        return

    calendar_id = os.getenv(
        "GOOGLE_CALENDAR_ID"
    )  # "c_123...@group.calendar.google.com"

    # 1. Format the Event
    start_dt = datetime.fromisoformat(workout_data["start_time"].replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(workout_data["end_time"].replace("Z", "+00:00"))

    # Simple Logic: 1 hour default if times match
    if start_dt == end_dt:
        end_dt = start_dt + timedelta(hours=1)

    event_body = {
        "summary": f"🏋️ {workout_data['title']}",
        "description": f"{workout_data.get('description', '')}\n\nType: {workout_data['activity_type']}\nStatus: {workout_data['status']}",
        "start": {"dateTime": start_dt.isoformat()},
        "end": {"dateTime": end_dt.isoformat()},
        "colorId": "10"
        if workout_data["status"] == "completed"
        else "8",  # Green vs Grey
    }

    try:
        if is_new or not workout_data.get("google_event_id"):
            # CREATE
            print(f"📅 Creating GCal Event: {workout_data['title']}")
            event = (
                service.events()
                .insert(calendarId=calendar_id, body=event_body)
                .execute()
            )

            # Save ID back to DB
            supabase_admin.table("planned_workouts").update(
                {
                    "google_event_id": event["id"],
                    "last_synced_at": datetime.now().isoformat(),
                }
            ).eq("id", workout_data["id"]).execute()

        else:
            # UPDATE
            print(f"📅 Updating GCal Event: {workout_data['title']}")
            service.events().update(
                calendarId=calendar_id,
                eventId=workout_data["google_event_id"],
                body=event_body,
            ).execute()

    except Exception as e:
        print(f"❌ Calendar Sync Error: {e}")


def delete_calendar_event(google_event_id: str):
    """Deletes event from GCal"""
    service = _get_calendar_service()
    calendar_id = os.getenv("GOOGLE_CALENDAR_ID")
    try:
        service.events().delete(
            calendarId=calendar_id, eventId=google_event_id
        ).execute()
    except Exception as e:
        print(f"❌ Delete Error: {e}")
