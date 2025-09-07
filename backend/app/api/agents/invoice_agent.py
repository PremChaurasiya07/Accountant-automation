

# import json
# import os
# import re
# import logging
# from datetime import date
# from typing import Dict, Any, Tuple

# from fastapi import HTTPException
# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from google.api_core.exceptions import ResourceExhausted
# from dateutil.relativedelta import relativedelta
# from dateutil.parser import parse

# # --- App-specific Imports ---
# from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
# from utils.semantic import get_context_for_query
# # --- MODIFIED: Import all tools from the new, unified tools file ---
# from app.tools.sql_query_tool import (
#     answer_database_question,
#     generate_gstr3b_download_link,
#     generate_whatsapp_link,
#     get_sales_summary,
#     # generate_sales_trend_chart,
#     get_low_stock_alerts,
#     # get_buyer_purchase_history,
#     get_top_performing_entities,
#     send_invoice_via_email,
#     search_existing_buyer,
#     get_gstr3b_report
#     #find_hsn_code
# )


# # --- GeminiKeyManager Class ---
# class GeminiKeyManager:
#     """A manager to load and rotate Google Gemini API keys from environment variables."""
#     def __init__(self):
#         self.keys = self._load_keys()
#         if not self.keys:
#             raise ValueError("No Gemini API keys found. Please set GEMINI_API_KEY_1, etc., in your .env file.")
#         self.current_key_index = 0
#         logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys.")

#     def _load_keys(self) -> list[str]:
#         keys = []
#         i = 1
#         while True:
#             key = os.getenv(f"GEMINI_API_KEY_{i}")
#             if key:
#                 keys.append(key); i += 1
#             else:
#                 break
#         return keys

#     def get_next_key(self) -> str:
#         self.current_key_index = (self.current_key_index + 1) % len(self.keys)
#         logging.warning(f"🔑 Switching to Gemini API key index: {self.current_key_index}")
#         return self.keys[self.current_key_index]
    
#     def get_initial_key(self) -> str:
#         return self.keys[0]

# gemini_key_manager = GeminiKeyManager()

# # --- ResilientAgentExecutor Subclass ---
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
#                     logging.error("All Gemini API keys are rate-limited.")
#                     raise HTTPException(status_code=429, detail="All API keys are rate-limited. Please try again later.")
                
#                 next_key = self.key_manager.get_next_key()
#                 self.llm.google_api_key = next_key
        
#         raise HTTPException(status_code=503, detail="Agent could not run successfully after multiple key retries.")


# AGENT_SESSIONS: Dict[str, Any] = {}

# # --- MODIFIED: Final, Robust Prompt Template with New Tool Instructions ---
# agent_prompt_template = PromptTemplate.from_template("""
# You are an expert Vyapari (merchant) assistant AI. Your primary goal is to accurately understand the user's intent and then use the correct tool to accomplish their task.

# **Your Response Options:**
# You have two ways to respond. Choose one based on your goal.

# **Option 1: Use a Tool**
# When you need to get information or perform an action, use a tool. Your response MUST be in this exact format:
# Thought: Your reasoning for using the tool.
# Action: The name of the tool to use, which must be one of [{tool_names}].
# Action Input: The input for the tool.


# **Option 2: Respond to the User**
# When you need to ask the user for more information, or when you have the final answer, respond directly to them. Your response MUST be in this exact format:
# Thought: Your reasoning for responding to the user.
# Final Answer: The message you want to send to the user.


# ---
# **PRIMARY DIRECTIVE: HOW TO THINK AND ACT**
# Your first and most important job is to understand the user's intent and choose the right tool. Prioritize the specific tools in the 'Business Analytics' section before using the general `answer_database_question` tool.

# 1.  **For Specific Business Analytics & Reporting:**
#     * To get a summary of **total sales, revenue, invoice count, or average sale value** for a period (e.g., 'this month', 'last year', 'today'), you **MUST** use the `get_sales_summary` tool. The input is the time period as a string (e.g., "last month").
#     * To find your **best-selling products or top customers**, you **MUST** use the `get_top_performing_entities` tool. The input must be a JSON object like: `{{"time_period": "this year", "entity_type": "product"}}` or `{{"time_period": "this month", "entity_type": "buyer"}}`.
#     * To check for **products that are low on stock and need reordering**, you **MUST** use the `get_low_stock_alerts` tool. This tool takes no input.
#     * To get data needed to **create a chart or see a sales trend over time**, you **MUST** use the `generate_sales_trend_chart` tool. The input must be a JSON object like: `{{"time_period": "this year", "group_by": "monthly"}}`.

