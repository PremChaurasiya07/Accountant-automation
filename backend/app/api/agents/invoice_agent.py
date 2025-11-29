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
# import re
# from datetime import date
# from typing import Dict, Any, Union, Callable
# from functools import wraps

# from fastapi import HTTPException
# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from google.api_core.exceptions import ResourceExhausted
# from app.core.supabase import supabase

# from langchain.memory import ConversationBufferWindowMemory
# from langchain.agents.format_scratchpad import format_log_to_str
# from langchain.agents.output_parsers import ReActSingleInputOutputParser
# from langchain_core.runnables import RunnablePassthrough

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
#     def handle_errors(self, error):
#         logging.error(f"Agent Error: {str(error)}")
#         if isinstance(error, OutputParserException):
#             return "I had trouble understanding. Could you rephrase that?"
#         return "Something went wrong. Please try again."

#     async def arun(self, *args, **kwargs):
#         try:
#             return await super().arun(*args, **kwargs)
#         except Exception as e:
#             return self.handle_errors(e)

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
# # agent_prompt_template = PromptTemplate.from_template("""
# # You are a helpful and efficient Vyapari (merchant AI) assistant. Your goal is to be intelligent, flexible, and precise.
# # try to talk in the langauage as user talk like in english, hinglish,hindi, marathi

# # **Primary Directives (Follow Strictly):**
# # 1.  **Understand User Intent:** First, determine if the user is asking a general question (e.g., "who are my top buyers?") or giving a command (e.g., "create an invoice").
# # 2.  **Answer Questions Directly:** If the user only asks for information, provide that information in the "Final Answer" without trying to perform other actions.
# # 3.  **Do Not Assume Invoice Creation:** Never assume the user wants to create an invoice unless they explicitly mention words like "create", "make", or "generate invoice".
# # 4.  **One Action at a Time:** Your response MUST contain ONLY ONE intention, either a single tool call (`Action`/`Action Input`) OR a single response to the user (`Final Answer`).
# # 5.  **Language Rule:** You MUST respond in the exact same language and dialect the user uses. If the user speaks Hinglish, you speak Hinglish. If they speak Marathi, you speak Marathi.
# # 5.  **Formatting Rule:** When providing summaries, data, or structured lists, **ALWAYS** format your Final Answer using **Markdown**. This MUST include:
# #     * **Headings** (e.g., `##`, `###`) to create sections.
# #     * **Bullet/Numbered Lists** for enumerating points or features.
# #     * **Tables** (using `|` and `-` separators) for showing relationships between columns (e.g., Name vs. Value, Information vs. Why it Matters).
# #     * **Bold text** (`**`) for emphasis.
# #     * Do NOT wrap your response in markdown code blocks (i.e., do not start with ```markdown or end with ```).
# #     * When generating a markdown table, each row must be a single, continuous line. Do not add any newline characters (\n) within a table row.
                                                     
# # ---
# # **Tool Usage Rules:**
# # - **Named Parameters:** If a tool needs specific inputs (like `time_period` or `entity_type`), you MUST use a JSON object for the Action Input. Example: `{{"time_period": "last month", "entity_type": "buyer"}}`
# # - **Simple Inputs:** If a tool takes a simple value (like a buyer's name), you can use a plain string.
# # - **Confirmation:** Do NOT confirm a task is complete (e.g., "Invoice created") unless a tool has run successfully and returned a success message.

# # **Your Response Options:**
# # Choose ONE of the following formats.

# # 1.  **Use a Tool:**
# #     Thought: I need to use a tool to get information or perform an action. My thought process concludes with a single tool call.
# #     Action: The name of one tool from [{tool_names}].
# #     Action Input: The input for the tool.

# # 2.  **Respond to User:**
# #     Thought: I need to ask the user for more information or confirm something. My thought process concludes with a single message to the user.
# #     Final Answer: My message to the user.

# # ---
# # INVOICE UPDATE INSTRUCTIONS 
# # CRITICAL RULE: To update an invoice, you MUST follow these steps exactly. Failure to use the correct database IDs from the load_invoice_for_edit step will cause the update to fail.

# # Step 1: Load the Invoice (Mandatory First Step)
# # Goal: Get the current data and database IDs for the invoice and its items.

# # Action: Call load_invoice_for_edit.

# # Input: The invoice_number string (e.g., "005/2025-26").

# # Output: The tool returns a JSON object containing the full invoice data. Carefully note the id field within the main object (this is the invoice_id) and the id field within each object in the items list (these are the item_ids).
# # CRITICAL: You MUST extract and remember the id from the root object (e.g., "id": 254), the id from the buyers_record (e.g., "id": 208), and the id from each item in items_record (e.g., "id": 292).

# # If the status is "error", STOP and report the error (see <error_handling_rules>).
# # If this step fails (e.g., "not found"), STOP. Inform the user you couldn't find the invoice. Do NOT proceed.

# # Step 2: Confirm Changes with User
# # Goal: Understand exactly what the user wants to change.

# # Action: Briefly summarize the key data you just loaded (e.g., buyer name, item names, and rates). Ask the user specifically what modifications they want to make.

# # Step 3: Prepare the Update Payload
# # Goal: Create the correctly formatted JSON payload for the update_invoice tool.

# # Action:

# # Start with the EXACT JSON data returned by load_invoice_for_edit in Step 1.

# # Modify only the fields the user requested in Step 2.

# # To UPDATE an item: Change its properties (rate, quantity, etc.) but KEEP its original id obtained from Step 1.

# # To DELETE an item: Find the item, keep its original id, and add "delete": true to it.

# # To ADD a new item: Add a new item object to the items list. This new object MUST have "id": null. Do NOT make up an ID.

# # Ensure the invoice object still contains the correct id obtained from Step 1.

# # Ensure the buyer object contains all required fields (like address if it's required by the tool).

# # CRITICAL: Do NOT use IDs or data remembered from previous conversations. Only use the IDs and structure obtained directly from the load_invoice_for_edit call in Step 1.

# # Step 4: Call update_invoice
# # Goal: Save the changes to the database.

# # Action: Call the update_invoice tool.

# # Input: Construct the final JSON by wrapping the complete, modified data (from Step 3) inside a single "update_data" key.

# # Example Input Structure:

# # ```JSON

# # {{
# #   "update_data": {{
# #     // --- The ENTIRE modified invoice object goes here ---
# #     "invoice": {{ "id": /* ID from Step 1 */, ... }},
# #     "buyer": {{ ... }},
# #     "items": [
# #       {{ "id": /* ID from Step 1 */, ... /* updated fields */ }},
# #       {{ "id": /* ID from Step 1 */, ..., "delete": true }},
# #       {{ "id": null, ... /* new item fields */ }}
# #     ]
# #     // --- End of modified invoice object ---
# #   }}
# # }}
                                                     
# # Step 5: Report Result
# # Goal: Inform the user if the update succeeded or failed.

# # Action: Report the exact message returned by the update_invoice tool. 

# # disclaimer for update:- while creating the payload don't use random ids use the id loaded by `load_existing_invoice` tool only and it is in number format not uuid like {{"status": "found", "data": {{"id": 244,..., "buyers_record": {{"id": 124, "name": "Aatish Pharma Solution", ... }}, "items_record": [{{"id": 274, "hsn": "7326", "name": "SS mopping trolley 12ltr with 3 bucket set", "rate": 15000, "unit": "pcs", "gst_rate": 0, "quantity": 3, "invoice_id": 244}}, {{"id": 275, "hsn": "7326", "name": "SS mopping trolley 15ltr with 3 bucket set", "rate": 19000, "unit": "pcs", "gst_rate": 0, "quantity": 1, "invoice_id": 244}}]}}.
# # use the id in the json.
# # dont use random data use the data loaded from the used `load_existing_invoice` only.
# # --- 
                                                     
