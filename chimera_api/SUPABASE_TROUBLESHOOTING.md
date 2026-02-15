# Supabase Connection Troubleshooting Guide

## Quick Diagnosis

Run the diagnostic script to identify issues:
```bash
cd chimera_api
python test_supabase_connection.py
```

## Common Issues and Solutions

### 1. "SUPABASE_SERVICE_KEY appears invalid (too short)"

**Cause:** You're using the wrong key type.

**Solution:**
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy the `service_role` key (NOT the `anon` key)
5. The service role key should be 200+ characters long

**Important:** The `anon` key is for client-side use only. The backend needs the `service_role` key.

### 2. "Database connection test failed"

**Possible causes:**

#### A. Wrong Key
- You copied the anon key instead of service_role key
- You have an old/expired key (regenerate in dashboard)

#### B. Database Paused
- Free-tier Supabase projects pause after inactivity
- Go to dashboard and click "Resume Database"

#### C. Missing Tables
- The `users` or `planned_workouts` tables don't exist
- Run your schema migration/setup scripts

#### D. Whitespace in Environment Variables
- Keys have trailing spaces or newlines
- The new `db_client.py` automatically strips these now

### 3. Environment Variables Not Loading

**For local development:**
```bash
# Create .env file in chimera_api/
cp .env.example .env
# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

**For Render deployment:**
1. Go to Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add/update these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
5. Click "Save Changes"
6. Manually trigger a deploy

### 4. "SUPABASE_URL must start with 'https://'"

**Solution:**
- Your URL should look like: `https://abcdefghijk.supabase.co`
- Don't include paths like `/rest/v1/` - just the base URL

### 5. Connection Works Locally But Fails on Render

**Checklist:**
1. ✓ Are the env vars set in Render's dashboard?
2. ✓ Did you click "Save Changes" after updating vars?
3. ✓ Did you trigger a new deploy after saving?
4. ✓ Are you using the SERVICE_ROLE key (not anon key)?
5. ✓ Is your Supabase database active (not paused)?

**How to verify on Render:**
1. Go to Render dashboard
2. Open your service
3. Check the "Logs" tab
4. Look for these messages:
   ```
   🔄 Initializing Supabase client...
   🔄 Testing database connection...
   ✅ Database connection successful!
   ```
5. If you see ❌ errors, read the specific error message

### 6. "Failed to create Supabase client"

**This is a generic error. Check:**
1. Network connectivity (firewall, proxy)
2. Python version (should be 3.11+)
3. Supabase library version: `pip show supabase`
   - Should be 2.10.0 or newer
4. Dependencies installed: `pip install -r requirements.txt`

## Getting Your Supabase Credentials

### Step-by-step:

1. **Login to Supabase**
   - Go to https://app.supabase.com
   - Sign in with your account

2. **Select Your Project**
   - Click on your project (should be named something like "Chimera" or "trainer")

3. **Get Your URL**
   - Go to Settings → API
   - Copy "Project URL" (starts with `https://`)
   - Example: `https://abcdefghijk.supabase.co`

4. **Get Your Service Key**
   - Same page (Settings → API)
   - Scroll down to "Project API keys"
   - Copy `service_role` (the longer key, ~230 characters)
   - **DO NOT** copy the `anon` key

5. **Verify Your Database is Running**
   - Go to Settings → Database
   - Check status - should say "Active"
   - If paused, click "Resume"

## Testing Your Fix

### Local Testing:
```bash
cd chimera_api
python test_supabase_connection.py
```

### Test Your API:
```bash
# Start the server
uvicorn main:app --reload

# In another terminal, test the health endpoint
curl http://localhost:8000/
```

### Deploy to Render:
```bash
git add .
git commit -m "Fix Supabase connection"
git push origin main
```

Then check Render logs for the success messages.

## Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Generate new credentials:**
   - In Supabase dashboard, go to Settings → API
   - Click "Reset service_role key"
   - Update your .env and Render environment variables
   - Redeploy

2. **Check Supabase status:**
   - Visit https://status.supabase.com
   - See if there are any ongoing incidents

3. **Verify your account:**
   - Make sure your Supabase project isn't suspended
   - Check billing status if on paid plan

## Security Notes

- **NEVER** commit `.env` file to git
- **NEVER** share your `service_role` key publicly
- The `service_role` key bypasses Row Level Security - use carefully
- Rotate keys periodically for security
