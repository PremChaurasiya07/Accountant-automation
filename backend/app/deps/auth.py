from fastapi import Depends, Header, HTTPException,Request
from app.core.supabase import supabase
import jwt
import os
from fastapi import Request, HTTPException
from app.core.supabase import supabase # Use the public client
from gotrue.errors import AuthApiError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # or fetch JWK dynamically

def verify_supabase_jwt(token: str):
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(request: Request):
    """
    Dependency function to get the current user from the Authorization header.
    Handles invalid, malformed, or expired tokens gracefully.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Token is empty")

    try:
        # Use the public client to validate the user's session token
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="User not found for this token")
        
        return user

    except AuthApiError as e:
        # This catches errors from Supabase like "invalid JWT", "token expired", etc.
        raise HTTPException(status_code=401, detail=f"Authentication error: {e}")
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during authentication: {str(e)}")
