
# import json
# import os
# import re
# from datetime import date
# from typing import Dict, Any

# from langchain.agents import AgentExecutor, create_react_agent, Tool
# from langchain.prompts import PromptTemplate
# from langchain_core.tools import render_text_description
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.memory import ConversationBufferWindowMemory

# from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
# from utils.semantic import get_context_for_query

# # Use a more robust session store like Redis in production
# AGENT_SESSIONS: Dict[str, Any] = {}

# # --- NEW, MORE FLEXIBLE PROMPT TEMPLATE ---
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

# Your first and most important job is to understand the user's intent.

# 1.  **Is the user asking a question?**
#     * If the user asks a question about past invoices, sales, or customers (e.g., "what was my last sale?", "show me the invoice for ABC Corp", "how much did I sell last month?"), you **MUST** use the `query_past_invoices` tool to find the answer for them.
#     * **DO NOT** try to create an invoice if they are asking a question. Answer their question first.

# 2.  **Does the user want to create a NEW invoice?**
#     * If the user explicitly asks to create a new bill or invoice (e.g., "make a new bill", "create an invoice"), and **ONLY** in this case, you must start the **Invoice Creation Workflow** below.

# 3.  **Does the user want to edit an invoice?**
#     * If the user wants to edit an existing invoice, use the `load_invoice_for_editing` tool.

# 4.  **Is the user's request unclear?**
#     * If you are not sure what the user wants, ask clarifying questions using **Option 2**.

# **Invoice Creation Workflow:**
# Follow these steps **ONLY** after you have determined the user wants to create a new invoice.
#     * **Step 1: Get Number:** Use the `get_next_invoice_number` tool.
#     * **Step 2: Ask for Details:** After getting the number, ask the user for the buyer and item details.
#     * **Step 3: Confirm:** After the user provides details, summarize everything and ask for confirmation.
#     * **Step 4: Create:** ONLY after the user confirms, use the `create_new_invoice` tool. The `Action Input` MUST be a single, valid JSON object with the following exact "nested" structure. Do not add any text or formatting outside the JSON block.
#       ```json
#       {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "{today_date}"}}, "buyer": {{"name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"description": "ITEM_DESCRIPTION", "quantity": QUANTITY, "price_per_unit": PRICE}}]}}
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

#     llm = ChatGoogleGenerativeAI(
#         model="gemini-1.5-flash",
#         google_api_key=os.getenv("GEMINI_API_KEY_2"),
#         temperature=0.0,
#         convert_system_message_to_human=True
#     )

#     def _robust_json_loads(json_string: str) -> dict:
#         """
#         Safely parses a JSON string, even if it's embedded in markdown
#         or has other surrounding text and formatting errors.
#         """
#         if isinstance(json_string, dict):
#             return json_string

#         # Clean the string by removing markdown and leading/trailing whitespace
#         cleaned_string = json_string.strip().removeprefix("```json").removesuffix("```").strip()
        
#         # Use regex to find the first complete JSON object. This helps with duplicated outputs.
#         match = re.search(r'\{.*\}', cleaned_string, re.DOTALL)
#         if match:
#             json_part = match.group(0)
#             try:
#                 return json.loads(json_part)
#             except json.JSONDecodeError as e:
#                 print(f"Error decoding extracted JSON part: {json_part}")
#                 # If parsing fails, it might be a malformed object. Raise the error.
#                 raise e
#         else:
#             print(f"Could not find a JSON object in the cleaned string: {cleaned_string}")
#             raise json.JSONDecodeError("No JSON object found in string", cleaned_string, 0)


#     tools = [
#         Tool(
#             name="query_past_invoices",
#             func=lambda q: get_context_for_query(user_input=q, user_id=user_id),
#             description="Use to answer questions about past invoices, like 'what was my last sale?' or 'find the bill for John Doe'."
#         ),
#         Tool(
#             name="load_invoice_for_editing",
#             func=lambda num: load_invoice_for_edit(invoice_number=num, user_id=user_id),
#             description="Use to load a specific, existing invoice for editing when the user provides an invoice number to edit."
#         ),
#         Tool(
#             name="create_new_invoice",
#             func=lambda data_str: create_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id, template_no="temp1"),
#             description="Use to save a new invoice after gathering all details and getting user confirmation."
#         ),
#         Tool(
#             name="update_existing_invoice",
#             func=lambda data_str: update_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id),
#             description="Use to save changes to an existing invoice that has already been loaded."
#         ),
#         Tool(
#             name="get_next_invoice_number",
#             func=lambda _: get_next_invoice_number(user_id=user_id),
#             description="Use this as the very first step ONLY when the user wants to create a brand new invoice."
#         )
#     ]

#     memory = ConversationBufferWindowMemory(
#         k=6,
#         memory_key="chat_history",
#         input_key="input",
#         output_key="output",
#         return_messages=True
#     )