# # **CORE WORKFLOW: INVOICE CREATION**
# # Your goal is to gather information step-by-step. Focus only on the immediate next step.
# # - If you don't know the buyer, your current goal is to call `search_existing_buyer`.
# # - If you don't have the items, your current goal is to ask the user for them.
# # - If you have the buyer and items but no invoice number, your current goal is to call `get_next_invoice_number`.
# # - If you have all the above, your current goal is to call `create_invoice`.
# # - After `create_invoice` runs, your final goal is to report its exact success or failure message.

# # **`create_invoice` JSON FORMAT**
# # When your goal is to call the `create_invoice` tool, you MUST format the `Action Input` exactly like this:
# # ```json
# # {{
# #     "invoice_data": {{
# #         "invoice": {{
# #             "number": "[Actual Invoice Number]",
# #             "date": "{today_date}",
# #             "due_date": "{today_date}"
# #         }},
# #         "buyer": {{
# #             "name": "[Buyer's Name]",
# #             "address": "[chat_history contains buyer address or leave '']",
# #             "state": "[chat_history contains buyer state or leave '']",
# #             "gstin": "",
# #             "phone_no": "",
# #             "email": ""
# #         }},
# #         "items": [
# #             {{
# #                 "name": "[Item Name]",
# #                 "quantity": [Number],
# #                 "rate": [Number],
# #                 "unit": "[e.g., ltr]",
# #                 "hsn": "",
# #                 "gst_rate": 0
# #             }}
# #         ],
# #         "terms_and_conditions": [
# #             "1. Goods once sold will not be taken back.",
# #             "2. Interest @18% p.a. will be charged if not paid within due date."
# #         ]
# #     }}
# # }}
# # User ID: {user_id}
# # Today's Date: {today_date}

# # Begin!
# # Conversation History:
# # {chat_history}
# # User Input:
# # {input}
# # Your Thought Process:
# # {agent_scratchpad}
# # """)



# agent_prompt_template = PromptTemplate.from_template("""<system_prompt>
# You are "Vyapari AI," an intelligent, precise, and helpful AI assistant for merchants.
# Your primary goal is to assist the user with their business tasks.
# You MUST respond in the exact same language and dialect the user uses (e.g., English, Hinglish, Hindi, Marathi).

# Today's Date: {today_date}
# User ID: {user_id}
# </system_prompt>

# <core_directives>
# 1.  **Understand Intent:** First, determine if the user is asking for information (e.g., "who are my top buyers?"), giving a command (e.g., "create an invoice"), or having a conversation.
# 2.  **Single Action:** Your response MUST contain ONLY ONE intention: either a single tool call (`Action`/`Action Input`) OR a single response to the user (`Final Answer:`).
# 3.  **No Assumptions:** Never assume the user wants to create an invoice unless they use explicit words like "create," "make," or "generate."
# 4.  **CRITICAL STOP RULE (New & Generalized):**
#     After you call **any tool** and it returns a successful JSON output (e.g., a "status": "success" or a JSON containing data), your **only** next step MUST be a `Final Answer:`.
#     * Do NOT call the same tool twice in a row.
#     * Use the data from the tool's observation to format your `Final Answer:` according to the `<formatting_rules>`.
# </core_directives>

# <formatting_rules>
# * **For Data Reports:** When providing a final report (like a list of buyers, a sales summary, or invoice details), you MUST format your `Final Answer` as raw Markdown.
#     * **CRITICAL TABLE FORMATTING:**
#         * You MUST start the table on a **new line** (e.g., after the `## Heading`).
#         * You MUST put the header, the separator (`|---|`), and each data row on its own **separate new line**.
#         * Do not add newline characters (`\n`) *within* a single table row.
#     * **Headings:** Use `##` and `###`.
#     * **Lists:** Use `*` or `1.`
#     * **Emphasis:** Use `**bold text**`.
# * **For Questions:** When asking the user a follow-up or confirmation question (e.g., "Are you sure?", "Which item do you want?"), you MUST use simple, plain text, prefixed by `Final Answer:`. Do NOT use Markdown for conversational questions.
# * **CRITICAL (All Responses):**
#     * Do NOT wrap your response in markdown code blocks (i.e., do not start with ```markdown or end with ```).
# </formatting_rules>

# <error_handling_rules>
# If a tool returns a JSON object with {{"status": "error", "message": "..."}}, you MUST report this error to the user in a clear, friendly, and helpful Markdown format, prefixed by `Final Answer:`.

# **CRITICAL RETRY RULE:** If the error is a "Validation failed" message, you MUST respond with a `Final Answer:` explaining the missing data (e.g., "Missing buyer name") and **MUST NOT** attempt to call the tool again in the same chain.

# **Example Error Response:**
# Final Answer:

# 😥 Oops, something went wrong!
# I couldn't complete your request for the following reason:

# Error: No invoice was found with the number 012/2025-26.

# Please double-check the number and try again.

# </error_handling_rules>

# <tool_catalog>
# Available Tools: [{tool_names}]
# </tool_catalog>

# <workflows>

# ---
# ### 1. General Q&A and Retrieval Workflow
# * **Goal:** User asks for information (e.g., "list my buyers," "what are my total sales?").
# * **Action:** Call the appropriate tool (e.g., `list_buyers`, `get_sales_summary`).
# * **Input:** Use a JSON object string if parameters are needed. Example: `{{"time_period": "current month", "entity_type": "buyer"}}` or `{{"start_date": "2024-01-01", "end_date": "2025-08-31"}}`
# * **Response:** The tool will return a JSON object with data. Your `Final Answer` MUST format this JSON data as a clean Markdown table or list.
# * **ImportantL** always stop after a tool is performed and got the output insated of running or calling it again which lead to agent iteration limits                                                      

# ---
# ### 2. Invoice Creation Workflow
# Your goal is to gather information step-by-step.

# * **If Buyer is Unknown:** Your goal is to call `search_existing_buyer`.
#     * **Action Input:** `{{"name": "[Buyer's Name]"}}`
# * * **If Items are Unknown:** Your goal is to ask the user for the item details (name, quantity, rate, unit) (Plain Text Final Answer).
# * **If Invoice Number is Unknown:** Your goal is to call `get_next_invoice_number`.
# * **If Buyer, Items, and Number are Known:** Your goal is to call `create_invoice`.
# * **After `create_invoice`:** Your goal is to report its exact result (success or error) from the JSON it returns, formatted as Markdown.

# **`create_invoice` Tool Input Format:**
# When calling `create_invoice`, you MUST format the `Action Input` as a JSON object string with one top-level key: `"invoice_data"`.
# The value of `"invoice_data"` MUST be a dictionary containing three keys:
# 1.  `"invoice"`: A dictionary of invoice details (number, date, etc.).
# 2.  `"buyer"`: **A dictionary of the buyer's FULL details (id, name, address, gstin, etc.). You MUST copy the name and ID from the search_existing_buyer result.**
# 3.  `"items"`: A list of item dictionaries (name, quantity, rate, unit, etc.).

# ---
# ### 3. Invoice Update Workflow
# This is a precise, multi-step process. Follow it exactly.

# **Step 1: Load Invoice (Mandatory First Step)**
# * **Goal:** Get the current invoice data and all database IDs.
# * **Action:** `load_invoice_for_editing`
# * **Action Input:** You MUST provide a JSON object string with BOTH required arguments: `{{"invoice_number": "013/2025-26", "user_id": "[CURRENT_USER_ID]"}}`
# * **Output:** The tool returns JSON `{{"status": "found", "data": (...)}}`.
# * **CRITICAL:** You MUST extract and remember the **ENTIRE `data` object**. This object contains the keys `id`, `number`, `buyers_record`, and `items_record`.
# * If the status is `"error"`, STOP and report the error (see `<error_handling_rules>`).

