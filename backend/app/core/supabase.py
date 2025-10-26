import os
import asyncio
import logging
from dotenv import load_dotenv
from typing import Optional

# 1. Import BOTH sync and async tools
from supabase import create_client, Client, acreate_client, AsyncClient

# Load environment variables
load_dotenv()

# --- Load all three required variables ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_KEY")

# --- Validate ---
if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("One or more required Supabase environment variables are missing.")

# ==============================================================================
# --- SYNCHRONOUS CLIENTS (for def functions) ---
# ==============================================================================

# 1. Default Public Client (Sync)
# For 'def' functions like your auth.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
logging.info("Default Supabase public client (supabase) initialized.")

# 2. Admin Client (Sync)
# For 'def' functions that need admin rights.
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
logging.info("Supabase admin client (supabase_admin) initialized.")


# ==============================================================================
# --- ASYNCHRONOUS CLIENTS (for async def functions) ---
# ==============================================================================

# --- Global "cache" for your async clients ---
_supabase_async_client: Optional[AsyncClient] = None
_supabase_async_admin_client: Optional[AsyncClient] = None
_client_lock = asyncio.Lock()
_admin_client_lock = asyncio.Lock()

async def get_supabase_client() -> AsyncClient:
    """
    Asynchronously gets the shared public (ANON_KEY) AsyncClient.
    Initializes it on the first call.
    """
    global _supabase_async_client
    
    async with _client_lock:
        if _supabase_async_client is None:
            logging.info("Initializing Supabase public AsyncClient (ANON_KEY)...")
            _supabase_async_client = await acreate_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            logging.info("Supabase public AsyncClient initialized.")
    return _supabase_async_client

async def get_supabase_admin_client() -> AsyncClient:
    """
    Asynchronously gets the shared admin (SERVICE_ROLE_KEY) AsyncClient.
    Initializes it on the first call.
    """
    global _supabase_async_admin_client
    
    async with _admin_client_lock:
        if _supabase_async_admin_client is None:
            logging.info("Initializing Supabase admin AsyncClient (SERVICE_KEY)...")
            _supabase_async_admin_client = await acreate_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logging.info("Supabase admin AsyncClient initialized.")
    return _supabase_async_admin_client