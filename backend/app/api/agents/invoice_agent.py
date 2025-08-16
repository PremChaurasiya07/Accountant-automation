


# import json
# import os
# import re
# import logging
# from datetime import date
# from typing import Dict, Any

# from fastapi import HTTPException
# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory
# from google.api_core.exceptions import ResourceExhausted

# # --- App-specific Imports ---
# from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
# from utils.semantic import get_context_for_query
# from app.services.sql_query_tool import answer_database_question

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

# # --- Final, Robust Prompt Template ---
# agent_prompt_template = PromptTemplate.from_template("""
# You are an expert Vyapari (merchant) assistant AI. Your primary goal is to accurately understand the user's intent and then take the correct action.

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
# Your first and most important job is to understand the user's intent and choose the right tool.

# 1.  **For Calculation, Totals, or Counting:**
#     * If the user asks a question that requires **calculation, aggregation, or counting** (e.g., "how much did I sell last month?", "what are my total sales?", "average sale price?"), you **MUST** use the `answer_database_question` tool.

# 2.  **For Finding Specific Invoice Details:**
#     * If the user asks for the **text content or details of a specific invoice** (e.g., "what was my last sale?", "show me the invoice for ABC Corp"), you **MUST** use the `query_past_invoices` tool.

# 3.  **For Creating a NEW Invoice:**
#     * If the user explicitly asks to create a new bill or invoice, start the **Invoice Creation Workflow**.

# 4.  **For Editing an Invoice:**
#     * If the user wants to edit an existing invoice, use the `load_invoice_for_editing` tool.
# ---
# **Invoice Creation Workflow:**
# Follow these steps **ONLY** after you have determined the user wants to create a new invoice.
#     * **Step 1: Get Number:** Use the `get_next_invoice_number` tool.
#     * **Step 2: Ask for Details:** After getting the number, ask the user for the buyer and item details.
#     * **Step 3: Confirm:** After the user provides details, summarize everything and ask for confirmation.
#     * **Step 4: Create:** ONLY after the user confirms, use the `create_new_invoice` tool. The `Action Input` MUST be a single, valid JSON object with the following exact "nested" structure. Do not add any text or formatting outside the JSON block.
#       ```json
#       {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "{today_date}"}}, "buyer": {{"name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"name": "ITEM_DESCRIPTION", "quantity": QUANTITY, "price_per_unit": PRICE}}]}}
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

#      # This is the single, shared LLM instance
#     llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)

#     def _robust_json_loads(json_string: str) -> dict:
#         if isinstance(json_string, dict): return json_string
#         cleaned_string = json_string.strip().removeprefix("```json").removesuffix("```")
#         return json.loads(cleaned_string)

#     tools = [
#         Tool(
#             name="answer_database_question",
#             # Pass the shared LLM and key manager to the tool
#             func=lambda q: answer_database_question(user_question=q, llm=llm, key_manager=gemini_key_manager),
#             description="Use for questions requiring calculation, aggregation, or counting (e.g., 'total sales in July?', 'how many invoices last month?')."
#         ),
#         Tool(
#             name="query_past_invoices",
#             func=lambda q: get_context_for_query(user_input=q, user_id=user_id),
#             description="Use to find the content or details of specific invoices (e.g., 'what was my last sale?', 'find the bill for John Doe')."
#         ),
#         Tool(name="load_invoice_for_editing", func=lambda num: load_invoice_for_edit(invoice_number=num, user_id=user_id), description="Use to load an invoice for editing."),
#         Tool(name="create_new_invoice", func=lambda data_str: create_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id, template_no="temp1"), description="Use to save a new invoice after getting user confirmation."),
#         Tool(name="update_existing_invoice", func=lambda data_str: update_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id), description="Use to save changes to an existing invoice."),
#         Tool(name="get_next_invoice_number", func=lambda _: get_next_invoice_number(user_id=user_id), description="Use as the first step when creating a new invoice."),
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


import json
import os
import re
import logging
from datetime import date
from typing import Dict, Any

from fastapi import HTTPException
from langchain.agents import AgentExecutor, create_react_agent, Tool
from langchain.prompts import PromptTemplate
from langchain_core.tools import render_text_description
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from google.api_core.exceptions import ResourceExhausted