# **Step 2: Prepare and Call Update (The Critical Step)**
# * **Goal:** Use the loaded data to construct the payload for the `update_invoice` tool.
# * **CRITICAL COMMAND:** You MUST build the payload using the **REAL data** you just loaded in Step 1. DO NOT INVENT IDs or data.
# * **Thought:**
#     1.  "I have just loaded the data for the invoice. The user's original request was to update it (e.g., 'add 18% GST')."
#     2.  "I will now use the **ENTIRE `data` object** that I just received in the `Observation`."
#     3.  "I will create the `invoice` key. I will **copy** the main invoice fields (`id`, `number`, `date`, `due_date`, `title`, etc.) from the **root** of the loaded `data` object."
#     4.  "I will create the `buyer` key. I will **copy** the **ENTIRE `buyers_record` object** from the loaded `data`."
#     5.  "I will create the `items` key. I will **copy** the **ENTIRE `items_record` list** from the loaded `data`. Then, I will modify ONLY the fields the user requested (e.g., set `gst_rate` to `18` for each item), preserving all other fields and their **REAL IDs**."
#     6.  "I will now call `update_invoice` with a single JSON key `update_data` containing the `invoice`, `buyer`, and `items` objects I just built from the REAL data."
# * **Action:** `update_invoice`
# * **Action Input:** A JSON object string with a single key `update_data`. The value is a dictionary containing the `invoice`, `buyer`, and `items` objects you just constructed from the **REAL LOADED DATA**.

# **Step 3: Report Result**
# * **Goal:** Inform the user of the outcome.
# * **Action:** `Final Answer:`
# * **Response:** The `update_invoice` tool will return `{{"status": "success", ...}}`. Format this message clearly in Markdown for the user.
# </workflows>

# <conversation_context>
# Chat History:
# {chat_history}

# User Input:
# {input}
# </conversation_context>

# <output_instructions>
# Begin!
# Your Thought Process:
# {agent_scratchpad}

# ---
# **FINAL REMINDER:** You have seen the user's input and the tool observations above. Your response now MUST be in the ReAct format.

# * If you are responding to the user, your response MUST start with `Final Answer:`.
# * If you are calling a tool, your response MUST start with `Action:` followed by `Action Input:`.
# * **CRITICAL FORMATTING:** The `Action Input:` MUST be a valid JSON object string.
# * **CRITICAL PARSING:** Do NOT wrap the `Action:` or `Action Input:` in markdown code fences (e.g., `\`\`\`json`) or backticks (e.g., `` `...` ``).

# **Correct Tool Call Format:**
# Action: my_tool_name
# Action Input: {{"parameter": "value", "another": 123}}

# **Incorrect Formats (DO NOT DO THIS):**
# (Do not wrap your output in backticks)
# (Do not wrap your output in markdown code fences)
# </output_instructions>
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

# # async def create_tool_handler(tool_function: Callable, user_id: str) -> Callable:
# #     is_async = inspect.iscoroutinefunction(tool_function)

# #     async def tool_handler(agent_input: Any) -> str:
# #         try:
# #             kwargs = {}
# #             parsed_input = _robust_json_loads(agent_input)

# #             if isinstance(parsed_input, dict):
# #                 kwargs = parsed_input
# #             else:
# #                 sig = inspect.signature(tool_function)
# #                 tool_params = [
# #                     p.name for p in sig.parameters.values()
# #                     if p.name not in ["user_id", "supabase"]
# #                 ]
# #                 if len(tool_params) == 1:
# #                     kwargs = {tool_params[0]: parsed_input}

# #             # auto-inject user_id if required
# #             if "user_id" in inspect.signature(tool_function).parameters:
# #                 kwargs["user_id"] = user_id
# #             if "supabase" in inspect.signature(tool_function).parameters:
# #                 kwargs["supabase"] = supabase

# #             # --- Run tool ---
# #             if is_async:
# #                 result = await tool_function(**kwargs)
# #             else:
# #                 loop = asyncio.get_running_loop()
# #                 result = await loop.run_in_executor(None, lambda: tool_function(**kwargs))

# #             # --- ✅ Special hook for search_existing_buyer ---
# #             if tool_function.__name__ == "search_existing_buyer":
# #                 try:
# #                     data = result if isinstance(result, dict) else json.loads(result)
# #                     if data.get("status") == "found":
# #                         buyer = data.get("details", {})
# #                         # stash in memory so agent can reuse
# #                         AGENT_SESSIONS[user_id].memory.chat_memory.add_user_message(
# #                             f"[SYSTEM] buyer_info: {json.dumps(buyer)}"
# #                         )
# #                 except Exception as e:
# #                     logging.warning(f"Could not cache buyer info: {e}")

# #             return result

# #         except Exception as e:
# #             logging.error(f"Unexpected error in {tool_function.__name__}: {e}")
# #             return f"Unexpected error: {e}"

# #     return tool_handler



# def handle_parsing_error(error) -> str:
#     """
#     A custom error handler that logs the raw error and returns a
#     user-friendly message with more detail.
#     """
#     # Log the full, raw error to your server terminal for debugging
#     # --- FIX: Changed 'logging.error' to 'error' variable ---
#     logging.error(f"AGENT PARSING ERROR: The model produced a malformed response. Raw error: {error}")
    
#     # Return a more informative message to the agent's thought process
#     response = f"I'm having trouble formatting my response. The AI model produced an unparsable output. Please rephrase your request. Raw Error: {error}"
#     return response

# async def create_tool_handler(func_def, user_id, llm_instance): # 👈 Add llm_instance
#     """
#     Creates an async handler for a tool that:
#     1. Expects a JSON string as input (from the ReAct agent).
#     2. Parses the JSON string into a dictionary of arguments.
#     3. Injects the 'user_id' into the function's keyword arguments.
#     4. Injects the 'llm' if the tool needs it.
#     5. Calls the original tool function (sync or async) correctly.
#     """
#     @wraps(func_def)
#     async def coroutine_wrapper(json_input_string: str, **kwargs) -> str: # 👈 Add **kwargs
#         try:
#             # 1. Parse the JSON string from the agent
#             kwargs_from_agent = json.loads(json_input_string)
            
#             if not isinstance(kwargs_from_agent, dict):
#                 return json.dumps({"status": "error", "message": "Input must be a valid JSON object string."})

#             # 2. Inject user_id and llm
#             kwargs_from_agent['user_id'] = user_id
            
#             # 3. Check if the function needs 'llm' and inject it
#             func_sig = inspect.signature(func_def)
#             if 'llm' in func_sig.parameters:
#                 kwargs_from_agent['llm'] = llm_instance
            
#             # 4. Run the tool (sync or async)
#             if inspect.iscoroutinefunction(func_def):
#                 return await func_def(**kwargs_from_agent)
#             else:
#                 return await asyncio.to_thread(func_def, **kwargs_from_agent)
        
#         except json.JSONDecodeError:
#             return json.dumps({"status": "error", "message": f"Invalid JSON input: {json_input_string}"})
#         except TypeError as e:
#             return json.dumps({"status": "error", "message": f"Tool call argument error: {e}"})
#         except Exception as e:
#             return json.dumps({"status": "error", "message": f"An unexpected error occurred in {func_def.__name__}: {e}"})
            
#     return coroutine_wrapper

# async def get_vyapari_agent_executor(user_id: str):
#     """Asynchronously creates or retrieves a stateful agent executor."""
#     if user_id in AGENT_SESSIONS:
#         return AGENT_SESSIONS[user_id]

#     logging.info(f"✅ Creating new agent session for user: {user_id}")
    
#     llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)
    
