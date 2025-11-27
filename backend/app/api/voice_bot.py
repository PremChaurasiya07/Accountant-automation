from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import re
import logging
from typing import Optional  # <-- Import Optional

# Ensure you import the getter
from app.api.agents.invoice_agent import get_vyapari_agent_executor

logger = logging.getLogger(__name__)
load_dotenv()
router = APIRouter()

class InputData(BaseModel):
    user_id: str
    input_value: str

@router.post("/voice_bot")
async def voice_bot(data: InputData):
    if not data.user_id or not data.input_value:
        raise HTTPException(status_code=400, detail="user_id and input_value are required.")

    try:
        agent_executor = await get_vyapari_agent_executor(data.user_id)
        result = await agent_executor.ainvoke({"input": data.input_value})
        raw_text = result.get("output", "") 
        
        final_message = _extract_final_answer(raw_text)
        extracted_url = _extract_url(final_message) # Extract URL for UI button

        return {
            "message": final_message or "Task completed.", 
            "status": "success",
            "url": extracted_url
        }

    except Exception as e:
        logger.error(f"Agent Execution Error: {e}", exc_info=True)
        # Return 200 with error status so UI handles it gracefully
        return {
            "message": "I encountered a technical issue. Please try again.", 
            "status": "error"
        }

def _extract_final_answer(text: str) -> str:
    if not text: return ""
    if "Final Answer" in text:
        text = text.rsplit("Final Answer", 1)[-1]
        text = re.sub(r'^[\s:\-]*', '', text)
    # Robustly remove code blocks
    text = re.sub(r"```[a-zA-Z]*\s*(.*?)```", r"\1", text, flags=re.DOTALL)
    return text.strip()

# Fixed Type Hint here: changed 'str | None' to 'Optional[str]'
def _extract_url(text: str) -> Optional[str]:
    url_pattern = r'(https?://[^\s]+)'
    match = re.search(url_pattern, text)
    if match: return match.group(1).rstrip('.,;)}')
    return None