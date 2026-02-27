"""
Plan import/export service.

Handles coach-friendly import with multiple input shapes,
field alias mapping, flexible date parsing, activity type inference,
phase auto-creation, and duplicate detection.
"""
import logging
import re
from datetime import datetime, date, timedelta
from typing import Any

from db_client import supabase_admin
from services import phase_service
from services import gcal_service
from services import user_settings_service

logger = logging.getLogger(__name__)

# --- Field alias mapping ---
# Maps coach-friendly column names to canonical field names
FIELD_ALIASES: dict[str, str] = {
    # date aliases
    "workout_date": "date",
    "day": "date",
    "scheduled_date": "date",
    # title aliases
    "workout_name": "title",
    "name": "title",
    "workout": "title",
    "session": "title",
    # activity_type aliases
    "type": "activity_type",
    "sport": "activity_type",
    "discipline": "activity_type",
    "workout_type": "activity_type",
    # duration aliases
    "minutes": "duration",
    "duration_minutes": "duration",
    "target_duration_minutes": "duration",
    "time": "duration",
    "length": "duration",
    # description aliases
    "notes": "description",
    "details": "description",
    "target_notes": "description",
    "instructions": "description",
    # phase aliases
    "block": "phase",
    "training_block": "phase",
    "mesocycle": "phase",
    "period": "phase",
    # status aliases
    "state": "status",
}

# --- Activity type mapping ---
# Maps coach-friendly type names to DB values
ACTIVITY_TYPE_MAP: dict[str, str] = {
    "run": "run",
    "running": "run",
    "jog": "run",
    "swim": "swim",
    "swimming": "swim",
    "bike": "bike",
    "ride": "bike",
    "cycling": "bike",
    "cycle": "bike",
    "strength": "strength",
    "gym": "strength",
    "weights": "strength",
    "lifting": "strength",
    "rest": "other",
    "travel": "other",
    "race": "other",
    "other": "other",
}

# --- Title keywords for type inference ---
TITLE_TYPE_KEYWORDS: list[tuple[list[str], str]] = [
    (["run", "tempo", "interval", "fartlek", "mile", "5k", "10k", "half", "marathon", "jog", "strides", "hill repeat"], "run"),
    (["swim", "pool", "lap", "freestyle", "backstroke", "open water"], "swim"),
    (["bike", "ride", "cycling", "spin", "trainer", "zwift", "peloton"], "bike"),
    (["gym", "strength", "weights", "lifting", "upper body", "lower body", "core", "squat", "deadlift", "bench", "plank", "yoga", "stretch", "mobility", "pilates"], "strength"),
]

# --- Flexible date formats ---
DATE_FORMATS = [
    "%Y-%m-%d",      # 2026-03-02
    "%m/%d/%Y",      # 03/02/2026
    "%m-%d-%Y",      # 03-02-2026
    "%d/%m/%Y",      # 02/03/2026 (ambiguous, tried after US format)
    "%B %d, %Y",     # March 2, 2026
    "%b %d, %Y",     # Mar 2, 2026
    "%B %d %Y",      # March 2 2026
    "%b %d %Y",      # Mar 2 2026
    "%m/%d/%y",      # 03/02/26
    "%Y%m%d",        # 20260302
]


def normalize_entry(raw: dict) -> dict:
    """Apply alias map, strip/lowercase keys."""
    result = {}
    for key, value in raw.items():
        clean_key = key.strip().lower().replace(" ", "_")
        canonical = FIELD_ALIASES.get(clean_key, clean_key)
        result[canonical] = value
    return result


def parse_flexible_date(value: Any) -> date | None:
    """Try multiple date formats, return date or None."""
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None

    value = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    logger.warning(f"Could not parse date: {value}")
    return None


def infer_type_from_title(title: str) -> str | None:
    """Keyword-based activity type inference from workout title."""
    if not title:
        return None
    title_lower = title.lower()
    for keywords, activity_type in TITLE_TYPE_KEYWORDS:
        for kw in keywords:
            if kw in title_lower:
                return activity_type
    return None


def map_activity_type(raw_type: str | None) -> str:
    """Map import type string to DB activity_type value."""
    if not raw_type:
        return "other"
    return ACTIVITY_TYPE_MAP.get(raw_type.strip().lower(), "other")


