from app.core.supabase import supabase

def get_memory(user_id: str):
    res = supabase.table("conversation_memory").select("*").eq("user_id", user_id).execute()
    data = res.data
    if data and len(data) > 0:
        return data[0]["memory"]
    else:
        return []

def save_memory(user_id: str, memory):
    # Upsert
    supabase.table("conversation_memory").upsert({
        "user_id": user_id,
        "memory": memory
    }).execute()
