
# """
# Production-Ready Vyapari AI Agent Orchestrator with Persistent Memory

# This definitive version solves two core problems:
# 1.  State Management: The prompt now explicitly instructs the agent to use information
#     gathered from one tool (e.g., a buyer's address) in subsequent tool calls.
# 2.  Dependency Injection: The tool handler is now intelligent and can provide necessary
#     dependencies like the 'supabase' client or 'llm' instance to the tool functions that need them.
# 3.  Persistent Memory: Re-introduces SupabaseConversationMemory to save and load chat
#     history, making the agent stateful across server restarts.
# """

# import os
# import json
# import asyncio
# import inspect
# import logging
# from datetime import date
# from typing import Dict, Any, Union, Callable, List

# from fastapi import HTTPException
# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.messages import AIMessage, HumanMessage
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from google.api_core.exceptions import ResourceExhausted
# from pydantic import PrivateAttr

# # --- App-specific Imports ---
# from app.tools.sql_query_tool import *
# from app.core.supabase import supabase

# # --- Logging ---
# logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
# logger = logging.getLogger("vyapari.agent")


# # --- Persistent Memory using Supabase ---
# class SupabaseConversationMemory(ConversationBufferWindowMemory):
#     """Manages conversation history with Supabase persistence."""
#     _supabase_client: Any = PrivateAttr()
#     _user_id: str = PrivateAttr()

#     def __init__(self, user_id: str, k: int = 10, **kwargs: Any):
#         super().__init__(k=k, return_messages=True, memory_key="chat_history", input_key="input", **kwargs)
#         self._user_id = user_id
#         self._supabase_client = supabase
#         self._load_memory()

#     def _load_memory(self) -> None:
#         """Loads history from the 'memory' column in Supabase."""
#         try:
#             res = self._supabase_client.table("conversation_memory").select("memory").eq("user_id", self._user_id).single().execute()
#             if res.data and res.data.get("memory"):
#                 history_json = res.data["memory"]
#                 for msg in history_json:
#                     if isinstance(msg, dict):
#                         if msg.get("type") == "human": self.chat_memory.add_message(HumanMessage(content=msg.get("content", "")))
#                         elif msg.get("type") == "ai": self.chat_memory.add_message(AIMessage(content=msg.get("content", "")))
#                 logger.info(f"✅ Loaded {len(self.chat_memory.messages)} messages for user {self._user_id}.")
#         except Exception as e:
#             logger.warning(f"Could not load memory for user {self._user_id}. Starting fresh. Error: {e}")

#     def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> None:
#         super().save_context(inputs, outputs)
#         history_to_save = [{"type": msg.type, "content": msg.content} for msg in self.chat_memory.messages]
#         asyncio.create_task(self._async_upsert(history_to_save))

#     async def _async_upsert(self, history: List[Dict[str, str]]) -> None:
#         try:
#             await asyncio.to_thread(
#                 self._supabase_client.table("conversation_memory").upsert,
#                 {"user_id": self._user_id, "memory": history}, on_conflict="user_id"
#             )
#         except Exception as e:
#             logger.error(f"Async upsert to Supabase failed for user {self._user_id}: {e}")

# # --- Configuration & Managers ---
# class GeminiKeyManager:
#     """Loads and rotates Google Gemini API keys."""
#     def __init__(self):
#         self.keys = [os.getenv(f"GEMINI_API_KEY_{i}") for i in range(1, 11) if os.getenv(f"GEMINI_API_KEY_{i}")]
#         if not self.keys: raise ValueError("No Gemini API keys found. Set GEMINI_API_KEY_1, etc.")
#         self.current_key_index = 0
#         logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys.")
#     def get_next_key(self) -> str:
#         self.current_key_index = (self.current_key_index + 1) % len(self.keys)
#         logging.warning(f"🔑 Switching to Gemini API key index: {self.current_key_index}")
#         return self.keys[self.current_key_index]
#     def get_initial_key(self) -> str: return self.keys[self.current_key_index]

# gemini_key_manager = GeminiKeyManager()

# class ResilientAgentExecutor(AgentExecutor):
#     """Catches rate limit errors and retries with a new API key."""
#     key_manager: Any
#     llm: Any
#     async def ainvoke(self, *args, **kwargs):
#         for i in range(len(self.key_manager.keys)):
#             try:
#                 return await super().ainvoke(*args, **kwargs)
#             except ResourceExhausted:
#                 if i == len(self.key_manager.keys) - 1:
#                     raise HTTPException(status_code=429, detail="All API keys are rate-limited.")
#                 self.llm.google_api_key = self.key_manager.get_next_key()
#         raise HTTPException(status_code=503, detail="Agent failed after multiple key retries.")

