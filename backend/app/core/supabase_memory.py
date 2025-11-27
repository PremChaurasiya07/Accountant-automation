import json
import logging
from typing import List
from app.core.supabase import supabase  # Uses your existing client
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict

class SupabaseChatMessageHistory(BaseChatMessageHistory):
    """
    A robust ChatMessageHistory that handles RLS conflicts by explicitly
    checking for existence before writing.
    """
    
    def __init__(self, user_id: str):
        if not user_id:
            raise ValueError("user_id must be provided.")
        self.user_id = user_id
        self.table_name = "conversation_memory"
        logging.info(f"SupabaseChatMessageHistory initialized for user: {self.user_id}")

    @property
    def messages(self) -> List[BaseMessage]:
        """Retrieve messages from Supabase"""
        try:
            response = supabase.table(self.table_name)\
                               .select("memory")\
                               .eq("user_id", self.user_id)\
                               .execute()
            
            if response.data and len(response.data) > 0:
                stored = response.data[0].get("memory")
                if stored:
                    # Handle case where data might be stored as a string
                    if isinstance(stored, str):
                        try:
                            stored = json.loads(stored)
                        except json.JSONDecodeError:
                            logging.error("[Memory] Failed to decode JSON string in memory.")
                            return []
                    return messages_from_dict(stored)
        except Exception as e:
            logging.error(f"[Memory] Read Error: {e}")
        
        return []

    def add_message(self, message: BaseMessage) -> None:
        """Append a message to the history in Supabase"""
        try:
            # 1. Get current messages
            current_messages = self.messages
            current_messages.append(message)
            serialized = messages_to_dict(current_messages)

            # 2. Check if row exists (Explicit Check)
            # This avoids the 'Duplicate Key' error caused by RLS hiding rows from 'upsert'
            check = supabase.table(self.table_name).select("id").eq("user_id", self.user_id).execute()
            
            if check.data and len(check.data) > 0:
                # Row exists -> UPDATE
                supabase.table(self.table_name)\
                        .update({
                            "memory": serialized,
                            "updated_at": "now()"
                        })\
                        .eq("user_id", self.user_id)\
                        .execute()
            else:
                # Row does not exist -> INSERT
                # We use a try/catch here in case of race conditions
                try:
                    supabase.table(self.table_name)\
                            .insert({
                                "user_id": self.user_id,
                                "memory": serialized,
                                "updated_at": "now()"
                            })\
                            .execute()
                except Exception as insert_err:
                    # If insert fails with 23505, it means the row appeared between check and insert
                    if "23505" in str(insert_err):
                        logging.warning("[Memory] Race condition detected. Retrying as UPDATE.")
                        supabase.table(self.table_name)\
                                .update({ "memory": serialized, "updated_at": "now()" })\
                                .eq("user_id", self.user_id)\
                                .execute()
                    else:
                        raise insert_err

        except Exception as e:
            # Log but don't crash the agent execution
            logging.error(f"[Memory] Critical Save Error: {e}", exc_info=True)

    def clear(self) -> None:
        """Clear all messages from the history in Supabase"""
        try:
            # Instead of deleting the row (which might break refs), we just empty the memory array
            supabase.table(self.table_name)\
                    .update({ "memory": [] })\
                    .eq("user_id", self.user_id)\
                    .execute()
        except Exception as e:
            logging.error(f"[Memory] Clear Error: {e}")