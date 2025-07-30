# app/services/state_manager.py

import json
import os
from typing import Dict, Any, List

STATE_DIR = "conversation_states"
if not os.path.exists(STATE_DIR):
    os.makedirs(STATE_DIR)

class ConversationStateManager:
    """Manages the state of a conversation for a given user."""
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.file_path = os.path.join(STATE_DIR, f"{self.user_id}_state.json")
        self.invoice_draft: Dict[str, Any] = {}
        self.memory: List[Dict[str, str]] = []
        self._load_state()

    def _load_state(self):
        """Loads state from a file if it exists."""
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r') as f:
                state = json.load(f)
                self.invoice_draft = state.get("invoice_draft", {})
                self.memory = state.get("memory", [])
        print(f"Loaded state for user {self.user_id}: Draft contains {len(self.invoice_draft)} keys.")


    def save_state(self):
        """Saves the current state to a file."""
        state = {
            "invoice_draft": self.invoice_draft,
            "memory": self.memory
        }
        with open(self.file_path, 'w') as f:
            json.dump(state, f, indent=2)
        print(f"Saved state for user {self.user_id}.")

    def get_draft(self) -> Dict[str, Any]:
        """Returns the current invoice draft."""
        return self.invoice_draft

    def set_draft(self, draft: Dict[str, Any]):
        """Sets the invoice draft."""
        self.invoice_draft = draft
        self.save_state()

    def clear_draft(self):
        """Clears the invoice draft and saves the state."""
        self.invoice_draft = {}
        self.save_state()
        
    def add_to_memory(self, human_message: str, ai_message: str):
        """Adds a human-ai interaction to the conversation memory."""
        self.memory.append({"role": "human", "content": human_message})
        self.memory.append({"role": "ai", "content": ai_message})
        self.save_state()