from fastapi import APIRouter, HTTPException, Request, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import tempfile
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
import io
import pickle
from urllib.parse import urlencode
from app.core.supabase import supabase

router = APIRouter(prefix="/drive", tags=["Google Drive"])

# Google Drive API configuration
SCOPES = ['https://www.googleapis.com/auth/drive.file']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.pickle'

# Models
class BackupRequest(BaseModel):
    user_id: str
    include_previous_data: bool = True
    backup_name: Optional[str] = None

class FileUploadRequest(BaseModel):
    user_id: str
    folder_name: Optional[str] = None

class DriveAuthResponse(BaseModel):
    auth_url: str
    state: str

# Helper functions
def get_credentials_path(user_id: str) -> str:
    """Get the path for storing user-specific credentials"""
    return f"tokens/token_{user_id}.pickle"

def create_credentials_file():
    """Create credentials.json file from environment variables"""
    credentials_data = {
        "installed": {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
            "project_id": os.environ.get("GOOGLE_PROJECT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
            "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
        }
    }
    
    os.makedirs("tokens", exist_ok=True)
    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(credentials_data, f)

def get_user_credentials(user_id: str) -> Optional[Credentials]:
    """Get stored credentials for a user"""
    token_path = get_credentials_path(user_id)
    
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            credentials = pickle.load(token)
            
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(GoogleRequest())
                with open(token_path, 'wb') as token:
                    pickle.dump(credentials, token)
                return credentials
            except Exception:
                return None
        return credentials
    return None

def save_user_credentials(user_id: str, credentials: Credentials):
    """Save credentials for a user"""
    token_path = get_credentials_path(user_id)
    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    
    with open(token_path, 'wb') as token:
        pickle.dump(credentials, token)

def get_drive_service(user_id: str):
    """Get Google Drive service for a user"""
    credentials = get_user_credentials(user_id)
    if not credentials:
        raise HTTPException(status_code=401, detail="User not authenticated with Google Drive")
    
    return build('drive', 'v3', credentials=credentials)

# Routes

@router.get("/auth/url")
async def get_auth_url(user_id: str):
    """Get Google Drive authentication URL"""
    try:
        # Create credentials file if it doesn't exist
        if not os.path.exists(CREDENTIALS_FILE):
            create_credentials_file()
        
        flow = InstalledAppFlow.from_client_secrets_file(
            CREDENTIALS_FILE, SCOPES
        )
        
        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store flow for later use
        flow_path = f"tokens/flow_{user_id}.pickle"
        os.makedirs("tokens", exist_ok=True)
        with open(flow_path, 'wb') as f:
            pickle.dump(flow, f)
        
        return {
            "auth_url": auth_url,
            "state": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")

@router.get("/auth/callback")
async def auth_callback(code: str, state: str):
    """Handle Google Drive OAuth callback"""
    try:
        # Load the flow
        flow_path = f"tokens/flow_{state}.pickle"
        if not os.path.exists(flow_path):
            raise HTTPException(status_code=400, detail="Invalid state or expired flow")
        
        with open(flow_path, 'rb') as f:
            flow = pickle.load(f)
        
        # Exchange code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save credentials for the user
        save_user_credentials(state, credentials)
        
        # Clean up flow file
        os.remove(flow_path)
        
        return {
            "message": "Google Drive authentication successful",
            "user_id": state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@router.post("/backup")
async def create_backup(request: BackupRequest):
    """Create a backup of user data to Google Drive"""
    try:
        # Get user's Google Drive service
        service = get_drive_service(request.user_id)
        
        # Get user data from Supabase (you'll need to implement this based on your data structure)
        user_data = await get_user_data_from_supabase(request.user_id)
        
        # Create backup folder
        folder_name = request.backup_name or f"Vyapari_Backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        
        folder = service.files().create(
            body=folder_metadata,
            fields='id'
        ).execute()
        
        folder_id = folder.get('id')
        
        # Save current data
        current_data = {
            "timestamp": datetime.now().isoformat(),
            "user_id": request.user_id,
            "data": user_data
        }
        
        # Create temporary file for current data
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as tmp_file:
            json.dump(current_data, tmp_file, indent=2)
            tmp_file_path = tmp_file.name
        
        # Upload current data
        file_metadata = {
            'name': 'current_data.json',
            'parents': [folder_id]
        }
        
        media = MediaFileUpload(tmp_file_path, mimetype='application/json')
        service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        # If user wants to include previous data
        if request.include_previous_data:
            previous_backups = await get_previous_backups(request.user_id)
            if previous_backups:
                previous_data = {
                    "timestamp": datetime.now().isoformat(),
                    "user_id": request.user_id,
                    "previous_backups": previous_backups
                }
                
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as tmp_file:
                    json.dump(previous_data, tmp_file, indent=2)
                    tmp_file_path = tmp_file.name
                
                file_metadata = {
                    'name': 'previous_backups.json',
                    'parents': [folder_id]
                }
                
                media = MediaFileUpload(tmp_file_path, mimetype='application/json')
                service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        
        return {
            "message": "Backup created successfully",
            "folder_id": folder_id,
            "folder_name": folder_name,
            "includes_previous_data": request.include_previous_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    folder_name: Optional[str] = Form(None)
):
    """Upload a file to Google Drive"""
    try:
        # Get user's Google Drive service
        service = get_drive_service(user_id)
        
        # Read file content
        file_content = await file.read()
        
        # Create file metadata
        file_metadata = {
            'name': file.filename
        }
        
        # If folder name is provided, create or find the folder
        if folder_name:
            folder_id = await get_or_create_folder(service, folder_name)
            file_metadata['parents'] = [folder_id]
        
        # Create media upload
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=file.content_type,
            resumable=True
        )
        
        # Upload file
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,size,createdTime'
        ).execute()
        
        return {
            "message": "File uploaded successfully",
            "file_id": uploaded_file.get('id'),
            "file_name": uploaded_file.get('name'),
            "file_size": uploaded_file.get('size'),
            "created_time": uploaded_file.get('createdTime')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/files")
async def list_files(user_id: str, folder_id: Optional[str] = None):
    """List files in Google Drive"""
    try:
        service = get_drive_service(user_id)
        
        query = "trashed=false"
        if folder_id:
            query += f" and '{folder_id}' in parents"
        
        results = service.files().list(
            q=query,
            pageSize=50,
            fields="nextPageToken, files(id, name, mimeType, size, createdTime, parents)"
        ).execute()
        
        files = results.get('files', [])
        
        return {
            "files": files,
            "total_count": len(files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.delete("/files/{file_id}")
async def delete_file(file_id: str, user_id: str):
    """Delete a file from Google Drive"""
    try:
        service = get_drive_service(user_id)
        
        service.files().delete(fileId=file_id).execute()
        
        return {
            "message": "File deleted successfully",
            "file_id": file_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.get("/status")
async def get_auth_status(user_id: str):
    """Check if user is authenticated with Google Drive"""
    try:
        credentials = get_user_credentials(user_id)
        if credentials:
            return {
                "authenticated": True,
                "expires_at": credentials.expiry.isoformat() if credentials.expiry else None
            }
        else:
            return {
                "authenticated": False
            }
    except Exception as e:
        return {
            "authenticated": False,
            "error": str(e)
        }

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify the drive API is working"""
    return {
        "message": "Google Drive API is working!",
        "status": "success",
        "timestamp": datetime.now().isoformat()
    }

# Helper functions for data operations
async def get_user_data_from_supabase(user_id: str) -> Dict[str, Any]:
    """Get user data from Supabase - implement based on your data structure"""
    try:
        # Example: Get invoices, products, etc.
        # You'll need to implement this based on your actual data structure
        
        # Get invoices
        invoices_response = supabase.table('invoices').select('*').eq('user_id', user_id).execute()
        invoices = invoices_response.data if invoices_response.data else []
        
        # Get products
        products_response = supabase.table('products').select('*').eq('user_id', user_id).execute()
        products = products_response.data if products_response.data else []
        
        return {
            "invoices": invoices,
            "products": products,
            "backup_timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error getting user data: {e}")
        return {"error": "Failed to retrieve user data"}

async def get_previous_backups(user_id: str) -> List[Dict[str, Any]]:
    """Get list of previous backups for the user"""
    try:
        # This would typically query your database for previous backup records
        # For now, returning empty list
        return []
    except Exception as e:
        print(f"Error getting previous backups: {e}")
        return []

async def get_or_create_folder(service, folder_name: str) -> str:
    """Get existing folder or create new one"""
    try:
        # Check if folder already exists
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])
        
        if files:
            return files[0]['id']
        
        # Create new folder
        folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        
        folder = service.files().create(
            body=folder_metadata,
            fields='id'
        ).execute()
        
        return folder.get('id')
        
    except Exception as e:
        raise Exception(f"Failed to get or create folder: {str(e)}")