# AGENT_SESSIONS: Dict[str, Any] = {}

# # --- THE DEFINITIVE PROMPT TEMPLATE ---
# agent_prompt_template = PromptTemplate.from_template("""
# You are Vyapari AI, a precise and stateful assistant.

# **Primary Goal: Your main goal is to collect all necessary information step-by-step to successfully call the `create_invoice` tool.**

# **Core Rules:**
# 1.  **One Step at a Time:** Your response MUST contain ONLY ONE intention: either a single tool call OR a single message to the user.
# 2.  **State Management (CRITICAL):** When a tool like `search_existing_buyer` gives you information (e.g., a buyer's address and state), you **MUST** remember and use that information in subsequent steps, especially when constructing the final JSON for the `create_invoice` tool. Do not ask for information you already have.
# 3.  **Confirmation:** Do NOT confirm a task is complete (e.g., "Invoice created") until the tool has run and returned a success message. Relay the exact success or failure message back to the user.

# ---
# ### **Workflow: Creating an Invoice**
# Follow this sequence. Do not skip steps. Your current goal is always the next unfinished step.
# 1.  **Identify the Buyer:** If you don't know the buyer's full details, your goal is to call `search_existing_buyer`.
# 2.  **Gather Items:** If you have the buyer but no items, your goal is to ask the user for the item list (e.g., "Paneer 2 kg 50 rupees").
# 3.  **Get Invoice Number:** If you have the buyer and items, your goal is to call `get_next_invoice_number`.
# 4.  **Create Invoice:** If you have all the above, your final goal is to call `create_invoice` using the information you've gathered.

# ---
# ### **`create_invoice` JSON FORMAT**
# When calling `create_invoice`, the `Action Input` MUST be a JSON object structured exactly like this. Fill it with the information you have collected.
# ```json
# {{
#     "invoice_data": {{
#         "invoice": {{ "number": "[FROM get_next_invoice_number]", "date": "{today_date}", "due_date": "{today_date}" }},
#         "buyer": {{ "name": "[Buyer's Name]", "address": "[Buyer's Address FROM search_existing_buyer]", "state": "[Buyer's State FROM search_existing_buyer]", "gstin": "", "phone_no": "", "email": "" }},
#         "items": [ {{ "name": "[Item Name]", "quantity": "[Number]", "rate": "[Number]", "unit": "[e.g., ltr]", "hsn": "", "gst_rate": 0 }} ],
#         "terms_and_conditions": [ "1. Goods once sold will not be taken back.", "2. Interest @18% p.a. will be charged if not paid within due date." ]
#     }}
# }}
# Available Tools: [{tool_names}]
# User ID: {user_id}

# Begin!

# Conversation History:
# {chat_history}
# User Input:
# {input}
# Your Thought Process & Action:
# {agent_scratchpad}
# """)

# def _robust_json_loads(input_data: Any) -> Union[Dict, list, str]:
#     if not isinstance(input_data, str): return input_data
#     clean_input = input_data.strip().removeprefix("json").removesuffix("").strip()
#     try: 
#         return json.loads(clean_input)
#     except json.JSONDecodeError: 
#         return clean_input

# async def create_tool_handler(tool_function: Callable, user_id: str, supabase_client: Any, llm_instance: Any) -> Callable:
#     """
#     Creates a safe, asynchronous, and dependency-aware handler for any given tool.
#     It automatically injects 'supabase' or 'llm' if the tool function requires them.
#     """
#     is_async = inspect.iscoroutinefunction(tool_function)
#     sig = inspect.signature(tool_function)

#     async def tool_handler(agent_input: Any) -> str:
#         try:
#             kwargs = {}
#             parsed_input = _robust_json_loads(agent_input)
#             if isinstance(parsed_input, dict): kwargs = parsed_input
#             else:
#                 tool_params = [p.name for p in sig.parameters.values() if p.name not in ['user_id', 'supabase', 'llm']]
#                 if len(tool_params) == 1: kwargs = {tool_params[0]: parsed_input}

#             # ** DEPENDENCY INJECTION **
#             if 'user_id' in sig.parameters: kwargs['user_id'] = user_id
#             if 'supabase' in sig.parameters: kwargs['supabase'] = supabase_client
#             if 'llm' in sig.parameters: kwargs['llm'] = llm_instance
            