# 2.  **For General Questions & Complex Calculations:**
#     * For **any other complex question** that requires calculation, aggregation, or counting from the database and is **NOT** covered by the tools above (e.g., "how many unique items did I sell in August?", "what's the total revenue from customers in Mumbai?"), you **MUST** use the `answer_database_question` tool. This is your flexible fallback tool.

# 3.  **For Finding Specific Invoice Details:**
#     * If the user asks for the **text content or details of a specific invoice** (e.g., "what was my last sale?", "show me the invoice for ABC Corp"), you **MUST** use the `query_past_invoices` tool.

# 4.  **For Creating a NEW Invoice:**
#     * If the user explicitly asks to create a new bill or invoice, start the **Invoice Creation Workflow**.

# 5.  **For Editing an Invoice:**
#     * If the user wants to edit an existing invoice, you **MUST** use the `load_invoice_for_editing` tool first. 
#     * **CRITICAL:** The input for this tool **MUST** be only the invoice number as a simple string (e.g., "66" or "066/2025-26"). **DO NOT** provide a JSON object or any other data as input. This action triggers the **Invoice Editing Workflow**.
                                                     
# 6.  **For Sharing & Communication:**
#     * When the user asks to "send," "share," or "email" an invoice, use the `send_invoice_via_email` tool.
#     * When the user asks to "WhatsApp" an invoice, use the `generate_whatsapp_link` tool to create a shareable link.
#     * After creating or updating an invoice, you should proactively ask the user if they want to send it. For example: "The invoice has been created. Would you like me to email it or create a WhatsApp link?"
                                                     
# 7.  * **For GST Reporting**: This is a two-step process. 
#     1. First, use the `get_gstr3b_report` tool to get the analytics for the requested time period and present the summary to the user in your Final Answer.
#     2. After that, if the user wants to download the report, use the `generate_gstr3b_download_link` tool with the SAME time period to get the final URL and provide it to the user.
# ---
# **Invoice Creation Workflow:**
# Follow these steps **ONLY** after you have determined the user wants to create a new invoice.

# * **Step 1: Get Number:** Use the `get_next_invoice_number` tool to get the next sequential invoice number.

# * **Step 2: Gather Buyer and Item Details Intelligently:**
#     * **Buyer Details:**
#         * First, ask the user for the **buyer's name only**.
#         * Immediately use the `search_existing_buyer` tool to check if they are a returning customer.
#         * **If the buyer is found**, confirm with the user if you should use their saved details (e.g., "Found returning customer 'Rohan Enterprises'. Should I use their saved address and GSTIN?").
#         * **If the buyer is not found**, then ask the user for their full address and other details.

# * **Step 3: Confirm:** After gathering all details, provide a full summary of the invoice (buyer, all items with HSN, rates, quantity, and price) and ask the user for a final "Yes" or "No" confirmation.
#     * **Step 4: Create:** ONLY after the user confirms, use the `create_new_invoice` tool. The `Action Input` MUST be a single, valid JSON object with the following exact "nested" structure. Do not add any text or formatting outside the JSON block.
#       ```json
#       {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "{today_date}"}}, "buyer": {{"name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"name": "ITEM_DESCRIPTION", "quantity": QUANTITY, "price_per_unit": PRICE}}]}}
#       ```
# ---
# **Invoice Editing Workflow:**
# You **MUST** follow these steps precisely after the `load_invoice_for_editing` tool has been successfully used.

# * **Step 1: Display Data & State Intent:**
#     * The output of the `load_invoice_for_editing` tool is a JSON object.
#     * You **MUST** summarize the key details (Invoice No, Date, Buyer Name, Items) and present this summary to the user.
#     * End your response by stating that the invoice is ready for editing.

# * **Step 2: Receive Changes and Create Updated Data:**
#     * The user will reply with their desired change.
#     * You **MUST** find the original full JSON data from the tool's output in the conversation history.
#     * Apply the user's requested change to this JSON data to create a **new, modified JSON object**.

# * **Step 3: Summarize Changes and Ask for Confirmation:**
#     * You **MUST** present a summary of the **newly modified** invoice data to the user and ask for final confirmation with 'Yes' or 'No'.

