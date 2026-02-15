# Deployment Checklist - Supabase Connection Fix

## What Was Fixed

The Supabase connection issue has been completely refactored with:
1. ✅ Comprehensive credential validation (strips whitespace, checks format)
2. ✅ Actual connection testing (queries database to verify it works)
3. ✅ Detailed error messages with actionable fixes
4. ✅ Fail-fast behavior (server won't start with bad config)

## Before Deploying to Render

### Step 1: Test Locally

```bash
cd chimera_api

# Check environment variables
python check_env.py

# Run full connection test
python test_supabase_connection.py
```

If the test passes ✅, you're ready to deploy!

### Step 2: Get Correct Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings → API**
4. Copy these values:
   - **Project URL**: Should be `https://xxxxx.supabase.co`
   - **service_role key**: Should be ~230 characters (NOT the anon key!)

### Step 3: Verify Database is Active

1. In Supabase dashboard, go to **Settings → Database**
2. Check status - should say **"Active"**
3. If paused, click **"Resume Database"**

## Deploying to Render

### Step 1: Set Environment Variables

1. Go to your Render dashboard
2. Select your service (chimera_api)
3. Click **"Environment"** in the left sidebar
4. Add/update these variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-230-character-service-role-key
```

**Critical:** Make sure there's no extra whitespace before/after the values!

### Step 2: Save and Deploy

1. Click **"Save Changes"** in Render
2. This will automatically trigger a redeploy
3. Wait for deployment to complete (~2-5 minutes)

### Step 3: Check Logs

1. In Render dashboard, click **"Logs"** tab
2. Look for these messages during startup:

**Success looks like:**
```
🔄 Initializing Supabase client...
   URL: https://your-project.supabase.co
   Key length: 230 characters
🔄 Testing database connection...
✅ Database connection successful!
================================================================================
```

**Failure looks like:**
```
❌ FATAL: Supabase credentials missing
or
❌ FATAL: Supabase client created but connection test failed
```

If you see ❌, read the specific error message for the fix.

## Common Deployment Issues

### Issue: "service_role key not found in env"

**Fix:**
- You forgot to set `SUPABASE_SERVICE_KEY` in Render
- Variable name typo (check spelling)

### Issue: "connection test failed"

**Fix:**
- Wrong key (using anon instead of service_role)
- Database is paused (unpause in Supabase dashboard)
- Old/expired key (regenerate in Supabase dashboard)

### Issue: "Deployment succeeded but API returns 500"

**Fix:**
- Check Render logs for the actual error
- Might be a different environment variable missing
- Run `python check_env.py` locally to see what's needed

## Post-Deployment Verification

### Test your API:

```bash
# Health check
curl https://your-app.onrender.com/

# Should return:
{"status": "Chimera is Online"}
```

### Test authenticated endpoint (requires valid JWT):

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-app.onrender.com/v1/workouts
```

## Emergency Rollback

If deployment fails completely:

1. Revert the `db_client.py` changes in git
2. Push to main
3. Render will auto-deploy the previous version

## Future: Preventing This Issue

The new `db_client.py` will:
- ✅ Catch bad configs immediately on startup
- ✅ Provide clear error messages in logs
- ✅ Prevent confusing runtime errors
- ✅ Test the actual database connection

You should never see "'NoneType' object has no attribute 'table'" again!

## Need Help?

1. Check `SUPABASE_TROUBLESHOOTING.md` for detailed issue resolution
2. Run diagnostic tools: `python test_supabase_connection.py`
3. Check Render logs for specific error messages