def extract_phases(entries: list[dict]) -> list[dict]:
    """
    Group entries by inline 'phase' field.
    Returns list of {title, start_date, end_date} for each phase.
    """
    phase_groups: dict[str, list[date]] = {}
    for entry in entries:
        phase_name = entry.get("phase")
        entry_date = entry.get("_parsed_date")
        if phase_name and entry_date:
            phase_name = phase_name.strip()
            if phase_name not in phase_groups:
                phase_groups[phase_name] = []
            phase_groups[phase_name].append(entry_date)

    phases = []
    for title, dates in phase_groups.items():
        phases.append({
            "title": title,
            "start_date": min(dates),
            "end_date": max(dates),
        })
    return sorted(phases, key=lambda p: p["start_date"])


def validate_entries(entries: list[dict]) -> list[str]:
    """Check required fields, return error messages."""
    errors = []
    for i, entry in enumerate(entries):
        if not entry.get("_parsed_date"):
            errors.append(f"Entry {i}: missing or unparseable date")
        if not entry.get("title"):
            errors.append(f"Entry {i}: missing title")
    return errors


def _detect_shape(raw_input: Any) -> str:
    """Detect input shape: A (bare list), B (dict with entries), C (system format with workouts)."""
    if isinstance(raw_input, list):
        return "A"
    if isinstance(raw_input, dict):
        if "workouts" in raw_input:
            return "C"
        if "entries" in raw_input:
            return "B"
        # Single object — wrap as list
        return "A"
    return "unknown"


async def _check_duplicate(user_id: str, entry_date: date, title: str) -> bool:
    """Check if a workout with same date+title already exists for this user."""
    date_str = entry_date.isoformat()
    start_of_day = f"{date_str}T00:00:00"
    end_of_day = f"{date_str}T23:59:59"

    resp = (
        supabase_admin.table("planned_workouts")
        .select("id")
        .eq("user_id", user_id)
        .gte("start_time", start_of_day)
        .lte("start_time", end_of_day)
        .eq("title", title)
        .execute()
    )
    return bool(resp.data)


async def _get_default_workout_time(user_id: str) -> tuple[int, int]:
    """Fetch user's default workout time setting, return (hour, minute)."""
    try:
        settings = await user_settings_service.get_user_settings(user_id)
        time_str = settings.get("default_workout_time", "06:00")
        parts = time_str.split(":")
        return int(parts[0]), int(parts[1])
    except Exception as e:
        logger.warning(f"Failed to fetch default workout time: {e}")
        return 6, 0


async def _create_workout_row(user_id: str, entry: dict, source: str = "import", default_hour: int = 6, default_minute: int = 0) -> dict:
    """Build a planned_workouts row from a normalized entry."""
    entry_date = entry["_parsed_date"]
    duration_min = entry.get("duration") or 60
    if isinstance(duration_min, str):
        try:
            duration_min = int(duration_min)
        except ValueError:
            duration_min = 60

    start = datetime.combine(entry_date, datetime.min.time().replace(hour=default_hour, minute=default_minute))
    end = start + timedelta(minutes=duration_min)

    # Determine activity type: explicit > inferred from title > other
    raw_type = entry.get("activity_type")
    if raw_type:
        activity_type = map_activity_type(raw_type)
    else:
        inferred = infer_type_from_title(entry.get("title", ""))
        activity_type = inferred if inferred else "other"

    status = entry.get("status", "planned")
    if status not in ("planned", "completed", "missed", "tentative", "cancelled"):
        status = "planned"

    return {
        "user_id": user_id,
        "title": entry["title"],
        "activity_type": activity_type,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "description": entry.get("description"),
        "status": status,
        "source": source,
    }