#             if is_async: result = await tool_function(**kwargs)
#             else: result = await asyncio.to_thread(tool_function, **kwargs)
            
#             # Ensure output is a serializable string for the agent
#             return json.dumps(result) if isinstance(result, (dict, list)) else str(result)
        
#         except Exception as e:
#             logger.error(f"Error in tool '{tool_function.__name__}': {e}", exc_info=True)
#             return f"Error executing {tool_function.__name__}: {e}"
            
#     return tool_handler

# def handle_parsing_error(error) -> str:
#     logger.error(f"AGENT PARSING ERROR: {error}")
#     return f"I'm having trouble formatting my response. Please rephrase your request. Raw Error: {error}"

# async def get_vyapari_agent_executor(user_id: str):
#     """Asynchronously creates or retrieves a stateful, dependency-aware agent executor."""
#     if user_id in AGENT_SESSIONS: return AGENT_SESSIONS[user_id]

#     logger.info(f"✅ Creating new agent session for user: {user_id}")

#     llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)
#     memory = SupabaseConversationMemory(user_id=user_id) # Use persistent memory

#     available_tools = {
#         "search_existing_buyer": search_existing_buyer,
#         "get_sales_summary": get_sales_summary,
#         "get_top_performing_entities": get_top_performing_entities,
#         "get_low_stock_alerts": get_low_stock_alerts,
#         "send_invoice_via_email": send_invoice_via_email,
#         "generate_whatsapp_link": generate_whatsapp_link,
#         "get_gstr3b_report": get_gstr3b_report,
#         "get_next_invoice_number": get_next_invoice_number,
#         "create_invoice": create_invoice,
#         "update_invoice": update_invoice,
#         "answer_database_question": answer_database_question,
#     }

#     tools = []
#     for name, func_def in available_tools.items():
#         # Pass dependencies (supabase, llm) to the handler factory
#         handler = await create_tool_handler(func_def, user_id, supabase, llm)
#         tools.append(Tool(
#             name=name,
#             func=None, # Not needed when coroutine is provided
#             coroutine=handler, # Correctly assign async handler to coroutine
#             description=func_def.__doc__ or f"Tool to perform the '{name}' action."
#         ))

#     prompt = agent_prompt_template.partial(
#         tools=render_text_description(tools),
#         tool_names=", ".join([t.name for t in tools]),
#         user_id=user_id,
#         today_date=date.today().isoformat()
#     )

#     agent = create_react_agent(llm, tools, prompt)

#     agent_executor = ResilientAgentExecutor(
#         agent=agent, tools=tools, memory=memory, verbose=True,
#         handle_parsing_errors=handle_parsing_error,
#         max_iterations=4,
#         key_manager=gemini_key_manager, llm=llm
#     )

#     AGENT_SESSIONS[user_id] = agent_executor
#     return agent_executor






# # agent_prompt_template = PromptTemplate.from_template(
# #     """
# # You are Vyapari AI assistant (concise, deterministic).

# # Rules (STRICT):
# # 1) One intention per response: either a single tool call (Action/Action Input) OR a Final Answer.
# # 2) When calling create_invoice, Action Input MUST be valid JSON per the example.
# # 3) Optional fields (phone, email, gstin, terms): if user says "no"/"skip"/"not needed", treat as null and do NOT keep asking.
# # 4) Required fields: buyer.name, buyer.address, buyer.state, items (non-empty). If missing, ask user for the specific missing field(s).
# # 5) Keep temperature low and avoid chain-of-thought output.

# # Available tools: {tool_names}

# # Core create_invoice example:
# # Action: create_invoice
# # Action Input: {{"invoice_data": {{ "invoice": {{ "number": "{invoice_number}", "date": "{today_date}", "due_date": "{today_date}" }}, "buyer": {{ "name": "[NAME]", "address": "[ADDRESS]", "state": "[STATE]", "gstin": "", "phone_no": "", "email": "" }}, "items": [ {{ "name": "[Item]", "quantity": [NUM], "rate": [NUM], "unit": "[unit]", "hsn": "", "gst_rate": 0 }} ], "terms_and_conditions": ["1. Goods once sold will not be taken back.", "2. Interest @18% p.a. will be charged if not paid within due date."] }} }}

# # User id: {user_id}
# # Conversation History:
# # {chat_history}
# # User Input:
# # {input}

# # Begin.
# # """
# # )



###----------------god___________________




# """
# Production-Ready Vyapari AI Agent Orchestrator with Persistent Memory

