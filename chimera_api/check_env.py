#!/usr/bin/env python3
"""
Quick environment variable checker - shows what's loaded without exposing full values.
Safe to run in production/Render.
"""
import os
from dotenv import load_dotenv

load_dotenv()

def mask_value(value, show_chars=10):
    """Show only first few chars of sensitive values."""
    if not value:
        return "❌ NOT SET"
    if len(value) > show_chars:
        return f"✓ Set ({len(value)} chars): {value[:show_chars]}..."
    return f"✓ Set ({len(value)} chars): {value}"

print("=" * 80)
print("Environment Variables Status")
print("=" * 80)

env_vars = [
    ("SUPABASE_URL", False),  # Not sensitive, show full
    ("SUPABASE_SERVICE_KEY", True),  # Sensitive, mask
    ("JWT_SECRET", True),
    ("GOOGLE_CLIENT_ID", False),
    ("STRAVA_CLIENT_ID", False),
    ("STRAVA_CLIENT_SECRET", True),
    ("STRAVA_REFRESH_TOKEN", True),
    ("STRAVA_VERIFY_TOKEN", True),
    ("GEMINI_API_KEY", True),
    ("GOOGLE_CREDENTIALS_JSON", True),
    ("GOOGLE_CALENDAR_ID", False),
]

for var_name, is_sensitive in env_vars:
    value = os.getenv(var_name, "").strip()
    if is_sensitive:
        status = mask_value(value, show_chars=10)
    else:
        status = value if value else "❌ NOT SET"

    print(f"{var_name:30} {status}")

print("=" * 80)

# Check critical vars for Supabase
critical = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
missing = [var for var in critical if not os.getenv(var, "").strip()]

if missing:
    print("⚠️  WARNING: Missing critical variables:", ", ".join(missing))
    print("⚠️  Application will fail to start without these!")
else:
    print("✅ All critical Supabase variables are set")

print("=" * 80)