async def import_plan(user_id: str, raw_input: Any) -> dict:
    """
    Main import entry point. Detects shape, normalizes, creates phases and workouts.

    Shape A: bare array of entries (or single dict)
    Shape B: {entries: [...], distance_unit?: str, ...}
    Shape C: system format {workouts: [...], phases?: [...]}
    """
    shape = _detect_shape(raw_input)

    if shape == "C":
        return await import_system_format(user_id, raw_input)

    # Extract entries based on shape
    if shape == "A":
        if isinstance(raw_input, dict):
            raw_entries = [raw_input]
        else:
            raw_entries = raw_input
    elif shape == "B":
        raw_entries = raw_input.get("entries", [])
    else:
        return {"error": "Unrecognized input format", "imported": 0}

    if not raw_entries:
        return {"error": "No entries provided", "imported": 0}

    # Normalize all entries
    entries = [normalize_entry(e) for e in raw_entries]

    # Parse dates
    for entry in entries:
        entry["_parsed_date"] = parse_flexible_date(entry.get("date"))

    # Validate
    errors = validate_entries(entries)
    if errors:
        return {"errors": errors, "imported": 0}

    # Extract and create phases
    phases = extract_phases(entries)
    created_phases = []
    for phase_data in phases:
        try:
            phase = await phase_service.create_phase({
                "title": phase_data["title"],
                "phase_type": "custom",
                "start_date": phase_data["start_date"].isoformat(),
                "end_date": phase_data["end_date"].isoformat(),
            }, user_id)
            created_phases.append(phase)
        except Exception as e:
            logger.warning(f"Failed to create phase '{phase_data['title']}': {e}")

    # Fetch user's default workout time
    default_hour, default_minute = await _get_default_workout_time(user_id)

    # Create workouts, checking for duplicates
    created = []
    skipped = []
    for entry in entries:
        entry_date = entry["_parsed_date"]
        title = entry["title"]

        # Duplicate detection: match by date + title
        if await _check_duplicate(user_id, entry_date, title):
            skipped.append({"date": entry_date.isoformat(), "title": title, "reason": "duplicate"})
            continue

        row = await _create_workout_row(user_id, entry, default_hour=default_hour, default_minute=default_minute)
        try:
            resp = supabase_admin.table("planned_workouts").insert(row).execute()
            if resp.data:
                created.append(resp.data[0])
                try:
                    gcal_service.sync_workout_to_calendar(resp.data[0], is_new=True)
                except Exception as e:
                    logger.warning(f"GCal sync failed for '{title}': {e}")
        except Exception as e:
            logger.error(f"Failed to insert workout '{title}' on {entry_date}: {e}")
            skipped.append({"date": entry_date.isoformat(), "title": title, "reason": str(e)})

    return {
        "imported": len(created),
        "skipped": skipped,
        "phases_created": len(created_phases),
        "workouts": created,
    }


