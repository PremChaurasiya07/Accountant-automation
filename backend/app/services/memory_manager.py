# app/services/memory_manager.py

import json
from app.core.supabase import supabase

# A default empty state for a new conversation
EMPTY_MEMORY = {
    "last_intent": None,
    "partial_invoice": {},
    "chat_history": [],
}

def load_conversation_memory(user_id: str) -> dict:
    """
    Loads the most recent conversation memory for a user from Supabase.
    Keeps a rolling history of the last 6 messages (3 pairs of human/ai).
    """
    try:
        res = (
            supabase.table("conversation_memory")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

        if not res or not res.data:
            return EMPTY_MEMORY.copy()

        mem = res.data.get("memory")
        if isinstance(mem, dict):
            # Keep only the last 6 chat messages for context
            chat_history = mem.get("chat_history", [])
            mem["chat_history"] = chat_history[-6:] if isinstance(chat_history, list) else []
            return mem
        
        return EMPTY_MEMORY.copy()

    except Exception as e:
        print(f"Error loading memory for user {user_id}: {e}")
        return EMPTY_MEMORY.copy()


def save_conversation_memory(user_id: str, memory: dict):
    """Saves the conversation memory state to Supabase."""
    try:
        # Check if a record for the user already exists
        existing = supabase.table("conversation_memory").select("id").eq("user_id", user_id).execute()
        
        if existing.data:
            # Update the existing record
            supabase.table("conversation_memory").update({
                "memory": memory,
                "updated_at": "now()"
            }).eq("user_id", user_id).execute()
        else:
            # Insert a new record
            supabase.table("conversation_memory").insert({
                "user_id": user_id,
                "memory": memory
            }).execute()
    except Exception as e:
        print(f"Error saving memory for user {user_id}: {e}")


def clear_conversation_memory(user_id: str):
    """Deletes the conversation memory for a user."""
    try:
        supabase.table("conversation_memory").delete().eq("user_id", user_id).execute()
    except Exception as e:
        print(f"Error clearing memory for user {user_id}: {e}")