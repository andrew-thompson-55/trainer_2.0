import os
import sys
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def initialize_supabase() -> Client:
    """
    Initialize and validate Supabase client with comprehensive error handling.
    Returns a working Supabase client or exits the application.
    """
    # 1. Load and clean credentials
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    # 2. Validate credentials exist
    if not url or not key:
        logger.critical("=" * 80)
        logger.critical("❌ FATAL: Supabase credentials missing")
        logger.critical("Required environment variables:")
        logger.critical("  - SUPABASE_URL: %s", "✓ Present" if url else "✗ MISSING")
        logger.critical("  - SUPABASE_SERVICE_KEY: %s", "✓ Present" if key else "✗ MISSING")
        logger.critical("=" * 80)
        sys.exit(1)

    # 3. Validate URL format
    if not url.startswith("https://"):
        logger.critical("=" * 80)
        logger.critical("❌ FATAL: SUPABASE_URL must start with 'https://'")
        logger.critical("Current value: %s", url[:50])
        logger.critical("=" * 80)
        sys.exit(1)

    # 4. Validate key format (should be a JWT-like string)
    if len(key) < 100:
        logger.critical("=" * 80)
        logger.critical("❌ FATAL: SUPABASE_SERVICE_KEY appears invalid (too short)")
        logger.critical("Key length: %d characters (expected 200+)", len(key))
        logger.critical("Key preview: %s...", key[:20])
        logger.critical("=" * 80)
        sys.exit(1)

    # 5. Create client
    try:
        logger.info("🔄 Initializing Supabase client...")
        logger.info("   URL: %s", url)
        logger.info("   Key length: %d characters", len(key))

        client = create_client(url, key)

        # 6. Test the connection by making a simple query
        logger.info("🔄 Testing database connection...")
        try:
            # Try to query the users table (should exist based on your schema)
            test_response = client.table("users").select("id").limit(1).execute()
            logger.info("✅ Database connection successful!")
            logger.info("=" * 80)
            return client
        except Exception as test_error:
            logger.critical("=" * 80)
            logger.critical("❌ FATAL: Supabase client created but connection test failed")
            logger.critical("Error: %s", str(test_error))
            logger.critical("Possible causes:")
            logger.critical("  1. Invalid SUPABASE_SERVICE_KEY (wrong key or expired)")
            logger.critical("  2. Database is paused or unavailable")
            logger.critical("  3. Network connectivity issues")
            logger.critical("  4. Table 'users' doesn't exist in database")
            logger.critical("=" * 80)
            sys.exit(1)

    except Exception as e:
        logger.critical("=" * 80)
        logger.critical("❌ FATAL: Failed to create Supabase client")
        logger.critical("Error type: %s", type(e).__name__)
        logger.critical("Error message: %s", str(e))
        logger.critical("=" * 80)
        sys.exit(1)

# Initialize the client at module load
supabase_admin = initialize_supabase()