# This file sets up and manages a stateful, resilient LangChain agent.
# This version has been updated to support a detailed, multi-nested JSON payload
# for the primary create_invoice tool. The agent's prompt now contains a specific
# template to ensure it generates the correct structure.
# """
# import json
# import os
# import asyncio
# import inspect
# import logging
# from datetime import date
# from typing import Dict, Any, Union, Callable

# from fastapi import HTTPException
# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from google.api_core.exceptions import ResourceExhausted

# # --- App-specific Imports ---
# # Make sure this file exists and contains all the necessary tool functions,
# # including the new, detailed `create_invoice` function.
# from app.tools.sql_query_tool import *

# # --- Configuration & Managers ---
# class GeminiKeyManager:
#     """A manager to load and rotate Google Gemini API keys from environment variables."""
#     def __init__(self):
#         self.keys = [os.getenv(f"GEMINI_API_KEY_{i}") for i in range(1, 11) if os.getenv(f"GEMINI_API_KEY_{i}")]
#         if not self.keys: raise ValueError("No Gemini API keys found. Set GEMINI_API_KEY_1, etc.")
#         self.current_key_index = 0
#         logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys.")
#     def get_next_key(self) -> str:
#         self.current_key_index = (self.current_key_index + 1) % len(self.keys)
#         logging.warning(f"🔑 Switching to Gemini API key index: {self.current_key_index}")
#         return self.keys[self.current_key_index]
#     def get_initial_key(self) -> str: return self.keys[0]

# gemini_key_manager = GeminiKeyManager()

# class ResilientAgentExecutor(AgentExecutor):
#     """An AgentExecutor that catches rate limit errors and retries with a new API key."""
#     key_manager: Any
#     llm: Any
#     async def ainvoke(self, *args, **kwargs):
#         for i in range(len(self.key_manager.keys)):
#             try:
#                 return await super().ainvoke(*args, **kwargs)
#             except ResourceExhausted:
#                 logging.warning(f"API key index {self.key_manager.current_key_index} is rate-limited.")
#                 if i == len(self.key_manager.keys) - 1:
#                     raise HTTPException(status_code=429, detail="All API keys are rate-limited.")
#                 self.llm.google_api_key = self.key_manager.get_next_key()
#         raise HTTPException(status_code=503, detail="Agent failed after multiple key retries.")

# AGENT_SESSIONS: Dict[str, Any] = {}


# # --- THE DEFINITIVE PROMPT TEMPLATE ---
# agent_prompt_template = PromptTemplate.from_template("""
# You are a helpful and efficient Vyapari (merchant AI) assistant. Your goal is to be intelligent, flexible, and precise.

# **Golden Rule: You MUST NOT confirm a task is complete (e.g., "Invoice created") unless the `create_invoice` tool has run and returned a success message.**

# **One Step at a Time Rule: Your response MUST contain ONLY ONE intention. It can be either a tool call (Action/Action Input) OR a response to the user (Final Answer). NEVER include both in the same response.**

# **NEW - Tool Input Rule: If a tool requires specific named parameters (like 'time_period'), you MUST use a JSON object for the Action Input. For example: `Action Input: {{"time_period": "last month"}}`. If the tool takes a simple value (like a buyer's name), you can use a plain string.**

# **User Input Parsing: The user will speak naturally. You MUST extract key details from their sentences (e.g., from "paneer do kg 50 rupaye", extract Item: Paneer, Quantity: 2, Rate: 50).**

# **Your Response Options:**
# Choose ONE of the following formats.

# 1.  **Use a Tool:**
#     Thought: I need to use a tool to get information or perform an action. My thought process concludes with a single tool call.
#     Action: The name of one tool from [{tool_names}].
#     Action Input: The input for the tool.

# 2.  **Respond to User:**
#     Thought: I need to ask the user for more information or confirm something. My thought process concludes with a single message to the user.
#     Final Answer: My message to the user.

# ---
# **CORE WORKFLOW: INVOICE CREATION**
# Your goal is to gather information step-by-step. Focus only on the immediate next step.
# - If you don't know the buyer, your current goal is to call `search_existing_buyer`.
# - If you don't have the items, your current goal is to ask the user for them.
# - If you have the buyer and items but no invoice number, your current goal is to call `get_next_invoice_number`.
# - If you have all the above, your current goal is to call `create_invoice`.
# - After `create_invoice` runs, your final goal is to report its exact success or failure message.