#     memory = ConversationBufferWindowMemory(
#         k=5, memory_key="chat_history", input_key="input", output_key="output", return_messages=True
#     )
            
#     # --- Define all available tools ---
#     available_tools = {
#         "get_next_invoice_number": get_next_invoice_number,
#         "search_existing_buyer": search_existing_buyer,
#         "get_all_buyers": get_all_buyers,
#         "load_invoice_for_edit": load_invoice_for_edit,
#         "create_invoice": create_invoice,
#         "update_invoice": update_invoice,
        
#         "get_sales_summary": get_sales_summary,
#         "get_top_performing_entities": get_top_performing_entities,
#         "get_low_stock_alerts": get_low_stock_alerts,
#         "get_buyer_purchase_history": get_buyer_purchase_history,
#         "log_business_expense": log_business_expense,
#         "get_profit_and_loss_summary": get_profit_and_loss_summary,
#         "schedule_payment_reminder": schedule_payment_reminder,
#         "get_unpaid_invoices": get_unpaid_invoices,

#         "send_invoice_via_email": send_invoice_via_email,
#         "generate_whatsapp_link": generate_whatsapp_link,
#         "get_gstr3b_report": get_gstr3b_report,
#         "search_invoices": search_invoices
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
#         func=lambda q: answer_database_question(user_question=q, user_id=user_id, llm=llm),
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


# async def get_vyapari_agent_executor(user_id: str):
#     """Asynchronously creates or retrieves a stateful agent executor."""
#     if user_id in AGENT_SESSIONS:
#         return AGENT_SESSIONS[user_id]

#     logging.info(f"✅ Creating new agent session for user: {user_id}")
    
#     llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)
    
#     memory = ConversationBufferWindowMemory(
#         k=5, memory_key="chat_history", input_key="input", output_key="output", return_messages=True
#     )
            
#     # --- Define all available tools ---
#     available_tools = {
#         "get_next_invoice_number": get_next_invoice_number,
#         "search_existing_buyer": search_existing_buyer,
#         "get_all_buyers": get_all_buyers,
        
#         # --- FIX: Corrected the tool name key ---
#         "load_invoice_for_editing": load_invoice_for_edit, 
        
#         "create_invoice": create_invoice,
#         "update_invoice": update_invoice,
        
#         "get_sales_summary": get_sales_summary,
#         "get_top_performing_entities": get_top_performing_entities,
#         "get_low_stock_alerts": get_low_stock_alerts,
#         "get_buyer_purchase_history": get_buyer_purchase_history,
#         "log_business_expense": log_business_expense,
#         "get_profit_and_loss_summary": get_profit_and_loss_summary,
#         "schedule_payment_reminder": schedule_payment_reminder,
#         "get_unpaid_invoices": get_unpaid_invoices,

#         "send_invoice_via_email": send_invoice_via_email,
#         "generate_whatsapp_link": generate_whatsapp_link,
#         "get_gstr3b_report": get_gstr3b_report,
#         "search_invoices": search_invoices,
#         "answer_database_question": answer_database_question,
#         "get_item_sales_summary": get_item_sales_summary
#     }

#     tools = []
#     for name, func_def in available_tools.items():
#         tools.append(Tool(
#             name=name,
#             func=func_def, # Pass the raw function
#             coroutine=await create_tool_handler(func_def, user_id,llm),
#             description=func_def.__doc__ or f"A tool to perform the '{name}' action."
#         ))
    
#     # --- FIX #1: Removed `llm_with_tools = llm.bind_tools(tools)` ---
#     # We want the plain LLM to produce ReAct text, not tool calls.

#     # --- FIX #2: Corrected the prompt.partial() call ---
#     # Removed the `tools=...` argument, as it doesn't exist in your template.
#     prompt = agent_prompt_template.partial(
#         tool_names=", ".join([t.name for t in tools]),
#         user_id=user_id,
#         today_date=date.today().isoformat()
#     )

#     # --- FIX #2: USE THE CORRECT SCRATCHPAD FORMATTER ---
#     agent = (
#         RunnablePassthrough.assign(
#             chat_history=lambda x: memory.load_memory_variables(x)["chat_history"],
#         )
#         | RunnablePassthrough.assign(
#             # This is the correct formatter for a ReAct text-based agent.
#             # It will convert the tool's (action, observation) pair into
#             # a string that the LLM can read in the next step.
#             agent_scratchpad=lambda x: format_log_to_str(
#                 x["intermediate_steps"]
#             ),
#         )
#         | prompt
#         | llm  
#         | ReActSingleInputOutputParser()
#     )
    
#     # (Your executor setup is correct)
#     agent_executor = ResilientAgentExecutor(
#         agent=agent, 
#         tools=tools, 
#         memory=memory, 
#         verbose=True,
#         handle_parsing_errors=handle_parsing_error,
#         max_iterations=8,
#         key_manager=gemini_key_manager, 
#         llm=llm
#     )
    
#     AGENT_SESSIONS[user_id] = agent_executor
#     return agent_executor

# class AgentStateManager:
#     def __init__(self):
#         self.conversations = {}
        
#     def get_conversation(self, session_id: str):
#         if session_id not in self.conversations:
#             self.conversations[session_id] = {
#                 'state': 'idle',
#                 'context': {},
#                 'last_action': None
#             }
#         return self.conversations[session_id]
    
#     def update_state(self, session_id: str, state: str, context: dict = None):
#         conv = self.get_conversation(session_id)
#         conv['state'] = state
#         if context:
#             conv['context'].update(context)

# class VyapariOutputParser(ReActSingleInputOutputParser):
#     def parse(self, text: str) -> Dict:
#         try:
#             return super().parse(text)
#         except Exception as e:
#             # Attempt to extract action and input using regex
#             match = re.search(r'Action: (.*?)\nAction Input: (.*?)(?:\n|$)', text)
#             if match:
#                 return {
#                     "action": match.group(1).strip(),
#                     "action_input": match.group(2).strip()
#                 }
#             raise OutputParserException(f"Could not parse output: {text}")

# class EnhancedConversationMemory(ConversationBufferWindowMemory):
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.context_dict = {}
    
#     def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> None:
#         # Save important context for future reference
#         if 'buyer_name' in str(outputs):
#             self.context_dict['buyer_name'] = self._extract_buyer_name(outputs)
#         super().save_context(inputs, outputs)

# def create_structured_tools():
#     return [
#         Tool(
#             name="create_invoice",
#             func=create_invoice,
#             description="Create a new invoice",
#             schema={
#                 "type": "object",
#                 "properties": {
#                     "buyer_name": {"type": "string"},
#                     "items": {
#                         "type": "array",
#                         "items": {
#                             "type": "object",
#                             "properties": {
#                                 "name": {"type": "string"},
#                                 "quantity": {"type": "number"},
#                                 "price": {"type": "number"}
#                             }
#                         }
#                     }
#                 },
#                 "required": ["buyer_name", "items"]
#             }
#         )
#     ]

# class ConversationFlowManager:
#     def __init__(self):
#         self.flows = {
#             'invoice_creation': [
#                 'get_buyer_details',
#                 'get_items',
#                 'confirm_details',
#                 'create_invoice'
#             ]
#         }
        
#     def get_next_step(self, flow_name: str, current_step: str) -> str:
#         flow = self.flows.get(flow_name, [])
#         try:
#             current_index = flow.index(current_step)
#             return flow[current_index + 1] if current_index + 1 < len(flow) else None
#         except ValueError:
#             return flow[0] if flow else None



# --- THIS IS THE FULL, CORRECT app/api/agents/invoice_agent.py FILE ---



# import json
# import os
# import asyncio
# import inspect
# import logging
# import re
# from datetime import date
# from typing import Dict, Any, Union, Callable
# import functools 
# from fastapi import HTTPException
# from pydantic import ValidationError # <-- Import ValidationError

