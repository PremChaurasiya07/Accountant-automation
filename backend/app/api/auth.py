# app/api/auth.py
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from fastapi.responses import JSONResponse, RedirectResponse
from gotrue.errors import AuthApiError
from app.core.supabase import supabase
from urllib.parse import urlencode
import os
router = APIRouter(prefix="/auth", tags=["Auth"])

### CONFIGS
GOOGLE_REDIRECT_URL = "http://localhost:8000/auth/callback"
FRONTEND_REDIRECT = "http://localhost:3000/"
SUPABASE_URL = os.environ.get("SUPABASE_URL")

### MODELS
class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


### EMAIL SIGNUP
@router.post("/signup")
def signup(payload: SignupRequest):
    try:
        result = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })
        return {
            "message": "Signup successful",
            "user": result.user,
            "session": result.session
        }
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


### EMAIL LOGIN
@router.post("/login")
def login(payload: LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })

        access_token = result.session.access_token
        refresh_token = result.session.refresh_token

        response = JSONResponse(content={"message": "Login successful"})
        response.set_cookie(
            key="access_token", value=access_token,
            httponly=True, secure=False, samesite="Lax", max_age=86400
        )
        response.set_cookie(
            key="refresh_token", value=refresh_token,
            httponly=True, secure=False, samesite="Lax", max_age=86400 * 7
        )
        return response
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/login/google")
def login_with_google():
    query_params = urlencode({
        "provider": "google",
        "redirect_to": GOOGLE_REDIRECT_URL
    })
    redirect_url = f"{SUPABASE_URL}/auth/v1/authorize?{query_params}"
    return RedirectResponse(url=redirect_url)



@router.get("/callback")
def auth_callback(request: Request):
    access_token = request.query_params.get("access_token")
    refresh_token = request.query_params.get("refresh_token")

    if not access_token or not refresh_token:
        raise HTTPException(status_code=400, detail="Missing tokens in callback")

    try:
        user = supabase.auth.get_user(access_token).user
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid token")

    response = RedirectResponse(url="http://localhost:3000/dashboard")
    response.set_cookie(
        key="access_token", value=access_token,
        httponly=True, secure=False, samesite="Lax", max_age=60 * 60 * 24
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token,
        httponly=True, secure=False, samesite="Lax", max_age=60 * 60 * 24 * 7
    )
    return response

### LOGOUT
@router.post("/logout")
def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


### GET CURRENT USER
@router.get("/me")
def get_me(request: Request):
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        user = supabase.auth.get_user(access_token).user
        return {"user": user}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
