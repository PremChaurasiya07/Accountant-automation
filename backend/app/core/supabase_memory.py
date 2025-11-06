# Fully replace your file at: app/memory/supabase_memory.py

import json
import logging
from typing import List
from app.core.supabase import supabase  # Your existing Supabase client
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict

class SupabaseChatMessageHistory(BaseChatMessageHistory):
    """
    A ChatMessageHistory implementation that stores messages in your 
    'conversation_memory' Supabase table.
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
            
            if response.data and response.data[0].get("memory"):
                stored_messages = response.data[0]["memory"]
                
                # --- THIS IS THE FIX ---
                # Check if the retrieved data is a string, and if so, parse it
                if isinstance(stored_messages, str):
                    logging.warning("[Memory] Memory was a string. Attempting to parse JSON.")
                    try:
                        stored_messages = json.loads(stored_messages)
                    except json.JSONDecodeError as e:
                        logging.error(f"[Memory] Error: could not decode memory string: {e}")
                        return []
                # --- END OF FIX ---

                if not isinstance(stored_messages, list):
                    logging.error(f"[Memory] Error: memory is not a list, but a {type(stored_messages)}.")
                    return []

                return messages_from_dict(stored_messages)
            
        except Exception as e:
            # This is the line that's logging your error
            logging.error(f"[Memory] Error retrieving messages from Supabase: {e}", exc_info=True)
        
        return []

    def add_message(self, message: BaseMessage) -> None:
        """Append a message to the history in Supabase"""
        current_messages = self.messages
        current_messages.append(message)
        
        serialized_messages = messages_to_dict(current_messages)
        
        try:
            supabase.table(self.table_name)\
                    .upsert({
                        "user_id": self.user_id,
                        "memory": serialized_messages,
                        "updated_at": "now()"
                    }, on_conflict="user_id")\
                    .execute()
                    
        except Exception as e:
            logging.error(f"[Memory] Error saving message to Supabase: {e}", exc_info=True)

    def clear(self) -> None:
        """Clear all messages from the history in Supabase"""
        try:
            supabase.table(self.table_name)\
                    .delete()\
                    .eq("user_id", self.user_id)\
                    .execute()
        except Exception as e:
            logging.error(f"[Memory] Error clearing messages from Supabase: {e}", exc_info=True)