# * **Step 4: Execute the Update:**
#     * **ONLY** after the user confirms with "Yes", you **MUST** use the `update_invoice` tool.
#     * **CRITICAL INSTRUCTION:** To create the `Action Input`, you **MUST** start with the complete and original JSON from the `load_invoice_for_editing` output in the history. You must then apply the user's changes to it. The final `Action Input` must be the **full, valid JSON object**, preserving all original details that were not changed.
#     * The final JSON **MUST** follow this exact nested structure. **DO NOT** use placeholders like 'ITEM_DESCRIPTION', 'QUANTITY', or 'PRICE'. All values must be the real, final values.
#       ```json
#       {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "YYYY-MM-DD"}}, "buyer": {{"id": BUYER_ID_IF_KNOWN, "name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"name": "ACTUAL_ITEM_NAME", "quantity": ACTUAL_QUANTITY, "price_per_unit": ACTUAL_PRICE}}]}}
#       ```
# ---
                                                     
# **User ID:** {user_id}
# **Today's Date:** {today_date}
                                                                        
# Begin!

# **Conversation History:**
# {chat_history}
# **User Input:**
# {input}
# **Your Thought Process:**
# {agent_scratchpad}
# """)

# def get_vyapari_agent_executor(user_id: str):
#     """Creates or retrieves a stateful agent executor for a given user."""
#     if user_id in AGENT_SESSIONS:
#         return AGENT_SESSIONS[user_id]

#     print(f"✅ Creating new agent session for user: {user_id}")

#     # This is the single, shared LLM instance
#     llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)

#    # --- Simplified Helper ONLY for parsing JSON ---
#     def _robust_json_loads(input_data: str) -> Any:
#         # This helper now correctly handles simple numbers/strings that are valid JSON values
#         if isinstance(input_data, (dict, int, float)): return input_data
#         clean_input = input_data.strip().removeprefix("```json").removesuffix("```").strip()
#         try:
#             return json.loads(clean_input)
#         except json.JSONDecodeError:
#             # If it fails to parse, it's just a plain string.
#             return clean_input
        
#     def _parse_time_period(time_period: str) -> Tuple[date, date]:
#         today = date.today()
#         tp = time_period.lower().strip().replace('"', '')
#         if tp == "today": return today, today
#         if tp == "yesterday":
#             start = today - relativedelta(days=1)
#             return start, start
#         if tp == "this month": return today.replace(day=1), today
#         if tp == "last month":
#             end = today.replace(day=1) - relativedelta(days=1)
#             start = end.replace(day=1)
#             return start, end
#         if tp == "this year": return today.replace(month=1, day=1), today
#         try:
#             parsed_date = parse(tp).date()
#             return parsed_date, parsed_date
#         except ValueError:
#             return today.replace(day=1), today
            
#     # --- NEW: Smart handler for GSTR-3B tool ---
#     def gstr3b_tool_handler(agent_input: str):
#         """Handles both JSON and simple time period strings for the GSTR-3B tool."""
#         parsed_input = _robust_json_loads(agent_input)

#         if isinstance(parsed_input, dict) and 'start_date' in parsed_input:
#             # Agent correctly provided a JSON object with dates
#             return get_gstr3b_report(user_id=user_id, **parsed_input)
#         elif isinstance(parsed_input, str):
#             # Agent provided a simple string like "last month".
#             # We convert it to dates before calling the tool.
#             start_date, end_date = _parse_time_period(parsed_input)
#             return get_gstr3b_report(
#                 user_id=user_id, 
#                 start_date=start_date.isoformat(), 
#                 end_date=end_date.isoformat()
#             )
#         else:
#             return "Error: Invalid input for GSTR-3B report. Please provide a time period like 'last month' or a specific date range."

#     # --- NEW: Smart handlers for sharing tools ---
#     def email_tool_handler(agent_input: str):
#         """Handles both JSON and simple string inputs, and sanitizes keys."""
#         parsed_input = _robust_json_loads(agent_input)
#         if isinstance(parsed_input, dict):
#             # --- THE FIX ---
#             # Remove extra data the agent might mistakenly include.
#             parsed_input.pop('user_id', None)
#             parsed_input.pop('seller_data', None) # <--- ADD THIS LINE
            
#             # Check for common hallucinated key names and correct them.
#             if 'invoice_number' in parsed_input:
#                 parsed_input['invoice_no'] = parsed_input.pop('invoice_number')
#             if 'recipient_email' in parsed_input:
#                 parsed_input['email_address'] = parsed_input.pop('recipient_email')
            
#             return send_invoice_via_email(user_id=user_id, **parsed_input)
#         else:
#             return send_invoice_via_email(user_id=user_id, invoice_no=str(parsed_input))
            
#     def whatsapp_tool_handler(agent_input: str):
#         """Handles both JSON and simple string inputs, and sanitizes keys."""
#         parsed_input = _robust_json_loads(agent_input)
#         if isinstance(parsed_input, dict):
#             # --- THE FIX ---
#             # Check for the incorrect key name 'invoice_number' and fix it.
#             if 'invoice_number' in parsed_input:
#                 parsed_input['invoice_no'] = parsed_input.pop('invoice_number')