# **`create_invoice` JSON FORMAT**
# When your goal is to call the `create_invoice` tool, you MUST format the `Action Input` exactly like this:
# ```json
# {{
#     "invoice_data": {{
#         "invoice": {{ "number": "[Actual Invoice Number]", "date": "{today_date}", "due_date": "{today_date}" }},
#         "buyer": {{ "name": "[Buyer's Name]", "address": "[Buyer's Address]", "state": "[Buyer's State]", "gstin": "", "phone_no": "", "email": "" }},
#         "items": [ {{ "name": "[Item Name]", "quantity": "[Number]", "rate": "[Number]", "unit": "[e.g., ltr]", "hsn": "", "gst_rate": 0 }} ],
#         "terms_and_conditions": [ "1. Goods once sold will not be taken back.", "2. Interest @18% p.a. will be charged if not paid within due date." ]
#     }}
# }}
# User ID: {user_id}
# Today's Date: {today_date}

# Begin!
# Conversation History:
# {chat_history}
# User Input:
# {input}
# Your Thought Process:
# {agent_scratchpad}
# """)

# def _robust_json_loads(input_data: Any) -> Union[Dict, list, str]:
#     """Safely parses a string as JSON. If it's not a valid JSON, returns the original string."""
#     if not isinstance(input_data, str):
#         return input_data
#     clean_input = input_data.strip().removeprefix("```json").removesuffix("```").strip()
#     try:
#         return json.loads(clean_input)
#     except json.JSONDecodeError:
#         return clean_input

# async def create_tool_handler(tool_function: Callable, user_id: str) -> Callable:
#     """Creates a safe and robust ASYNCHRONOUS handler for any given tool."""
#     is_async = inspect.iscoroutinefunction(tool_function)
    
#     async def tool_handler(agent_input: Any) -> str:
#         try:
#             kwargs = {}
#             parsed_input = _robust_json_loads(agent_input)

#             if isinstance(parsed_input, dict):
#                 kwargs = parsed_input
#             else:
#                 sig = inspect.signature(tool_function)
#                 tool_params = [p.name for p in sig.parameters.values() if p.name != 'user_id' and p.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD]
#                 if len(tool_params) == 1:
#                     kwargs = {tool_params[0]: parsed_input}

#             if 'user_id' in inspect.signature(tool_function).parameters:
#                 kwargs['user_id'] = user_id
            
#             if is_async:
#                 return await tool_function(**kwargs)
#             else:
#                 loop = asyncio.get_running_loop()
#                 return await loop.run_in_executor(None, lambda: tool_function(**kwargs))
        
#         except TypeError as e:
#             logging.error(f"TypeError calling {tool_function.__name__}: {e}. Input was: {agent_input}")
#             return f"Error: Invalid arguments for {tool_function.__name__}. Details: {e}"
#         except Exception as e:
#             logging.error(f"An unexpected error occurred in {tool_function.__name__}: {e}")
#             return f"An unexpected error occurred: {e}"
            
#     return tool_handler

# def handle_parsing_error(error) -> str:
#     """
#     A custom error handler that logs the raw error and returns a
#     user-friendly message with more detail.
#     """
#     # Log the full, raw error to your server terminal for debugging
#     logging.error(f"AGENT PARSING ERROR: The model produced a malformed response. Raw error: {logging.error}")
    
#     # Return a more informative message to the agent's thought process
#     response = f"I'm having trouble formatting my response. The AI model produced an unparsable output. Please rephrase your request. Raw Error: {error}"
#     return response


# async def get_vyapari_agent_executor(user_id: str):
#     """Asynchronously creates or retrieves a stateful agent executor."""
#     if user_id in AGENT_SESSIONS:
#         return AGENT_SESSIONS[user_id]

#     logging.info(f"✅ Creating new agent session for user: {user_id}")
    
#     llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)
    
#     memory = ConversationBufferWindowMemory(
#         k=10, memory_key="chat_history", input_key="input", output_key="output", return_messages=True
#     )

    
            
#     # --- Define all available tools ---
#     available_tools = {
#         "get_all_buyers": get_all_buyers,
#         "search_existing_buyer": search_existing_buyer,
#         "get_sales_summary": get_sales_summary,
#         "get_top_performing_entities": get_top_performing_entities,
#         "get_low_stock_alerts": get_low_stock_alerts,
#         "send_invoice_via_email": send_invoice_via_email,
#         "generate_whatsapp_link": generate_whatsapp_link,
#         "get_gstr3b_report": get_gstr3b_report,
#         "get_next_invoice_number": get_next_invoice_number,
#         "load_invoice_for_editing": load_invoice_for_edit,
#         "create_invoice": create_invoice,
#         "update_invoice": update_invoice,
#     }

