import os
import logging
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from db_client import supabase_admin
from schemas import ProfileUpdate, GoogleLoginRequest
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1", tags=["Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")


# --- LOGIN ---
@router.post("/auth/google")
def login_with_google(body: GoogleLoginRequest):
    token = body.token

    try:
        # 1. Verify Google Token
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        email = id_info.get("email")
        google_sub = id_info.get("sub")
        name = id_info.get("name", "Athlete")

        # 2. Check DB
        response = (
            supabase_admin.table("users").select("*").eq("email", email).execute()
        )
        user = response.data[0] if response.data else None
        is_new_user = False

        # TEMP: Only allow existing users (for public testing/pen testing)
        if not user:
            logger.warning(f"Login attempt from non-existent user: {email}")
            raise HTTPException(
                status_code=403, detail="Access restricted to existing users"
            )

        # COMMENTED OUT: New user registration (restore after testing)
        # if not user:
        #     is_new_user = True
        #     new_user_data = {"email": email, "name": name, "google_id": google_sub}
        #     insert_res = supabase_admin.table("users").insert(new_user_data).execute()
        #     user = insert_res.data[0]

        # 3. Create Session Token (JWT)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {"sub": str(user["id"]), "email": user["email"], "exp": expiry}
        session_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {"token": session_token, "user": user, "isNewUser": is_new_user}

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
    except HTTPException as he:
        raise he  # Let the 403 (or any other HTTP error) pass through!
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# --- WEB LOGIN (Access Token) ---
@router.post("/auth/google/web")
def login_with_google_web(body: dict):
    access_token = body.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access_token")

    try:
        # 1. Verify Access Token and get user info from Google
        import urllib.request
        import json

        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}

        req = urllib.request.Request(userinfo_url, headers=headers)

        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                raise ValueError("Invalid access token")
            user_info = json.loads(response.read().decode())

        email = user_info.get("email")
        name = user_info.get("name", "Athlete")
        google_sub = user_info.get("id")

        if not email:
            raise ValueError("No email in user info")

        # 2. Check DB
        db_response = (
            supabase_admin.table("users").select("*").eq("email", email).execute()
        )
        user = db_response.data[0] if db_response.data else None
        is_new_user = False

        # TEMP: Only allow existing users (for public testing/pen testing)
        if not user:
            logger.warning(f"Web login attempt from non-existent user: {email}")
            raise HTTPException(
                status_code=403, detail="Access restricted to existing users"
            )

        # 3. Create Session Token (JWT)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {"sub": str(user["id"]), "email": user["email"], "exp": expiry}
        session_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        logger.info(f"✅ Web login successful for {email}")
        return {"token": session_token, "user": user, "isNewUser": is_new_user}

    except ValueError as ve:
        logger.error(f"Web auth error: {ve}")
        raise HTTPException(status_code=401, detail="Invalid access token")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Web Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# --- VERIFY ---
@router.get("/auth/verify")
def verify_session(user_id: str = Depends(get_current_user)):
    return {"status": "valid", "user_id": user_id}


# --- USER MANAGEMENT ---
@router.delete("/users/me")
def delete_my_account(user_id: str = Depends(get_current_user)):
    supabase_admin.table("users").delete().eq("id", user_id).execute()
    return {"status": "deleted"}


@router.put("/users/profile")
def update_profile(data: ProfileUpdate, user_id: str = Depends(get_current_user)):
    update_dict = data.model_dump(exclude_unset=True)
    supabase_admin.table("users").update(update_dict).eq("id", user_id).execute()
    return {"status": "updated"}