# # --- Core LangChain Imports ---
# from langchain.agents import AgentExecutor, create_tool_calling_agent
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from langchain_core.tools import Tool

# # --- Supabase & Error Handling ---
# from google.api_core.exceptions import ResourceExhausted
# from app.core.supabase import supabase

# # --- 1. IMPORT YOUR NEW MEMORY AND ALL TOOLS ---
# from app.core.supabase_memory import SupabaseChatMessageHistory

# # --- Import ALL tools from your tools file ---
# # This explicit import list is correct.
# from app.tools.sql_query_tool import (
#     run_invoice_creation_workflow,
#     run_invoice_update_workflow,
#     update_buyer_details,
#     get_all_buyers,
#     get_sales_summary,
#     get_top_performing_entities,
#     get_low_stock_alerts,
#     get_buyer_purchase_history,
#     log_business_expense,
#     get_profit_and_loss_summary,
#     schedule_payment_reminder,
#     get_unpaid_invoices,
#     send_invoice_via_email,
#     generate_whatsapp_link,
#     get_gstr3b_report,
#     search_invoices,
#     get_item_sales_summary,
#     search_existing_buyer,
#     get_overdue_invoices,
#     get_product_stock_level,
#     get_ledger_summary,
#     answer_database_question 
# )

# # --- (Fallback OutputParserException class - Unchanged) ---
# try:
#     from langchain.schema import OutputParserException
# except Exception:
#     try:
#         from langchain.agents import OutputParserException
#     except Exception:
#         class OutputParserException(Exception): pass

# # --- (GeminiKeyManager class - Unchanged) ---
# class GeminiKeyManager:
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

# # --- (ResilientAgentExecutor class - UPDATED with KeyError handler) ---
# class ResilientAgentExecutor(AgentExecutor):
#     key_manager: Any
#     llm: Any
#     def handle_errors(self, error):
#         error_str = str(error)
        
#         # --- THIS IS THE FIX FOR YOUR NEW ERROR ---
#         if isinstance(error, KeyError) and "Input to ChatPromptTemplate is missing variables" in error_str:
#             logging.error(f"--- PROMPT KEYERROR --- : {error_str}", exc_info=True)
#             return "I'm sorry, I have a configuration error in my system prompt. Please contact the administrator to fix the prompt templates."
        
#         logging.error(f"Agent Error: {error_str}", exc_info=True) # Log full traceback
        
#         if isinstance(error, OutputParserException):
#             return "I had trouble understanding. Could you rephrase that?"
        
#         if "Invalid argument provided to Gemini" in error_str or "400" in error_str:
#             logging.error("--- GOOGLE API SCHEMA ERROR ---")
#             logging.error("This is likely a Pydantic schema mismatch in your tools file.")
#             return "I'm sorry, I encountered a configuration error with one of my tools. Please ask the administrator to check the tool schemas."

#         if "ValidationError" in error_str:
#              return "I understood your request, but I'm missing some required details. Could you please provide them?"
        
#         return "Something went wrong. Please try again."

#     async def arun(self, *args, **kwargs):
#         try:
#             return await super().arun(*args, **kwargs)
#         except Exception as e:
#             return self.handle_errors(e)

#     async def ainvoke(self, *args, **kwargs):
#         for i in range(len(self.key_manager.keys)):
#             try:
#                 return await super().ainvoke(*args, **kwargs)
#             except ResourceExhausted:
#                 logging.warning(f"API key index {self.key_manager.current_key_index} is rate-limited.")
#                 if i == len(self.key_manager.keys) - 1:
#                     raise HTTPException(status_code=429, detail="All API keys are rate-limited.")
#                 self.llm.google_api_key = self.key_manager.get_next_key()
#             except Exception as e:
#                 return {"output": self.handle_errors(e)}
#         raise HTTPException(status_code=503, detail="Agent failed after multiple key retries.")

# AGENT_SESSIONS: Dict[str, Any] = {}

# # --- THIS IS THE FULLY UPDATED AND CORRECTED AGENT FACTORY ---
# async def get_vyapari_agent_executor(user_id: str):
#     """
#     Asynchronously creates or retrieves a stateful tool-calling agent executor.
#     This version uses Pydantic-based tools to prevent validation errors
#     and SupabaseChatMessageHistory for persistent memory.
#     """
#     if user_id in AGENT_SESSIONS:
#         return AGENT_SESSIONS[user_id]

#     logging.info(f"✅ Creating new agent session for user: {user_id}")
    
#     llm = ChatGoogleGenerativeAI(
#         model="gemini-2.0-flash", 
#         google_api_key=gemini_key_manager.get_initial_key(), 
#         temperature=0.0
#     )
    
#     # --- Use Persistent DB Memory ---
#     chat_history = SupabaseChatMessageHistory(user_id=user_id)
#     memory = ConversationBufferWindowMemory(
#         chat_memory=chat_history, 
#         k=6, 
#         memory_key="chat_history", 
#         input_key="input", 
#         output_key="output", 
#         return_messages=True
#     )
            
#     # --- Explicitly Define the Tools List (This is correct) ---
#     tools = [
#         run_invoice_creation_workflow,
#         run_invoice_update_workflow,
#         # update_buyer_details,
#         get_all_buyers,
#         get_sales_summary,
#         get_top_performing_entities,
#         get_low_stock_alerts,
#         get_buyer_purchase_history,
#         log_business_expense,
#         get_profit_and_loss_summary,
#         schedule_payment_reminder,
#         get_unpaid_invoices,
#         send_invoice_via_email,
#         generate_whatsapp_link,
#         get_gstr3b_report,
#         search_invoices,
#         get_item_sales_summary,
#         search_existing_buyer,
#         get_overdue_invoices,
#         get_product_stock_level,
#         get_ledger_summary
#     ]
    
#     # Handle the special tool that needs the 'llm' object
#     answer_db_question_tool = Tool(
#         name="answer_database_question",
#         # Provide the async function to the 'coroutine' argument
#         coroutine=functools.partial(answer_database_question, llm=llm, user_id=user_id),
#         # Provide a dummy sync function for compatibility
#         func=lambda *args, **kwargs: "This tool can only be run asynchronously.",
#         description=answer_database_question.__doc__ 
#     )
#     tools.append(answer_db_question_tool)
    
#     llm_with_tools = llm.bind_tools(tools)

#     # --- FIX 3: THE NEW, STRICTER PROMPT ---
#     # This prompt is clean and has NO curly braces in the examples
#     # to prevent the KeyError.
    
#     today_date = date.today().isoformat()
    
#     # NOTE: This is NOT an f-string. It's a regular string.
#     # The .format() method is used at the end to safely insert variables.
#     system_prompt_text = """
# You are "Vyapari AI," an intelligent, precise, and helpful AI assistant for merchants.
# Your User ID is: {user_id}
# Today's Date is: {today_date}

# **!! CRITICAL LANGUAGE RULE !!**
# You MUST respond in the exact same language the user uses (English, Hindi, Hinglish).

# **!! CRITICAL TOOL USAGE RULES !!**

# 1.  **YOUR GOAL:** Your ONLY goal is to call tools to answer the user's request.
# 2.  **SCHEMA:** Your tools have a strict Pydantic schema. You MUST follow their schema definitions.

# 3.  **NO INVENTING FIELDS - THIS IS THE MOST IMPORTANT RULE:**
#     * **RULE A:** The field for an item's name is `name`. You **MUST NOT** use `item_name`.
#     * **RULE B:** The field for an item's price is `rate`. You **MUST NOT** use `unit_price` or `price`.
#     * **RULE C:** The field for a buyer's name is `buyer_name`. You **MUST NOT** use `buyer`.
#     * **RULE D:** The field for GST is a `gst` object. You **MUST NOT** use `gst_percentage`.
#     * If you violate this rule, you will fail.