async def import_system_format(user_id: str, data: dict) -> dict:
    """
    Handle Shape C — re-import with IDs (system format from export).
    Workouts with 'id' field: strip 'w-' prefix, upsert by UUID.
    Workouts without 'id': create new.
    """
    raw_workouts = data.get("workouts", [])
    raw_phases = data.get("phases", [])

    # Re-create phases if provided
    created_phases = []
    for phase_data in raw_phases:
        phase_id = phase_data.pop("id", None)
        phase_data.pop("user_id", None)
        # Convert date strings if needed
        for key in ("start_date", "end_date"):
            if key in phase_data and isinstance(phase_data[key], str):
                pass  # keep as string for phase_service
        try:
            phase = await phase_service.create_phase(phase_data, user_id)
            created_phases.append(phase)
        except Exception as e:
            logger.warning(f"Failed to create phase from system format: {e}")

    # Fetch user's default workout time
    default_hour, default_minute = await _get_default_workout_time(user_id)

    created = []
    updated = []
    skipped = []

    for raw in raw_workouts:
        workout_id = raw.pop("id", None)
        raw.pop("user_id", None)
        raw.pop("created_at", None)

        # Normalize entry
        entry = normalize_entry(raw)
        entry["_parsed_date"] = parse_flexible_date(entry.get("date"))

        if not entry.get("_parsed_date") or not entry.get("title"):
            skipped.append({"id": workout_id, "reason": "missing date or title"})
            continue

        if workout_id:
            # Strip w- prefix if present
            clean_id = workout_id.replace("w-", "") if isinstance(workout_id, str) else str(workout_id)

            # Check if workout exists
            existing = (
                supabase_admin.table("planned_workouts")
                .select("id")
                .eq("id", clean_id)
                .eq("user_id", user_id)
                .execute()
            )

            row = await _create_workout_row(user_id, entry, source="reimport", default_hour=default_hour, default_minute=default_minute)

            if existing.data:
                # Update existing
                try:
                    resp = (
                        supabase_admin.table("planned_workouts")
                        .update(row)
                        .eq("id", clean_id)
                        .eq("user_id", user_id)
                        .execute()
                    )
                    if resp.data:
                        updated.append(resp.data[0])
                        try:
                            gcal_service.sync_workout_to_calendar(resp.data[0], is_new=False)
                        except Exception as e:
                            logger.warning(f"GCal sync failed for updated workout {clean_id}: {e}")
                except Exception as e:
                    logger.error(f"Failed to update workout {clean_id}: {e}")
                    skipped.append({"id": workout_id, "reason": str(e)})
            else:
                # Create new
                try:
                    resp = supabase_admin.table("planned_workouts").insert(row).execute()
                    if resp.data:
                        created.append(resp.data[0])
                        try:
                            gcal_service.sync_workout_to_calendar(resp.data[0], is_new=True)
                        except Exception as e:
                            logger.warning(f"GCal sync failed for new workout: {e}")
                except Exception as e:
                    logger.error(f"Failed to insert workout from system format: {e}")
                    skipped.append({"id": workout_id, "reason": str(e)})
        else:
            # No ID — create new, check duplicates
            entry_date = entry["_parsed_date"]
            title = entry["title"]
            if await _check_duplicate(user_id, entry_date, title):
                skipped.append({"date": entry_date.isoformat(), "title": title, "reason": "duplicate"})
                continue

            row = await _create_workout_row(user_id, entry, source="reimport", default_hour=default_hour, default_minute=default_minute)
            try:
                resp = supabase_admin.table("planned_workouts").insert(row).execute()
                if resp.data:
                    created.append(resp.data[0])
                    try:
                        gcal_service.sync_workout_to_calendar(resp.data[0], is_new=True)
                    except Exception as e:
                        logger.warning(f"GCal sync failed for new workout: {e}")
            except Exception as e:
                logger.error(f"Failed to insert workout from system format: {e}")
                skipped.append({"title": entry.get("title"), "reason": str(e)})

    return {
        "imported": len(created),
        "updated": len(updated),
        "skipped": skipped,
        "phases_created": len(created_phases),
        "workouts": created + updated,
    }


async def export_plan(user_id: str, start_date: date, end_date: date) -> dict:
    """Build system format export for a date range."""
    start_str = f"{start_date.isoformat()}T00:00:00"
    end_str = f"{end_date.isoformat()}T23:59:59"

    # Fetch workouts
    workouts_resp = (
        supabase_admin.table("planned_workouts")
        .select("*")
        .eq("user_id", user_id)
        .gte("start_time", start_str)
        .lte("start_time", end_str)
        .order("start_time", desc=False)
        .execute()
    )

    # Fetch phases overlapping the range
    phases = await phase_service.get_phases(
        user_id,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
    )

    # Format workouts for export
    export_workouts = []
    for w in (workouts_resp.data or []):
        start_time = w.get("start_time", "")
        end_time = w.get("end_time", "")

        # Calculate duration in minutes
        duration = None
        if start_time and end_time:
            try:
                st = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                et = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                duration = int((et - st).total_seconds() / 60)
            except (ValueError, TypeError):
                pass

        export_workouts.append({
            "id": f"w-{w['id']}",
            "date": start_time[:10] if start_time else None,
            "title": w.get("title"),
            "activity_type": w.get("activity_type"),
            "duration": duration,
            "description": w.get("description"),
            "status": w.get("status"),
        })

    # Format phases for export
    export_phases = []
    for p in phases:
        export_phases.append({
            "id": p.get("id"),
            "title": p.get("title"),
            "phase_type": p.get("phase_type"),
            "start_date": p.get("start_date"),
            "end_date": p.get("end_date"),
        })

    return {
        "format_version": "1.0",
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "distance_unit": "mi",
        "phases": export_phases,
        "workouts": export_workouts,
    }
