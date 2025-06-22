from fastapi import Depends, Header, HTTPException,Request
from app.core.supabase import supabase
import jwt
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # or fetch JWK dynamically

def verify_supabase_jwt(token: str):
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.replace("Bearer ", "")
    # Now use token to get user
    user = supabase.auth.get_user(token).user
    # print(user)
    return user