# 4.  **IMMEDIATE TOOL CALL:**
#     * If a user's request can be answered by a tool, you **MUST** call that tool.
#     * After a user provides the final piece of missing information (like an `invoice_number`), your **very next action** MUST be to call the tool.
# 5.  **DO NOT REPLY WITH JSON:** Do not send a chat message that is just JSON. You must *use* that JSON to call the correct tool.
# 6.  **VALIDATION ERRORS:** If you get a "ValidationError" (e.g., "buyer_name Field required"), it means **YOU** made a mistake. It means you used `buyer` instead of `buyer_name`. You MUST fix your JSON and call the tool again.
# 7.  **SMART AUTO-FILL:**
#     * The `rate` for an item is **OPTIONAL**.
#     * If the user says 'create invoice for 2 cars', you do **NOT** need to ask for the rate.
#     * You can call `run_invoice_creation_workflow` by **omitting the `rate` field** (or passing `None`).
#     * The tool will **automatically** find the correct price from the `products` table.
#     * If the item is *not* in the database, the tool will return a "validation_failed" error, and *then* you can ask the user for the rate.
# 8.  **BE ACTIVE, NOT DEPENDENT (MEMORY FIX):**
#     * Your chat history is for context, not a script.
#     * Do **NOT** blindly repeat a past failure.
#     * If the user asks you to do something, you MUST re-run the *full* logic and try to call the tool, even if you failed before.
#     * If you get a "ValidationError", it means **YOU** made a mistake. Re-read the schema, fix your JSON, and call the tool again. Do not just ask the user the same question.

# **Example 2: Update Invoice**
# * **User:** "update the gst rate to 28%"
# * **Agent (Internal Thought):** I need to call `run_invoice_update_workflow`, but I am missing the `invoice_number`. I must ask.
# * **Agent (Response):** "Which invoice number would you like to update?"
# * **User:** "021/2025-26"
# * **Agent (Internal Thought):** Perfect. I now have `invoice_number="021/2025-26"` and the `updates` command. I will build an `InvoiceUpdateCommands` object with a `gst` field. My next action MUST be to call the tool.
# * **Agent (Tool Call):** (Calls the `run_invoice_update_workflow` tool with `invoice_number`="021/2025-26" and the structured `updates` object.)
# * **Agent (Response):** (Replies with the tool's "success" message) "OK, I have updated invoice 021/2025-26 to 28% GST."

# **!! CRITICAL FINAL RESPONSE FORMATTING !!**
# Your final response to the user must be clear and professional.

# * **INCLUDE THE DATA:** When a tool returns a successful result (like an invoice URL, a WhatsApp link, or a sales total), your final summary **MUST** include that data. Do not just say "task complete."
# * **MULTI-STEP TASKS:** For multi-step tasks (e.g., "Create an invoice AND send it"), you MUST format your final answer as a step-by-step summary. Do NOT combine all results into one paragraph.

#     **CORRECT Multi-Step Response Example (This is what you must follow):**
#     OK, I've completed all your requests:

#     ### Task 1: Invoice Created
#     ✅ Invoice 024/2025-26 was created successfully.
#     You can view it here: [https://.../024-2025-26.pdf](https://.../024-2025-26.pdf)

#     ### Task 2: WhatsApp Link Generated
#     ✅ A WhatsApp link for 457812587 has been generated:
#     [https://wa.me/91457812587...](https://wa.me/91457812587...)

#     ### Task 3: Buyer Purchase History
#     Here is the history for Aatish Pharma Solution:
#     * **Total Spent:** ₹587,820.10
#     * **Total Invoices:** 18

# <core_directives>
# 1.  **Understand Intent:** First, determine if the user is asking for information (e.g., "who are my top buyers?"), giving a command (e.g., "create an invoice"), or having a conversation.
# 2.  **No Assumptions:** Never assume the user wants to create an invoice unless they use explicit words like "create," "make," or "generate."
# 3.  **CRITICAL STOP RULE (New & Generalized):**
#     * Do NOT call the same tool twice in a row.
#     * Use the data from the tool's observation to format your `Final Answer:` according to the `<formatting_rules>`.
# </core_directives>

# <formatting_rules>
# * **For Data Reports:** When providing a final report (like a list of buyers, a sales summary, or invoice details, task that you can do), you MUST format your `Final Answer` as raw Markdown.
#     * **CRITICAL TABLE FORMATTING:**
#         * You MUST start the table on a **new line** (e.g., after the `## Heading`).
#         * You MUST put the header, the separator (`|---|`), and each data row on its own **separate new line**.
#         * Do not add newline characters (`\n`) *within* a single table row.
#     * **Headings:** Use `##` and `###`.
#     * **Lists:** Use `*` or `1.`
#     * **Emphasis:** Use `**bold text**`.
# * **For Questions:** When asking the user a follow-up or confirmation question (e.g., "Are you sure?", "Which item do you want?"), you MUST use simple, plain text, prefixed by `Final Answer:`. Do NOT use Markdown for conversational questions.
# * **CRITICAL (All Responses):**
#     * Do NOT wrap your response in markdown code blocks (i.e., do not start with ```markdown or end with ```).
# 1.  **USE MARKDOWN:** You MUST use Markdown for all formatting (lists, bolding, etc.) in **ALL** languages.
# 2.  **BULLET POINTS:** When you are providing a list of items (like your capabilities, or a list of invoices), you **MUST** use markdown bullet points (`*`).
#     * **DO NOT** write long lists as a single, comma-separated paragraph. This is a critical rule.
# </formatting_rules>


# """

#     # Safely format the prompt *after* defining it
#     safe_prompt_text = system_prompt_text.format(user_id=user_id, today_date=today_date)

#     prompt = ChatPromptTemplate.from_messages([
#         ("system", safe_prompt_text), # <-- Use the safely formatted string
#         MessagesPlaceholder(variable_name="chat_history"),
#         ("human", "{input}"),
#         MessagesPlaceholder(variable_name="agent_scratchpad"),
#     ])
#     # --- END OF FIX ---

#     agent = create_tool_calling_agent(llm_with_tools, tools, prompt) 
    
#     agent_executor = ResilientAgentExecutor(
#         agent=agent, 
#         tools=tools, 
#         memory=memory, 
#         verbose=True,
#         handle_parsing_errors=True, 
#         max_iterations=10,
#         key_manager=gemini_key_manager, 
#         llm=llm
#     )
    
#     AGENT_SESSIONS[user_id] = agent_executor
#     return agent_executor




import asyncio
import inspect
import os
import logging
from datetime import date
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

# LangChain Imports
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.tools import StructuredTool
from app.services.embedding import semantic_search_invoices
# App Imports
from app.core.supabase_memory import SupabaseChatMessageHistory
import app.tools.sql_query_tool as tools_module # For monkey patching

from app.tools.sql_query_tool import (
    run_invoice_creation_workflow,
    run_invoice_update_workflow,
    get_all_buyers,
    get_sales_summary,
    get_top_performing_entities,
    get_low_stock_alerts,
    get_buyer_purchase_history,
    log_business_expense,
    get_profit_and_loss_summary,
    schedule_payment_reminder,
    get_unpaid_invoices,
    send_invoice_via_email,
    generate_whatsapp_link,
    get_gstr3b_report,
    search_invoices,
    get_item_sales_summary,
    search_existing_buyer,
    get_overdue_invoices,
    get_product_stock_level,
    get_ledger_summary,
    get_next_invoice_number,
    _internal_search_buyer,
    _find_product_for_item,
    _get_item_details_from_history
)

logger = logging.getLogger(__name__)

