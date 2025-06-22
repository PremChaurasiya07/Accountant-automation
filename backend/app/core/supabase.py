import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

print(SUPABASE_URL, SUPABASE_KEY)

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable not found.")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable not found.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
