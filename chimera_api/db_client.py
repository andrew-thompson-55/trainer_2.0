import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Load credentials
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")

# Safety check
if not url or not key:
    # We print a warning but don't crash immediately to allow build steps to run
    print("WARNING: Supabase credentials missing. Database features will fail.")

# Initialize the Admin Client
# We use 'try' so imports don't crash if variables are missing during local tests
try:
    supabase_admin: Client = create_client(url, key)
except Exception as e:
    supabase_admin = None
    print(f"Failed to initialize Supabase client: {e}")