# ==============================================================================
# --- 1. CRITICAL FIX: UNWRAP TOOLS FOR INTERNAL EXECUTION ---
# This prevents "StructuredTool does not support sync invocation" errors
# ==============================================================================

def unwrap_tool(tool_obj):
    """Extracts the raw async/sync function from a LangChain Tool."""
    if hasattr(tool_obj, "coroutine") and tool_obj.coroutine:
        return tool_obj.coroutine
    if hasattr(tool_obj, "func") and tool_obj.func:
        return tool_obj.func
    return tool_obj

# Apply Monkey Patches
tools_module.run_invoice_creation_workflow = unwrap_tool(run_invoice_creation_workflow)
tools_module.run_invoice_update_workflow = unwrap_tool(run_invoice_update_workflow)
tools_module.get_next_invoice_number = unwrap_tool(get_next_invoice_number)
tools_module._internal_search_buyer = unwrap_tool(_internal_search_buyer)
tools_module._find_product_for_item = unwrap_tool(_find_product_for_item)
tools_module._get_item_details_from_history = unwrap_tool(_get_item_details_from_history)
tools_module.search_invoices = unwrap_tool(search_invoices)

# ==============================================================================
# --- 2. INPUT SCHEMAS (Pydantic Models for Agent) ---
# ==============================================================================

class AgentInvoiceInput(BaseModel):
    payload: str = Field(description="Raw JSON string with invoice details (e.g. buyer_name, items)")

class AgentUpdateInput(BaseModel):
    invoice_number: str = Field(description="Invoice Number (e.g. 001/2025)")
    payload: str = Field(description="Raw JSON string with update actions")

class AgentSearchInput(BaseModel):
    query: str = Field(description="Name/Term to search for")

class AgentTimePeriodInput(BaseModel):
    time_period: str = Field(description="Time period (e.g., 'this month', 'last week', 'today')")

class AgentStockInput(BaseModel):
    product_name: str = Field(description="Name of product to check")

class AgentTopEntitiesInput(BaseModel):
    time_period: str = Field(description="Time period (e.g., 'this month')")
    entity_type: str = Field(description="'product' or 'buyer'")

class AgentExpenseInput(BaseModel):
    amount: float = Field(description="Amount of expense")
    description: str = Field(description="Description of expense")
    category: str = Field(description="Category (e.g., Travel, Office, Food)")

class AgentEmailInput(BaseModel):
    invoice_no: str = Field(description="Invoice Number")
    email_address: Optional[str] = Field(default=None, description="Optional override email")

class AgentWhatsAppInput(BaseModel):
    invoice_no: str = Field(description="Invoice Number")
    phone_number: Optional[str] = Field(default=None, description="Optional override phone")

class AgentReminderInput(BaseModel):
    invoice_no: str = Field(description="Invoice Number")
    reminder_date: str = Field(description="Date (YYYY-MM-DD)")

class AgentItemSalesInput(BaseModel):
    item_name: str = Field(description="Name of item/product")

class AgentSearchInvoiceInput(BaseModel):
    query: str = Field(description="Search term (buyer name or invoice number)")
    status: Optional[str] = Field(default=None, description="Optional status (paid/unpaid)")

class AgentKnowledgeInput(BaseModel):
    query: str = Field(description="Question about invoice history, specific items, or rates.")

class AgentSearchInvoiceInput(BaseModel):
    query: str = Field(description="Search term (buyer name or invoice number)")
    status: Optional[str] = Field(default=None, description="Optional status (paid/unpaid)")



# ==============================================================================
# --- 3. AGENT EXECUTOR & MANAGER ---
# ==============================================================================

class GeminiKeyManager:
    def __init__(self):
        self.key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY_1")
        if not self.key: raise ValueError("GEMINI_API_KEY not set")
    def get_key(self): return self.key

gemini_key_manager = GeminiKeyManager()

class ResilientAgentExecutor(AgentExecutor):
    def handle_errors(self, error: Exception) -> str:
        error_str = str(error)
        logger.error(f"Agent Error: {error_str}", exc_info=True)
        if "ValidationError" in error_str:
            return "I checked the data and found some issues (e.g. missing fields). Please review your input."
        return "I encountered a system error. Please try again."

AGENT_SESSIONS: Dict[str, Any] = {}