#     prompt = agent_prompt_template.partial(
#         tools=render_text_description(tools),
#         tool_names=", ".join([t.name for t in tools]),
#         user_id=user_id,
#         today_date=date.today().isoformat()
#     )

#     agent = create_react_agent(llm, tools, prompt)
    
#     agent_executor = AgentExecutor(
#         agent=agent,
#         tools=tools,
#         memory=memory,
#         verbose=True,
#         handle_parsing_errors="I made a formatting error. I will use one of the two response options defined in the prompt.",
#         max_iterations=6
#     )
    
#     AGENT_SESSIONS[user_id] = agent_executor
#     return agent_executor


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

# # --- ResilientAgentExecutor Subclass (With Fix) ---
# class ResilientAgentExecutor(AgentExecutor):
#     """An AgentExecutor that catches rate limit errors and retries with a new API key."""
#     key_manager: Any
#     llm: Any  # FIX: Add an attribute to hold a direct reference to the LLM

#     async def ainvoke(self, *args, **kwargs):
#         """Asynchronous invoke with key rotation."""
#         for i in range(len(self.key_manager.keys)):
#             try:
#                 return await super().ainvoke(*args, **kwargs)
#             except ResourceExhausted:
#                 logging.warning(f"API key index {self.key_manager.current_key_index} is rate-limited.")
#                 if i == len(self.key_manager.keys) - 1:
#                     logging.error("All Gemini API keys are rate-limited.")
#                     raise HTTPException(status_code=429, detail="All API keys are rate-limited. Please try again later.")
                
#                 next_key = self.key_manager.get_next_key()
#                 # FIX: Update the API key on the LLM instance directly
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
#       {{"invoice": {{"number": "THE_INVOICE_NUMBER", "date": "{today_date}"}}, "buyer": {{"name": "THE_BUYER_NAME", "address": "THE_BUYER_ADDRESS"}}, "items": [{{"description": "ITEM_DESCRIPTION", "quantity": QUANTITY, "price_per_unit": PRICE}}]}}
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

#     llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key_manager.get_initial_key(), temperature=0.0)

#     def _robust_json_loads(json_string: str) -> dict:
#         if isinstance(json_string, dict): return json_string
#         cleaned_string = json_string.strip().removeprefix("```json").removesuffix("```")
#         return json.loads(cleaned_string)

#     tools = [
#         Tool(
#             name="answer_database_question",
#             func=answer_database_question,
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
    
#     # FIX: Instantiate the ResilientAgentExecutor and pass the llm instance
#     agent_executor = ResilientAgentExecutor(
#         agent=agent,
#         tools=tools,
#         memory=memory,
#         verbose=True,
#         handle_parsing_errors="I made a formatting error. I will use one of the two response options defined in the prompt.",
#         max_iterations=10,
#         key_manager=gemini_key_manager,
#         llm=llm  # Pass the LLM instance directly to the executor
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
from app.services.sql_query_tool import answer_database_question

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

# --- Final, Robust Prompt Template ---
agent_prompt_template = PromptTemplate.from_template("""
You are an expert Vyapari (merchant) assistant AI. Your primary goal is to accurately understand the user's intent and then take the correct action.

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
Your first and most important job is to understand the user's intent and choose the right tool.

1.  **For Calculation, Totals, or Counting:**
    * If the user asks a question that requires **calculation, aggregation, or counting** (e.g., "how much did I sell last month?", "what are my total sales?", "average sale price?"), you **MUST** use the `answer_database_question` tool.

2.  **For Finding Specific Invoice Details:**
    * If the user asks for the **text content or details of a specific invoice** (e.g., "what was my last sale?", "show me the invoice for ABC Corp"), you **MUST** use the `query_past_invoices` tool.

3.  **For Creating a NEW Invoice:**
    * If the user explicitly asks to create a new bill or invoice, start the **Invoice Creation Workflow**.

4.  **For Editing an Invoice:**
    * If the user wants to edit an existing invoice, use the `load_invoice_for_editing` tool.
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

    tools = [
        Tool(
            name="answer_database_question",
            # Pass the shared LLM and key manager to the tool
            func=lambda q: answer_database_question(user_question=q, llm=llm, key_manager=gemini_key_manager),
            description="Use for questions requiring calculation, aggregation, or counting (e.g., 'total sales in July?', 'how many invoices last month?')."
        ),
        Tool(
            name="query_past_invoices",
            func=lambda q: get_context_for_query(user_input=q, user_id=user_id),
            description="Use to find the content or details of specific invoices (e.g., 'what was my last sale?', 'find the bill for John Doe')."
        ),
        Tool(name="load_invoice_for_editing", func=lambda num: load_invoice_for_edit(invoice_number=num, user_id=user_id), description="Use to load an invoice for editing."),
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