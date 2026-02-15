import os
import sys
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Load credentials
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")

# CRITICAL: Fail fast if credentials are missing
if not url or not key:
    logger.critical(
        "❌ FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables"
    )
    logger.critical("❌ Database features cannot function without these credentials")
    sys.exit(1)

# Initialize the Admin Client
try:
    print(f"DEBUG: Key length: {len(key)}")
    print(f"DEBUG: Key starts with: {key[:5]}...")
    supabase_admin: Client = create_client(url, key)
    logger.info("✅ Supabase client initialized successfully")
except Exception as e:
    logger.critical(f"❌ FATAL: Failed to initialize Supabase client: {e}")
    sys.exit(1)