#             return generate_whatsapp_link(user_id=user_id, **parsed_input)
#         else:
#             return generate_whatsapp_link(user_id=user_id, invoice_no=str(parsed_input))



#     # --- The Final, Simplified, and Corrected Tool List ---
#     tools = [
#         # --- Tools that expect a SIMPLE STRING input ---
#         Tool(name="get_sales_summary", func=lambda time_period: get_sales_summary(user_id=user_id, time_period=time_period), description="Use to get total sales, revenue, invoice count, or average sale value for a period. Input is the time period as a string (e.g., 'this month')."),
#         Tool(name="get_low_stock_alerts", func=lambda _: get_low_stock_alerts(user_id=user_id), description="Use to find products that are low in stock. Takes no input."),
#         # Tool(name="get_buyer_purchase_history", func=lambda name: get_buyer_purchase_history(user_id=user_id, buyer_name=name), description="Use to get a specific customer's purchase history summary. Input is the customer's name as a string."),
#         Tool(name="query_past_invoices", func=lambda query: get_context_for_query(user_input=query, user_id=user_id), description="Use to find the content or details of specific invoices (e.g., 'what was in the last invoice for Rohan?')."),
#         Tool(name="answer_database_question", func=lambda q: answer_database_question(user_question=q, llm=llm, key_manager=gemini_key_manager), description="A fallback tool for complex questions about your data that are NOT covered by other tools."),
#         Tool(name="load_invoice_for_editing", func=lambda inv_no: load_invoice_for_edit(invoice_number=inv_no, user_id=user_id), description="Use to load an existing invoice's data to begin an editing session. The input MUST be the invoice number as a simple string (e.g., '66')."),
#         Tool(name="get_next_invoice_number", func=lambda _: get_next_invoice_number(user_id=user_id), description="Use as the first step when creating a new invoice."),

#         # --- Tools that expect a JSON OBJECT input ---
#         # Tool(name="get_sales_comparison", func=lambda input_str: get_sales_comparison(user_id=user_id, **_robust_json_loads(input_str)), description="Use to compare sales data between two periods. Input MUST be a JSON object like: {\"time_period_1\": \"this month\", \"time_period_2\": \"last month\"}."),
#         Tool(name="get_top_performing_entities", func=lambda input_str: get_top_performing_entities(user_id=user_id, **_robust_json_loads(input_str)), description="Use to find top products or buyers. Input MUST be a JSON object like: {\"time_period\": \"this year\", \"entity_type\": \"product\"}."),
#         # Tool(name="generate_sales_trend_chart", func=lambda input_str: generate_sales_trend_chart(user_id=user_id, **_robust_json_loads(input_str)), description="Use to create charts or see sales trends. Input MUST be a JSON object like: {\"time_period\": \"this year\", \"group_by\": \"monthly\"}."),
#         # Tool(name="get_gstr3b_report", func=lambda input_str: get_gstr3b_report(user_id=user_id, **_robust_json_loads(input_str)), description="Use to generate a GSTR-3B report. Input MUST be a JSON object with 'start_date' and 'end_date' in 'YYYY-MM-DD' format."),
#         Tool(
#             name="send_invoice_via_email",
#             func=email_tool_handler, # Use the updated smart handler
#             description="Use to send an invoice via email. The tool only needs the invoice number and an optional recipient email. The input MUST be a JSON object with the exact keys: 'invoice_no' (string) and an optional 'email_address' (string). Do not include any other data."
#         ),
#         Tool(
#             name="generate_whatsapp_link",
#             func=whatsapp_tool_handler, # Use the new smart handler
#             description="Use to generate a WhatsApp link. Input can be a simple invoice number (e.g., '66') or a JSON object with 'invoice_no' and an optional 'phone_number'."
#         ),
#         Tool(name="create_new_invoice", func=lambda input_str: create_invoice(invoice_data=_robust_json_loads(input_str), user_id=user_id, template_no="temp1"), description="Use to save a new invoice after user confirmation. Input must be the full invoice JSON."),
#         Tool(name="update_invoice", func=lambda input_str: update_invoice(invoice_data=_robust_json_loads(input_str), user_id=user_id), description="Use to save changes to an existing invoice after user confirmation. Input must be the full, modified invoice JSON."),

