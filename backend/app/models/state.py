# app/models/state.py

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ConversationState(BaseModel):
    """Manages the full state of a user's conversation."""
    user_id: str
    chat_history: List[Dict[str, str]] = Field(default_factory=list, description="History of the conversation.")
    draft_invoice: Dict[str, Any] = Field(default_factory=dict, description="The invoice currently being created or edited.")
    last_tool_response: Dict[str, Any] = Field(default_factory=dict, description="The data returned from the last executed tool.")

class InputData(BaseModel):
    """Model for the incoming API request."""
    user_id: str
    input_value: str
