# import os
# from dotenv import load_dotenv
# from supabase import create_client, Client

# load_dotenv()

# SUPABASE_URL = os.environ.get("SUPABASE_URL")
# SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# print(SUPABASE_URL, SUPABASE_KEY)

# if not SUPABASE_URL:
#     raise ValueError("SUPABASE_URL environment variable not found.")
# if not SUPABASE_KEY:
#     raise ValueError("SUPABASE_KEY environment variable not found.")

# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from a .env file
load_dotenv()

# --- Load all three required variables from your .env file ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_KEY")

# --- Validate that all environment variables are present ---
if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("One or more required Supabase environment variables are missing.")

# --- Initialize the two distinct clients ---

# 1. Default Public Client (Guest Pass)
# Use this for most of your app, especially for authenticating user tokens.
# It respects your Row Level Security (RLS) policies.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
logging.info("Default Supabase public client (supabase) initialized.")

# 2. Admin Client (Master Key)
# Use this ONLY in secure backend endpoints for tasks that require admin rights.
# It bypasses all RLS policies.
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
logging.info("Supabase admin client (supabase_admin) initialized.")