# --- App-specific Imports ---
from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
from utils.semantic import get_context_for_query
# --- MODIFIED: Import all tools from the new, unified tools file ---
from app.services.sql_query_tool import (
    answer_database_question,
    get_sales_summary,
    # generate_sales_trend_chart,
    get_low_stock_alerts,
    # get_buyer_purchase_history,
    get_top_performing_entities,
)


# --- GeminiKeyManager Class ---
class GeminiKeyManager:
    """A manager to load and rotate Google Gemini API keys from environment variables."""
    def __init__(self):
        self.keys = self._load_keys()
        if not self.keys:
            raise ValueError("No Gemini API keys found. Please set GEMINI_API_KEY_1, etc., in your .env file.")
        self.current_key_index = 0
        logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys.")

    def _load_keys(self) -> list[str]:
        keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key:
                keys.append(key); i += 1
            else:
                break
        return keys

    def get_next_key(self) -> str:
        self.current_key_index = (self.current_key_index + 1) % len(self.keys)
        logging.warning(f"🔑 Switching to Gemini API key index: {self.current_key_index}")
        return self.keys[self.current_key_index]
    
    def get_initial_key(self) -> str:
        return self.keys[0]

gemini_key_manager = GeminiKeyManager()

# --- ResilientAgentExecutor Subclass ---
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
                    logging.error("All Gemini API keys are rate-limited.")
                    raise HTTPException(status_code=429, detail="All API keys are rate-limited. Please try again later.")
                
                next_key = self.key_manager.get_next_key()
                self.llm.google_api_key = next_key
        
        raise HTTPException(status_code=503, detail="Agent could not run successfully after multiple key retries.")


AGENT_SESSIONS: Dict[str, Any] = {}

