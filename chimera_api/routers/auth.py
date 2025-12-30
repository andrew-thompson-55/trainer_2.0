import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from db_client import supabase_admin

router = APIRouter(prefix="/v1", tags=["Auth"])
security = HTTPBearer()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")


# --- LOGIN ---
@router.post("/auth/google")
def login_with_google(body: dict):
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

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

        if not user:
            is_new_user = True
            new_user_data = {"email": email, "name": name, "google_id": google_sub}
            insert_res = supabase_admin.table("users").insert(new_user_data).execute()
            user = insert_res.data[0]

        # 3. Create Session Token (JWT)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        payload = {"sub": str(user["id"]), "email": user["email"], "exp": expiry}
        session_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {"token": session_token, "user": user, "isNewUser": is_new_user}

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


# --- VERIFY ---
@router.get("/auth/verify")
def verify_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"status": "valid", "user_id": payload["sub"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- USER MANAGEMENT ---
@router.delete("/users/me")
def delete_my_account(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
        supabase_admin.table("users").delete().eq("id", user_id).execute()
        return {"status": "deleted"}
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.put("/users/profile")
def update_profile(
    data: dict, credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
        supabase_admin.table("users").update(data).eq("id", user_id).execute()
        return {"status": "updated"}
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