async def get_vyapari_agent_executor(user_id: str):
    if user_id in AGENT_SESSIONS: return AGENT_SESSIONS[user_id]

    logger.info(f"✅ Creating agent for user: {user_id}")

    # ==============================================================================
    # --- 4. TOOL WRAPPERS (Context Injection) ---
    # ==============================================================================

    # Async Workflows
    async def create_invoice_wrapper(payload: str, **kwargs) -> str:
        return await unwrap_tool(run_invoice_creation_workflow)(user_id=user_id, payload=payload)

    async def update_invoice_wrapper(invoice_number: str, payload: str, **kwargs) -> str:
        return await unwrap_tool(run_invoice_update_workflow)(user_id=user_id, invoice_number=invoice_number, payload=payload)

    async def search_buyer_wrapper(query: str, **kwargs) -> str:
        return await unwrap_tool(_internal_search_buyer)(user_id=user_id, name=query)

    # Sync Reporting Tools
    def get_buyers_wrapper(**kwargs) -> str:
        return unwrap_tool(get_all_buyers)(user_id=user_id)

    def get_sales_wrapper(time_period: str, **kwargs) -> str:
        return unwrap_tool(get_sales_summary)(user_id=user_id, time_period=time_period)

    def get_stock_wrapper(product_name: str, **kwargs) -> str:
        return unwrap_tool(get_product_stock_level)(user_id=user_id, product_name=product_name)

    def get_unpaid_wrapper(**kwargs) -> str:
        return unwrap_tool(get_unpaid_invoices)(user_id=user_id)

    def get_overdue_wrapper(**kwargs) -> str:
        return unwrap_tool(get_overdue_invoices)(user_id=user_id)
        
    def get_low_stock_wrapper(**kwargs) -> str:
        return unwrap_tool(get_low_stock_alerts)(user_id=user_id)

    def get_top_entities_wrapper(time_period: str, entity_type: str, **kwargs) -> str:
        return unwrap_tool(get_top_performing_entities)(user_id=user_id, time_period=time_period, entity_type=entity_type)

    def log_expense_wrapper(amount: float, description: str, category: str, **kwargs) -> str:
        return unwrap_tool(log_business_expense)(user_id=user_id, amount=amount, description=description, category=category)

    def get_pnl_wrapper(time_period: str, **kwargs) -> str:
        return unwrap_tool(get_profit_and_loss_summary)(user_id=user_id, time_period=time_period)

    def get_ledger_wrapper(time_period: str, **kwargs) -> str:
        return unwrap_tool(get_ledger_summary)(user_id=user_id, time_period=time_period)

    async def get_buyer_history_wrapper(query: str, **kwargs) -> str:
        # We call _internal_search_buyer directly as the logic is identical for history/search in your codebase
        func = unwrap_tool(_internal_search_buyer)
        return await func(user_id=user_id, name=query)
    
    async def search_knowledge_wrapper(query: str, **kwargs) -> str:
        return await semantic_search_invoices(user_id, query)

    def send_email_wrapper(invoice_no: str, email_address: Optional[str] = None, **kwargs) -> str:
        return unwrap_tool(send_invoice_via_email)(user_id=user_id, invoice_no=invoice_no, email_address=email_address)

    def send_whatsapp_wrapper(invoice_no: str, phone_number: Optional[str] = None, **kwargs) -> str:
        return unwrap_tool(generate_whatsapp_link)(user_id=user_id, invoice_no=invoice_no, phone_number=phone_number)

    def schedule_reminder_wrapper(invoice_no: str, reminder_date: str, **kwargs) -> str:
        return unwrap_tool(schedule_payment_reminder)(user_id=user_id, invoice_no=invoice_no, reminder_date=reminder_date)

    def get_gstr3b_wrapper(time_period: str, **kwargs) -> str:
        return unwrap_tool(get_gstr3b_report)(user_id=user_id, time_period=time_period)

    def search_invoices_wrapper(query: str, status: Optional[str] = None, **kwargs) -> str:
        # Intelligent mapping: check if query looks like invoice number or buyer name
        if "/" in query or query.isdigit():
            return unwrap_tool(search_invoices)(user_id=user_id, invoice_number=query, status=status)
        else:
            return unwrap_tool(search_invoices)(user_id=user_id, buyer_name=query, status=status)

    def get_item_sales_wrapper(item_name: str, **kwargs) -> str:
        return unwrap_tool(get_item_sales_summary)(user_id=user_id, item_name=item_name)
    
       # --- NEW: Next invoice number wrapper (async-safe) ---
    async def get_next_invoice_no_wrapper(**kwargs) -> str:
       func = unwrap_tool(get_next_invoice_number)
       if inspect.iscoroutinefunction(func):
           return await func(user_id=user_id)
       return await asyncio.to_thread(func, user_id=user_id)


    # ==============================================================================
    # --- 5. DEFINE TOOLS ---
    # ==============================================================================
    tools = [
        # -- Core Workflow --
        StructuredTool.from_function(func=None, coroutine=create_invoice_wrapper, name="agent_create_invoice", description="SAVE a new invoice. Input JSON.", args_schema=AgentInvoiceInput),
        StructuredTool.from_function(func=None, coroutine=update_invoice_wrapper, name="agent_update_invoice", description="UPDATE an invoice. Input invoice_number + JSON.", args_schema=AgentUpdateInput),
        
        # -- Buyers & Search --
        StructuredTool.from_function(func=get_buyers_wrapper, name="agent_get_all_buyers", description="List all buyers."),
        StructuredTool.from_function(func=None, coroutine=search_buyer_wrapper, name="agent_search_buyer", description="Find a specific buyer details.", args_schema=AgentSearchInput),
        StructuredTool.from_function(func=get_buyer_history_wrapper, name="agent_buyer_history", description="Get purchase history of a buyer.", args_schema=AgentSearchInput),
        
        # -- Reports & Analytics --
        StructuredTool.from_function(func=get_sales_wrapper, name="agent_get_sales", description="Get sales summary (revenue, GST).", args_schema=AgentTimePeriodInput),
        StructuredTool.from_function(func=get_top_entities_wrapper, name="agent_top_performers", description="Get top buyers or products.", args_schema=AgentTopEntitiesInput),
        StructuredTool.from_function(func=get_pnl_wrapper, name="agent_get_pnl", description="Get Profit & Loss summary.", args_schema=AgentTimePeriodInput),
        StructuredTool.from_function(func=get_ledger_wrapper, name="agent_get_ledger", description="Get ledger (Income/Expense) summary.", args_schema=AgentTimePeriodInput),
        StructuredTool.from_function(func=get_gstr3b_wrapper, name="agent_gstr3b_report", description="Get GSTR-3B Tax report.", args_schema=AgentTimePeriodInput),
        StructuredTool.from_function(func=get_item_sales_wrapper, name="agent_item_sales", description="Get sales stats for a specific item.", args_schema=AgentItemSalesInput),

        # -- Inventory --
        StructuredTool.from_function(func=get_stock_wrapper, name="agent_check_stock", description="Check stock level.", args_schema=AgentStockInput),
        StructuredTool.from_function(func=get_low_stock_wrapper, name="agent_low_stock", description="Get list of low stock items."),

        # -- Expenses --
        StructuredTool.from_function(func=log_expense_wrapper, name="agent_log_expense", description="Log a business expense.", args_schema=AgentExpenseInput),

        # -- Invoice Management --
        StructuredTool.from_function(func=get_unpaid_wrapper, name="agent_unpaid_invoices", description="List unpaid invoices."),
        StructuredTool.from_function(func=get_overdue_wrapper, name="agent_overdue_invoices", description="List overdue invoices."),
        StructuredTool.from_function(func=search_invoices_wrapper, name="agent_search_invoices", description="Search invoices by name or number.", args_schema=AgentSearchInvoiceInput),
        
        # -- Actions --
        StructuredTool.from_function(func=send_email_wrapper, name="agent_send_email", description="Email an invoice.", args_schema=AgentEmailInput),
        StructuredTool.from_function(func=send_whatsapp_wrapper, name="agent_send_whatsapp", description="Generate WhatsApp link for invoice.", args_schema=AgentWhatsAppInput),
        StructuredTool.from_function(func=schedule_reminder_wrapper, name="agent_schedule_reminder", description="Schedule payment reminder.", args_schema=AgentReminderInput),
        StructuredTool.from_function(
        func=None,
        coroutine=search_knowledge_wrapper,
        name="agent_search_knowledge",
        description="Use this to answer specific questions about past sales, item rates, or buyer history. Example: 'What price did I sell the chair to ABC?'",
        args_schema=AgentKnowledgeInput
    ),
        StructuredTool.from_function(func=None, coroutine=get_next_invoice_no_wrapper, name="agent_get_next_invoice_no", description="Get the next available invoice number.")
    ]

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key_manager.get_key(), temperature=0.0)
    
    chat_history = SupabaseChatMessageHistory(user_id=user_id)
    memory = ConversationBufferWindowMemory(chat_memory=chat_history, k=10, memory_key="chat_history", return_messages=True)
    
    today_date = date.today().isoformat()
    
    system_prompt = f"""You are Vyapari AI.
User ID: {user_id}
Date: {today_date}

### 🧠 INTENT MAPPING:
- **Create/Update:** `agent_create_invoice`, `agent_update_invoice`
- **Buyers:** `agent_get_all_buyers`, `agent_search_buyer`, `agent_buyer_history`
- **Sales/Tax:** `agent_get_sales` (Revenue), `agent_gstr3b_report` (Tax), `agent_get_pnl` (Profit/Loss)
- **Inventory:** `agent_check_stock`, `agent_low_stock`, `agent_top_performers`
- **Invoices:** `agent_search_invoices`, `agent_unpaid_invoices`, `agent_overdue_invoices`
- **Actions:** `agent_send_email`, `agent_send_whatsapp`, `agent_schedule_reminder`, `agent_log_expense`

### ⚠️ JSON RULES:
1. **FOR CREATING INVOICE:**
   Use the `items` key.
   CORRECT: {{{{ "buyer_name": "ABC", "items": [ {{{{ "name": "X", "quantity": 1 }}}} ] }}}}
   WRONG: Do NOT use `line_items`.

2. **UPDATE:** Use `line_items` list. Each item has `action` ("add", "update", "remove").
   - Example: {{{{ "line_items": [ {{{{ "action": "add", "item": {{{{ "name": "X", "rate": 500 }}}} }}}} ] }}}}
3. **FIELDS:** Use `rate`, not `price`. Use `gst_rate`, not `gst`.

### 🚫 RULES:
1. NEVER output JSON text. Execute the tool.
2. Do not wrap inputs in markdown.
3. Stop if tool returns success.

<formatting_rules>
    * **CRITICAL TABLE FORMATTING:** You MUST use the exact pipe syntax for tables (`| Header | ... | \n |---|---| \n | Data | ... |`).
    * **CRITICAL (All Responses):** Do NOT wrap your response in markdown code blocks.
</formatting_rules>

"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    
    agent_executor = ResilientAgentExecutor(
        agent=agent, tools=tools, memory=memory, verbose=True, handle_parsing_errors=True, max_iterations=5
    )
    
    AGENT_SESSIONS[user_id] = agent_executor
    return agent_executor