# --- MODIFIED: Final, Robust Prompt Template with New Tool Instructions ---
agent_prompt_template = PromptTemplate.from_template("""
You are an expert Vyapari (merchant) assistant AI. Your primary goal is to accurately understand the user's intent and then use the correct tool to accomplish their task.

**Your Response Options:**
You have two ways to respond. Choose one based on your goal.

**Option 1: Use a Tool**
When you need to get information or perform an action, use a tool. Your response MUST be in this exact format:
Thought: Your reasoning for using the tool.
Action: The name of the tool to use, which must be one of [{tool_names}].
Action Input: The input for the tool.


**Option 2: Respond to the User**
When you need to ask the user for more information, or when you have the final answer, respond directly to them. Your response MUST be in this exact format:
Thought: Your reasoning for responding to the user.
Final Answer: The message you want to send to the user.


---
**PRIMARY DIRECTIVE: HOW TO THINK AND ACT**
Your first and most important job is to understand the user's intent and choose the right tool. Prioritize the specific tools in the 'Business Analytics' section before using the general `answer_database_question` tool.

1.  **For Specific Business Analytics & Reporting:**
    * To get a summary of **total sales, revenue, invoice count, or average sale value** for a period (e.g., 'this month', 'last year', 'today'), you **MUST** use the `get_sales_summary` tool. The input is the time period as a string (e.g., "last month").
    * To find your **best-selling products or top customers**, you **MUST** use the `get_top_performing_entities` tool. The input must be a JSON object like: `{{"time_period": "this year", "entity_type": "product"}}` or `{{"time_period": "this month", "entity_type": "buyer"}}`.
    * To check for **products that are low on stock and need reordering**, you **MUST** use the `get_low_stock_alerts` tool. This tool takes no input.
    * To get data needed to **create a chart or see a sales trend over time**, you **MUST** use the `generate_sales_trend_chart` tool. The input must be a JSON object like: `{{"time_period": "this year", "group_by": "monthly"}}`.

2.  **For General Questions & Complex Calculations:**
    * For **any other complex question** that requires calculation, aggregation, or counting from the database and is **NOT** covered by the tools above (e.g., "how many unique items did I sell in August?", "what's the total revenue from customers in Mumbai?"), you **MUST** use the `answer_database_question` tool. This is your flexible fallback tool.

3.  **For Finding Specific Invoice Details:**
    * If the user asks for the **text content or details of a specific invoice** (e.g., "what was my last sale?", "show me the invoice for ABC Corp"), you **MUST** use the `query_past_invoices` tool.

4.  **For Creating a NEW Invoice:**
    * If the user explicitly asks to create a new bill or invoice, start the **Invoice Creation Workflow**.

5.  **For Editing an Invoice:**
    * If the user wants to edit an existing invoice, you **MUST** use the `load_invoice_for_editing` tool first. 
    * **CRITICAL:** The input for this tool **MUST** be only the invoice number as a simple string (e.g., "66" or "066/2025-26"). **DO NOT** provide a JSON object or any other data as input. This action triggers the **Invoice Editing Workflow**.
---
**Invoice Creation Workflow:**
Follow these steps **ONLY** after you have determined the user wants to create a new invoice.
    * **Step 1: Get Number:** Use the `get_next_invoice_number` tool.
    * **Step 2: Ask for Details:** After getting the number, ask the user for the buyer and item details.
    * **Step 3: Confirm:** After the user provides details, summarize everything and ask for confirmation.
    * **Step 4: Create:** ONLY after the user confirms, use the `create_new_invoice` tool. The `Action Input` MUST be a single, valid JSON object with the following exact "nested" structure. Do not add any text or formatting outside the JSON block.
      ```json
      {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "{today_date}"}}, "buyer": {{"name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"name": "ITEM_DESCRIPTION", "quantity": QUANTITY, "price_per_unit": PRICE}}]}}
      ```
---
**Invoice Editing Workflow:**
You **MUST** follow these steps precisely after the `load_invoice_for_editing` tool has been successfully used.

* **Step 1: Display Data & State Intent:**
    * The output of the `load_invoice_for_editing` tool is a JSON object.
    * You **MUST** summarize the key details (Invoice No, Date, Buyer Name, Items) and present this summary to the user.
    * End your response by stating that the invoice is ready for editing.

* **Step 2: Receive Changes and Create Updated Data:**
    * The user will reply with their desired change.
    * You **MUST** find the original full JSON data from the tool's output in the conversation history.
    * Apply the user's requested change to this JSON data to create a **new, modified JSON object**.

* **Step 3: Summarize Changes and Ask for Confirmation:**
    * You **MUST** present a summary of the **newly modified** invoice data to the user and ask for final confirmation with 'Yes' or 'No'.

* **Step 4: Execute the Update:**
    * **ONLY** after the user confirms with "Yes", you **MUST** use the `update_invoice` tool.
    * **CRITICAL INSTRUCTION:** To create the `Action Input`, you **MUST** start with the complete and original JSON from the `load_invoice_for_editing` output in the history. You must then apply the user's changes to it. The final `Action Input` must be the **full, valid JSON object**, preserving all original details that were not changed.
    * The final JSON **MUST** follow this exact nested structure. **DO NOT** use placeholders like 'ITEM_DESCRIPTION', 'QUANTITY', or 'PRICE'. All values must be the real, final values.
      ```json
      {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "YYYY-MM-DD"}}, "buyer": {{"id": BUYER_ID_IF_KNOWN, "name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"name": "ACTUAL_ITEM_NAME", "quantity": ACTUAL_QUANTITY, "price_per_unit": ACTUAL_PRICE}}]}}
      ```
---
                                                     
**User ID:** {user_id}
**Today's Date:** {today_date}
                                                                        
Begin!

**Conversation History:**
{chat_history}
**User Input:**
{input}
**Your Thought Process:**
{agent_scratchpad}
""")