#     tools = []
#     for name, func_def in available_tools.items():
#         tools.append(Tool(
#             name=name,
#             func=func_def,
#             coroutine=await create_tool_handler(func_def, user_id),
#             description=func_def.__doc__ or f"A tool to perform the '{name}' action."
#         ))
    
#     tools.append(Tool(
#         name="answer_database_question",
#         func=lambda q: answer_database_question(user_question=q, llm=llm),
#         description="Use this as a fallback for complex questions about your data that are not covered by other specific tools."
#     ))
    
#     prompt = agent_prompt_template.partial(
#         tools=render_text_description(tools),
#         tool_names=", ".join([t.name for t in tools]),
#         user_id=user_id,
#         today_date=date.today().isoformat()
#     )

#     agent = create_react_agent(llm, tools, prompt)
    
#     agent_executor = ResilientAgentExecutor(
#         agent=agent, tools=tools, memory=memory, verbose=True,
#         handle_parsing_errors=handle_parsing_error, # <-- TO THIS NEW FUNCTION
#         max_iterations=6,
#         key_manager=gemini_key_manager, llm=llm
#     )
    
#     AGENT_SESSIONS[user_id] = agent_executor
#     return agent_executor



"""
Production-Ready Vyapari AI Agent Orchestrator with Persistent Memory

This file sets up and manages a stateful, resilient LangChain agent.
This version has been updated to support a detailed, multi-nested JSON payload
for the primary create_invoice tool. The agent's prompt now contains a specific
template to ensure it generates the correct structure.
"""
import json
import os
import asyncio
import inspect
import logging
from datetime import date
from typing import Dict, Any, Union, Callable

from fastapi import HTTPException
from langchain.agents import AgentExecutor, create_react_agent, Tool
from langchain.prompts import PromptTemplate
from langchain_core.tools import render_text_description
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from google.api_core.exceptions import ResourceExhausted
from app.core.supabase import supabase

# --- App-specific Imports ---
# Make sure this file exists and contains all the necessary tool functions,
# including the new, detailed `create_invoice` function.
from app.tools.sql_query_tool import *

# --- Configuration & Managers ---
class GeminiKeyManager:
    """A manager to load and rotate Google Gemini API keys from environment variables."""
    def __init__(self):
        self.keys = [os.getenv(f"GEMINI_API_KEY_{i}") for i in range(1, 11) if os.getenv(f"GEMINI_API_KEY_{i}")]
        if not self.keys: raise ValueError("No Gemini API keys found. Set GEMINI_API_KEY_1, etc.")
        self.current_key_index = 0
        logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys.")
    def get_next_key(self) -> str:
        self.current_key_index = (self.current_key_index + 1) % len(self.keys)
        logging.warning(f"🔑 Switching to Gemini API key index: {self.current_key_index}")
        return self.keys[self.current_key_index]
    def get_initial_key(self) -> str: return self.keys[0]

gemini_key_manager = GeminiKeyManager()

class ResilientAgentExecutor(AgentExecutor):
    """An AgentExecutor that catches rate limit errors and retries with a new API key."""
    key_manager: Any
    llm: Any
    async def ainvoke(self, *args, **kwargs):
        for i in range(len(self.key_manager.keys)):
            try:
                return await super().ainvoke(*args, **kwargs)
            except ResourceExhausted:
                logging.warning(f"API key index {self.key_manager.current_key_index} is rate-limited.")
                if i == len(self.key_manager.keys) - 1:
                    raise HTTPException(status_code=429, detail="All API keys are rate-limited.")
                self.llm.google_api_key = self.key_manager.get_next_key()
        raise HTTPException(status_code=503, detail="Agent failed after multiple key retries.")

AGENT_SESSIONS: Dict[str, Any] = {}


