#!/usr/bin/env python3
"""
Supabase Connection Diagnostic Tool
Run this script to test your Supabase connection locally before deploying.
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_section(title):
    print("\n" + "=" * 80)
    print(f"{BLUE}{title}{RESET}")
    print("=" * 80)

def print_success(msg):
    print(f"{GREEN}✓{RESET} {msg}")

def print_error(msg):
    print(f"{RED}✗{RESET} {msg}")

def print_warning(msg):
    print(f"{YELLOW}⚠{RESET} {msg}")

def main():
    print_section("Supabase Connection Diagnostic Tool")

    # Step 1: Load environment variables
    print("\n1. Loading environment variables...")
    load_dotenv()

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    # Step 2: Check if credentials exist
    print_section("2. Checking Credentials")

    if url:
        print_success(f"SUPABASE_URL is set: {url}")
    else:
        print_error("SUPABASE_URL is NOT set")
        print("   Set it in your .env file or environment variables")
        return False

    if key:
        print_success(f"SUPABASE_SERVICE_KEY is set (length: {len(key)} chars)")
    else:
        print_error("SUPABASE_SERVICE_KEY is NOT set")
        print("   Set it in your .env file or environment variables")
        return False

    # Step 3: Validate URL format
    print_section("3. Validating URL Format")

    if url.startswith("https://"):
        print_success("URL starts with 'https://'")
    else:
        print_error(f"URL must start with 'https://', got: {url[:20]}...")
        return False

    if ".supabase.co" in url:
        print_success("URL appears to be a valid Supabase URL")
    else:
        print_warning("URL doesn't contain '.supabase.co' - make sure it's correct")

    # Step 4: Validate key format
    print_section("4. Validating Service Key")

    if len(key) > 200:
        print_success(f"Key length looks good ({len(key)} characters)")
    else:
        print_error(f"Key is too short ({len(key)} chars, expected 200+)")
        print("   This doesn't look like a valid service role key")
        print(f"   Key preview: {key[:30]}...")
        return False

    if key.startswith("eyJ"):
        print_success("Key appears to be a JWT token (starts with 'eyJ')")
    else:
        print_warning("Key doesn't start with 'eyJ' (JWT format)")
        print(f"   Key starts with: {key[:10]}")

    # Step 5: Create client
    print_section("5. Creating Supabase Client")

    try:
        client = create_client(url, key)
        print_success("Supabase client created successfully")
    except Exception as e:
        print_error(f"Failed to create client: {e}")
        return False

    # Step 6: Test connection
    print_section("6. Testing Database Connection")

    try:
        # Test query to users table
        print("   Attempting to query 'users' table...")
        response = client.table("users").select("id").limit(1).execute()
        print_success("Successfully queried 'users' table")
        print(f"   Response data length: {len(response.data)}")

        # Test query to workouts table
        print("   Attempting to query 'planned_workouts' table...")
        response2 = client.table("planned_workouts").select("id").limit(1).execute()
        print_success("Successfully queried 'planned_workouts' table")
        print(f"   Response data length: {len(response2.data)}")

    except Exception as e:
        print_error(f"Database connection test failed: {e}")
        print("\n   Possible causes:")
        print("   1. Wrong SUPABASE_SERVICE_KEY (check Supabase dashboard)")
        print("   2. Database is paused (unpause in Supabase dashboard)")
        print("   3. Table doesn't exist (check your schema)")
        print("   4. Network/firewall issues")
        return False

    # Final summary
    print_section("✅ All Tests Passed!")
    print("\nYour Supabase connection is working correctly.")
    print("You can now deploy your application with confidence.")
    print("\nNext steps:")
    print("  1. Make sure these same credentials are set in Render")
    print("  2. Deploy your application")
    print("  3. Check Render logs for the connection success message")

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Unexpected error: {e}{RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