def get_vyapari_agent_executor(user_id: str):
    """Creates or retrieves a stateful agent executor for a given user."""
    if user_id in AGENT_SESSIONS:
        return AGENT_SESSIONS[user_id]

    print(f"✅ Creating new agent session for user: {user_id}")

    # This is the single, shared LLM instance
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)

    def _robust_json_loads(json_string: str) -> dict:
        if isinstance(json_string, dict): return json_string
        cleaned_string = json_string.strip().removeprefix("```json").removesuffix("```")
        return json.loads(cleaned_string)
    
    # Helper to parse tool inputs that might be JSON strings for multiple arguments
    def _parse_and_call(func, input_str: str, **kwargs):
        try:
            # Assumes the agent passes a JSON string for multi-argument tools
            args = json.loads(input_str)
            return func(**args, **kwargs)
        except (json.JSONDecodeError, TypeError):
            # Fallback for simple string input or if func doesn't expect dict
            return func(input_str, **kwargs)

    # --- MODIFIED: Expanded tool list with new analytics tools ---
    tools = [
        Tool(
            name="get_sales_summary",
            func=lambda time_period: get_sales_summary(user_id=user_id, time_period=time_period),
            description="Use to get total sales, revenue, invoice count, or average sale value for a period. Input is the time period as a string (e.g., 'this month')."
        ),
        Tool(
            name="get_top_performing_entities",
            func=lambda input_str: _parse_and_call(get_top_performing_entities, input_str, user_id=user_id),
            description="Use to find best-selling products or top buyers by revenue. Input MUST be a JSON object like: {\"time_period\": \"this year\", \"entity_type\": \"product\"}."
        ),
        # Tool(
        #     name="get_buyer_purchase_history",
        #     func=lambda name: get_buyer_purchase_history(user_id=user_id, buyer_name=name),
        #     description="Use to get a specific customer's purchase history summary. Input is the customer's name as a string."
        # ),
       
        Tool(
            name="get_low_stock_alerts",
            func=lambda _: get_low_stock_alerts(user_id=user_id),
            description="Use to find products that are low in stock. Takes no input."
        ),
        # Tool(
        #     name="generate_sales_trend_chart",
        #     func=lambda input_str: _parse_and_call(generate_sales_trend_chart, input_str, user_id=user_id),
        #     description="Use to create charts or see sales trends. Input MUST be a JSON object like: {\"time_period\": \"this year\", \"group_by\": \"monthly\"}."
        # ),
        Tool(
            name="answer_database_question",
            func=lambda q: answer_database_question(user_question=q, llm=llm, key_manager=gemini_key_manager),
            description="A fallback tool for complex questions about your data that are NOT covered by other tools. Use this for unusual calculations, aggregations, or counting."
        ),
        Tool(
            name="query_past_invoices",
            func=lambda user_input: get_context_for_query(user_input=user_input, user_id=user_id),
            description="Use this tool to search for and retrieve information from past invoices. The input must be a clear, specific question from the user. For example, if the user asks 'what was on my last invoice?', the input to this tool should be 'what was on my last invoice?'."
        ),
        Tool(
            name="load_invoice_for_editing",
            func=lambda num: load_invoice_for_edit(invoice_number=num, user_id=user_id),
            description="Use to load an existing invoice's data to begin an editing session. The input MUST be the invoice number as a simple string (e.g., '66'). DO NOT provide a JSON object as input."
        ),
        Tool(name="create_new_invoice", func=lambda data_str: create_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id, template_no="temp1"), description="Use to save a new invoice after getting user confirmation."),
        Tool(name="update_existing_invoice", func=lambda data_str: update_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id), description="Use to save changes to an existing invoice."),
        Tool(name="get_next_invoice_number", func=lambda _: get_next_invoice_number(user_id=user_id), description="Use as the first step when creating a new invoice."),
    ]

    memory = ConversationBufferWindowMemory(k=6, memory_key="chat_history", input_key="input", output_key="output", return_messages=True)
    
    prompt = agent_prompt_template.partial(
        tools=render_text_description(tools),
        tool_names=", ".join([t.name for t in tools]),
        user_id=user_id,
        today_date=date.today().isoformat()
    )

    agent = create_react_agent(llm, tools, prompt)
    
    agent_executor = ResilientAgentExecutor(
        agent=agent, tools=tools, memory=memory, verbose=True,
        handle_parsing_errors="I made a formatting error. I will use one of the two response options defined in the prompt.",
        max_iterations=10,
        key_manager=gemini_key_manager,
        llm=llm
    )
    
    AGENT_SESSIONS[user_id] = agent_executor
    return agent_executor