# --- THE DEFINITIVE PROMPT TEMPLATE ---
agent_prompt_template = PromptTemplate.from_template("""
You are a helpful and efficient Vyapari (merchant AI) assistant. Your goal is to be intelligent, flexible, and precise.

**Primary Directives (Follow Strictly):**
1.  **Understand User Intent:** First, determine if the user is asking a general question (e.g., "who are my top buyers?") or giving a command (e.g., "create an invoice").
2.  **Answer Questions Directly:** If the user only asks for information, provide that information in the "Final Answer" without trying to perform other actions.
3.  **Do Not Assume Invoice Creation:** Never assume the user wants to create an invoice unless they explicitly mention words like "create", "make", or "generate invoice".
4.  **One Action at a Time:** Your response MUST contain ONLY ONE intention, either a single tool call (`Action`/`Action Input`) OR a single response to the user (`Final Answer`).

---
**Tool Usage Rules:**
- **Named Parameters:** If a tool needs specific inputs (like `time_period` or `entity_type`), you MUST use a JSON object for the Action Input. Example: `{{"time_period": "last month", "entity_type": "buyer"}}`
- **Simple Inputs:** If a tool takes a simple value (like a buyer's name), you can use a plain string.
- **Confirmation:** Do NOT confirm a task is complete (e.g., "Invoice created") unless a tool has run successfully and returned a success message.

**Your Response Options:**
Choose ONE of the following formats.

1.  **Use a Tool:**
    Thought: I need to use a tool to get information or perform an action. My thought process concludes with a single tool call.
    Action: The name of one tool from [{tool_names}].
    Action Input: The input for the tool.

2.  **Respond to User:**
    Thought: I need to ask the user for more information or confirm something. My thought process concludes with a single message to the user.
    Final Answer: My message to the user.

---
**INVOICE UPDATE INSTRUCTIONS:**
When the user wants to save changes to an invoice, you must use the `update_invoice` tool. First, use `load_invoice_for_editing` to get the invoice's current data. Then, construct the Action Input by wrapping the MODIFIED data inside a single `"update_data"` key, like this:

```json
{{
    "update_data": {{
        "invoice": {{ "id": 187, "number": "118/2025-26", "date": "2025-09-16" }},
        "buyer": {{ "name": "prashant", "address": "iits in system check" }},
        "items": [
            {{ "id": 212, "name": "milk", "quantity": 2, "rate": 40, "unit": "ltr" }}
        ]
    }}
}}

**CORE WORKFLOW: INVOICE UPDATING**
Your goal is to gather the changes for an existing invoice step-by-step.
- If the user wants to edit an invoice, your first goal is to call load_invoice_for_editing.
- After the invoice is loaded successfully, your next goal is to ask the user what they want to change. You should briefly summarize the current data to provide context.
- Do not call update_invoice until the user has provided the specific changes.
- Once you have the changes, your final goal is to call update_invoice with the complete, updated invoice data, formatted correctly according to the INVOICE UPDATE INSTRUCTIONS.
- After update_invoice runs, your final goal is to report its exact success or failure message.                                            

**CORE WORKFLOW: INVOICE CREATION**
Your goal is to gather information step-by-step. Focus only on the immediate next step.
- If you don't know the buyer, your current goal is to call `search_existing_buyer`.
- If you don't have the items, your current goal is to ask the user for them.
- If you have the buyer and items but no invoice number, your current goal is to call `get_next_invoice_number`.
- If you have all the above, your current goal is to call `create_invoice`.
- After `create_invoice` runs, your final goal is to report its exact success or failure message.

**`create_invoice` JSON FORMAT**
When your goal is to call the `create_invoice` tool, you MUST format the `Action Input` exactly like this:
```json
{{
    "invoice_data": {{
        "invoice": {{
            "number": "[Actual Invoice Number]",
            "date": "{today_date}",
            "due_date": "{today_date}"
        }},
        "buyer": {{
            "name": "[Buyer's Name]",
            "address": "[chat_history contains buyer address or leave '']",
            "state": "[chat_history contains buyer state or leave '']",
            "gstin": "",
            "phone_no": "",
            "email": ""
        }},
        "items": [
            {{
                "name": "[Item Name]",
                "quantity": [Number],
                "rate": [Number],
                "unit": "[e.g., ltr]",
                "hsn": "",
                "gst_rate": 0
            }}
        ],
        "terms_and_conditions": [
            "1. Goods once sold will not be taken back.",
            "2. Interest @18% p.a. will be charged if not paid within due date."
        ]
    }}
}}
User ID: {user_id}
Today's Date: {today_date}

Begin!
Conversation History:
{chat_history}
User Input:
{input}
Your Thought Process:
{agent_scratchpad}
""")

def _robust_json_loads(input_data: Any) -> Union[Dict, list, str]:
    """Safely parses a string as JSON. If it's not a valid JSON, returns the original string."""
    if not isinstance(input_data, str):
        return input_data
    clean_input = input_data.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        return json.loads(clean_input)
    except json.JSONDecodeError:
        return clean_input

