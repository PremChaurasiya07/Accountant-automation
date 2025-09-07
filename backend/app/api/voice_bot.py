
# app/routes/voice_bot.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from app.api.agents.invoice_agent import get_vyapari_agent_executor

# --- Load Environment Variables ---
load_dotenv()

# --- Router and Request Model ---
router = APIRouter()

class InputData(BaseModel):
    user_id: str
    input_value: str

#======================================================================
#   VOICE BOT API ENDPOINT
#======================================================================
@router.post("/voice_bot")
async def voice_bot(data: InputData):
    """
    This endpoint uses a voice bot to handle user requests.
    """
    if not data.user_id or not data.input_value:
        raise HTTPException(status_code=400, detail="user_id and input_value are required.")

    try:
        # 1. Get the agent for the specific user. This loads their unique
        #    conversation history and tools.
        agent_executor = await get_vyapari_agent_executor(data.user_id)

        # 2. Invoke the agent with the user's input.
        #    The agent will now autonomously reason, use tools, and
        #    generate a response.
        response = await agent_executor.ainvoke({"input": data.input_value})

        # 3. Return the agent's final output to the user.
        return {"message": response.get("output", "I'm sorry, I encountered an issue. Please try again.")}

    except Exception as e:
        # Log the full error for debugging
        print(f"An error occurred in the autonomous agent: {e}")
        # Return a generic error to the user
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")