#         Tool(
#             name="search_existing_buyer",
#             func=lambda name: search_existing_buyer(user_id=user_id, buyer_name=name),
#             description="Use this tool FIRST to find an existing buyer's details by their name before asking for their full address or GSTIN."
#         ),
#         Tool(
#             name="get_gstr3b_report",
#             func=gstr3b_tool_handler, # Use the new smart handler
#             description="Use to generate a GSTR-3B summary and analytics report for a given date range. The input can be a simple string (e.g., 'last month') or a JSON object with 'start_date' and 'end_date'."
#         ),
#         Tool(
#             name="generate_gstr3b_download_link",
#             func=lambda time_period: generate_gstr3b_download_link(time_period=time_period),
#             description="Use this to get the final, direct download URL for a GSTR-3B report. The input is a simple string for the time period (e.g., 'last month')."
#         ),
#     #      Tool(
#     #     name="find_hsn_code",
#     #     # --- THE FIX: Pass the key_manager into the function ---
#     #     func=lambda desc: find_hsn_code(product_description=desc, key_manager=gemini_key_manager),
#     #     description="Use this to find the correct HSN code for a product based on its description. For example, if the user mentions 'leather office chair', use that as the input."
#     # ),
#     ]

#     memory = ConversationBufferWindowMemory(k=6, memory_key="chat_history", input_key="input", output_key="output", return_messages=True)
    
#     prompt = agent_prompt_template.partial(
#         tools=render_text_description(tools),
#         tool_names=", ".join([t.name for t in tools]),
#         user_id=user_id,
#         today_date=date.today().isoformat()
#     )

#     agent = create_react_agent(llm, tools, prompt)
    
#     agent_executor = ResilientAgentExecutor(
#         agent=agent, tools=tools, memory=memory, verbose=True,
#         handle_parsing_errors="I made a formatting error. I will use one of the two response options defined in the prompt.",
#         max_iterations=10,
#         key_manager=gemini_key_manager,
#         llm=llm
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

**Golden Rule: You MUST NOT confirm a task is complete (e.g., "Invoice created") unless the `create_invoice` tool has run and returned a success message.**

**One Step at a Time Rule: Your response MUST contain ONLY ONE intention. It can be either a tool call (Action/Action Input) OR a response to the user (Final Answer). NEVER include both in the same response.**

**NEW - Tool Input Rule: If a tool requires specific named parameters (like 'time_period'), you MUST use a JSON object for the Action Input. For example: `Action Input: {{"time_period": "last month"}}`. If the tool takes a simple value (like a buyer's name), you can use a plain string.**

**User Input Parsing: The user will speak naturally. You MUST extract key details from their sentences (e.g., from "paneer do kg 50 rupaye", extract Item: Paneer, Quantity: 2, Rate: 50).**

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
        "invoice": {{ "number": "[Actual Invoice Number]", "date": "{today_date}", "due_date": "{today_date}" }},
        "buyer": {{ "name": "[Buyer's Name]", "address": "[Buyer's Address]", "state": "[Buyer's State]", "gstin": "", "phone_no": "", "email": "" }},
        "items": [ {{ "name": "[Item Name]", "quantity": "[Number]", "rate": "[Number]", "unit": "[e.g., ltr]", "hsn": "", "gst_rate": 0 }} ],
        "terms_and_conditions": [ "1. Goods once sold will not be taken back.", "2. Interest @18% p.a. will be charged if not paid within due date." ]
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
    """Creates a safe and robust ASYNCHRONOUS handler for any given tool."""
    is_async = inspect.iscoroutinefunction(tool_function)
    
    async def tool_handler(agent_input: Any) -> str:
        try:
            kwargs = {}
            parsed_input = _robust_json_loads(agent_input)

            if isinstance(parsed_input, dict):
                kwargs = parsed_input
            else:
                sig = inspect.signature(tool_function)
                tool_params = [p.name for p in sig.parameters.values() if p.name != 'user_id' and p.kind == inspect.Parameter.POSITIONAL_OR_KEYWORD]
                if len(tool_params) == 1:
                    kwargs = {tool_params[0]: parsed_input}

            if 'user_id' in inspect.signature(tool_function).parameters:
                kwargs['user_id'] = user_id
            
            if is_async:
                return await tool_function(**kwargs)
            else:
                loop = asyncio.get_running_loop()
                return await loop.run_in_executor(None, lambda: tool_function(**kwargs))
        
        except TypeError as e:
            logging.error(f"TypeError calling {tool_function.__name__}: {e}. Input was: {agent_input}")
            return f"Error: Invalid arguments for {tool_function.__name__}. Details: {e}"
        except Exception as e:
            logging.error(f"An unexpected error occurred in {tool_function.__name__}: {e}")
            return f"An unexpected error occurred: {e}"
            
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