async def create_tool_handler(tool_function: Callable, user_id: str) -> Callable:
    is_async = inspect.iscoroutinefunction(tool_function)

    async def tool_handler(agent_input: Any) -> str:
        try:
            kwargs = {}
            parsed_input = _robust_json_loads(agent_input)

            if isinstance(parsed_input, dict):
                kwargs = parsed_input
            else:
                sig = inspect.signature(tool_function)
                tool_params = [
                    p.name for p in sig.parameters.values()
                    if p.name not in ["user_id", "supabase"]
                ]
                if len(tool_params) == 1:
                    kwargs = {tool_params[0]: parsed_input}

            # auto-inject user_id if required
            if "user_id" in inspect.signature(tool_function).parameters:
                kwargs["user_id"] = user_id
            if "supabase" in inspect.signature(tool_function).parameters:
                kwargs["supabase"] = supabase

            # --- Run tool ---
            if is_async:
                result = await tool_function(**kwargs)
            else:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, lambda: tool_function(**kwargs))

            # --- ✅ Special hook for search_existing_buyer ---
            if tool_function.__name__ == "search_existing_buyer":
                try:
                    data = result if isinstance(result, dict) else json.loads(result)
                    if data.get("status") == "found":
                        buyer = data.get("details", {})
                        # stash in memory so agent can reuse
                        AGENT_SESSIONS[user_id].memory.chat_memory.add_user_message(
                            f"[SYSTEM] buyer_info: {json.dumps(buyer)}"
                        )
                except Exception as e:
                    logging.warning(f"Could not cache buyer info: {e}")

            return result

        except Exception as e:
            logging.error(f"Unexpected error in {tool_function.__name__}: {e}")
            return f"Unexpected error: {e}"

    return tool_handler



def handle_parsing_error(error) -> str:
    """
    A custom error handler that logs the raw error and returns a
    user-friendly message with more detail.
    """
    # Log the full, raw error to your server terminal for debugging
    logging.error(f"AGENT PARSING ERROR: The model produced a malformed response. Raw error: {logging.error}")
    
    # Return a more informative message to the agent's thought process
    response = f"I'm having trouble formatting my response. The AI model produced an unparsable output. Please rephrase your request. Raw Error: {error}"
    return response


async def get_vyapari_agent_executor(user_id: str):
    """Asynchronously creates or retrieves a stateful agent executor."""
    if user_id in AGENT_SESSIONS:
        return AGENT_SESSIONS[user_id]

    logging.info(f"✅ Creating new agent session for user: {user_id}")
    
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)
    
    memory = ConversationBufferWindowMemory(
        k=10, memory_key="chat_history", input_key="input", output_key="output", return_messages=True
    )

    
            
    # --- Define all available tools ---
    available_tools = {
        "get_all_buyers": get_all_buyers,
        "search_existing_buyer": search_existing_buyer,
        "get_sales_summary": get_sales_summary,
        "get_top_performing_entities": get_top_performing_entities,
        "get_low_stock_alerts": get_low_stock_alerts,
        "send_invoice_via_email": send_invoice_via_email,
        "generate_whatsapp_link": generate_whatsapp_link,
        "get_gstr3b_report": get_gstr3b_report,
        "get_next_invoice_number": get_next_invoice_number,
        "load_invoice_for_editing": load_invoice_for_edit,
        "create_invoice": create_invoice,
        "update_invoice": update_invoice,
    }

    tools = []
    for name, func_def in available_tools.items():
        tools.append(Tool(
            name=name,
            func=func_def,
            coroutine=await create_tool_handler(func_def, user_id),
            description=func_def.__doc__ or f"A tool to perform the '{name}' action."
        ))
    
    tools.append(Tool(
        name="answer_database_question",
        func=lambda q: answer_database_question(user_question=q, llm=llm),
        description="Use this as a fallback for complex questions about your data that are not covered by other specific tools."
    ))
    
    prompt = agent_prompt_template.partial(
        tools=render_text_description(tools),
        tool_names=", ".join([t.name for t in tools]),
        user_id=user_id,
        today_date=date.today().isoformat()
    )

    agent = create_react_agent(llm, tools, prompt)
    
    agent_executor = ResilientAgentExecutor(
        agent=agent, tools=tools, memory=memory, verbose=True,
        handle_parsing_errors=handle_parsing_error, # <-- TO THIS NEW FUNCTION
        max_iterations=6,
        key_manager=gemini_key_manager, llm=llm
    )
    
    AGENT_SESSIONS[user_id] = agent_executor
    return agent_executor