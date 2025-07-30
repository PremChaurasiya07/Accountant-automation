# # app/agents/invoice_agent.py

# import json
# import inspect
# from app.models.state import ConversationState
# from app.tools import invoice_tools
# from langchain_google_genai import ChatGoogleGenerativeAI
# from google.api_core.exceptions import ResourceExhausted

# class InvoiceAgent:
#     def __init__(self, key_manager):
#         self.key_manager = key_manager
#         self.tools = {name: func for name, func in inspect.getmembers(invoice_tools, inspect.isfunction) if not name.startswith("_")}
#         self.tool_selection_prompt = self._build_system_prompt("tool_selection")
#         self.response_generation_prompt = self._build_system_prompt("response_generation")

#     def _build_system_prompt(self, mode):
#         if mode == "tool_selection":
#             prompt = "You are an expert at selecting the correct tool to fulfill a user's request.\n"
#             prompt += "Based on the conversation, select a tool and its arguments from the available list.\n"
#             prompt += "Respond with a single JSON object: {\"tool_name\": \"...\", \"arguments\": {...}}.\n"
#             prompt += "Available Tools:\n"
#             for name, func in self.tools.items():
#                 prompt += f"- Tool: {name}\n  Description: {inspect.getdoc(func)}\n"
#             return prompt
#         if mode == "response_generation":
#             return """
#             You are a friendly and helpful invoice assistant.
#             The system has just performed an action. Your task is to generate a natural language response to the user.
#             Base your response on the user's last message and the outcome of the action.
#             Keep your response concise and clear.
            
#             User's last message: {user_input}
#             Action outcome: {action_outcome}
#             Current invoice draft: {draft_invoice}
#             """

#     async def _invoke_llm(self, prompt, temperature=0.0):
#         self.key_manager.current_key_index = 0
#         while (key := self.key_manager.get_key()) is not None:
#             try:
#                 llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=key, temperature=temperature)
#                 response = await llm.ainvoke(prompt)
#                 return response.content
#             except ResourceExhausted:
#                 self.key_manager.switch_to_next_key()
#             except Exception as e:
#                 raise Exception(f"AI error: {e}")
#         raise Exception("All API keys are exhausted.")

#     def _validate_and_prepare_tool_call(self, tool_name, llm_args, state, user_input):
#         """
#         A new, robust validation layer. It checks if the tool exists and if the
#         arguments provided by the LLM are valid for that tool.
#         Returns a callable function and its prepared arguments, or an error message.
#         """
#         if tool_name not in self.tools:
#             return None, None, f"I can't '{tool_name}'. Please try a different command."

#         tool_function = self.tools[tool_name]
#         final_args = {}
        
#         # Get the signature of the Python function to see what arguments it expects.
#         expected_params = inspect.signature(tool_function).parameters

#         # Iterate over the function's expected arguments, not the LLM's provided ones.
#         for param_name, param in expected_params.items():
#             # The 'state' argument is special and always provided by the agent.
#             if param_name == 'state':
#                 final_args['state'] = state
#                 continue

#             # If the LLM provided an argument with the expected name, use it.
#             if param_name in llm_args:
#                 final_args[param_name] = llm_args[param_name]
#             # Handle common LLM variations as a fallback.
#             elif param_name == 'user_id':
#                 # If the tool needs user_id, get it from the state object.
#                 final_args['user_id'] = state.user_id
#             elif param_name == 'user_question':
#                 final_args['user_question'] = llm_args.get('query') or user_input
#             elif param_name == 'updates':
#                  # If the tool expects 'updates', pass the whole llm_args dict.
#                  final_args['updates'] = llm_args
#             elif param_name == 'parsed_data':
#                  # If the tool expects 'parsed_data', assume the entire llm_args
#                  # dictionary is the data to be parsed. This handles cases where the
#                  # LLM provides a flat structure of invoice fields.
#                  final_args['parsed_data'] = llm_args
#             # If a required argument is still missing (and has no default value), return an error.
#             elif param.default is inspect.Parameter.empty:
#                 return None, None, f"The tool '{tool_name}' is missing the required argument: '{param_name}'."

#         return tool_function, final_args, None


#     async def run(self, state: ConversationState, user_input: str):
#         # 1. Select Tool
#         tool_selection_str = await self._invoke_llm(
#             self.tool_selection_prompt + f"\nConversation History: {json.dumps(state.chat_history[-4:])}\nUser Request: \"{user_input}\""
#         )
#         try:
#             tool_call = json.loads(tool_selection_str.strip("```json").strip())
#             tool_name = tool_call.get("tool_name")
#             llm_args = tool_call.get("arguments", {})
#         except (json.JSONDecodeError, AttributeError):
#             return {"message": "I had trouble understanding that. Could you rephrase?"}

#         # 2. Validate and Execute Tool using the new abstraction layer
#         tool_function, final_args, error_message = self._validate_and_prepare_tool_call(
#             tool_name, llm_args, state, user_input
#         )

#         if error_message:
#             return {"message": error_message}
        
#         try:
#             tool_result = await tool_function(**final_args)
#         except Exception as e:
#             # This is a final catch-all for any unexpected runtime errors within the tool itself.
#             return {"message": f"An unexpected error occurred while running the tool '{tool_name}': {e}"}


#         state.last_tool_response = tool_result # Save the raw tool output to state

#         # 3. Generate Final Response
#         final_response_prompt = self.response_generation_prompt.format(
#             user_input=user_input,
#             action_outcome=json.dumps(tool_result),
#             draft_invoice=json.dumps(state.draft_invoice)
#         )
#         final_message = await self._invoke_llm(final_response_prompt, temperature=0.7)

#         # 4. Update History and Return
#         state.chat_history.append({"role": "user", "content": user_input})
#         state.chat_history.append({"role": "assistant", "content": final_message})
        
#         response_payload = {"message": final_message}
#         if tool_result.get("status") == "success" and "url" in tool_result.get("data", {}):
#             response_payload["url"] = tool_result["data"]["url"]
            
#         return response_payload
import json
import os
from datetime import date
from typing import Dict, Any

from langchain.agents import AgentExecutor, create_react_agent, Tool
from langchain.prompts import PromptTemplate
from langchain_core.tools import render_text_description
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory

from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
from utils.semantic import get_context_for_query

# Use a more robust session store like Redis in production
AGENT_SESSIONS: Dict[str, Any] = {}

# Final, Most Robust Prompt Template
agent_prompt_template = PromptTemplate.from_template("""
You are an expert Vyapari (merchant) assistant AI. Your goal is to help the user manage invoices by following a strict set of instructions.

**Your Response Options:**
You have two ways to respond. Choose one based on your goal.

**Option 1: Use a Tool**
When you need to get information or save data, use a tool. Your response MUST be in this exact format:
Thought: Your reasoning for using the tool.
Action: The name of the tool to use, which must be one of [{tool_names}].
Action Input: The input for the tool.


**Option 2: Respond to the User**
When you need to ask the user for more information, or when you have the final answer, respond directly to them. Your response MUST be in this exact format:
Thought: Your reasoning for responding to the user.
Final Answer: The message you want to send to the user.


---
**CRITICAL WORKFLOW FOR CREATING AN INVOICE:**
1.  **Get Number:** Use the `get_next_invoice_number` tool.
2.  **Ask for Details:** After you get the number, you MUST ask the user for the buyer and item details. Use **Option 2 (Respond to the User)** for this step.
3.  **Confirm:** After the user provides details, summarize everything and ask for confirmation. Use **Option 2 (Respond to the User)** for this step.
4.  **Create:** ONLY after the user confirms, use the `create_new_invoice` tool (**Option 1**). The `Action Input` should be a JSON object containing all the gathered details.
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

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY_3"),
        temperature=0.0,
        convert_system_message_to_human=True
    )

    def _robust_json_loads(json_string: str) -> dict:
        if isinstance(json_string, dict): return json_string
        # This handles the LLM sometimes wrapping JSON in markdown backticks
        cleaned_string = json_string.strip().removeprefix("```json").removesuffix("```")
        return json.loads(cleaned_string)

    tools = [
        Tool(
            name="query_past_invoices",
            func=lambda q: get_context_for_query(user_input=q, user_id=user_id),
            description="Use to answer questions about past invoices, like 'what was my last sale?'"
        ),
        Tool(
            name="load_invoice_for_editing",
            func=lambda num: load_invoice_for_edit(invoice_number=num, user_id=user_id),
            description="Use to load a specific, existing invoice for editing."
        ),
        Tool(
            name="create_new_invoice",
            func=lambda data_str: create_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id, template_no="temp1"),
            description="Use to save a new invoice after gathering all details and getting user confirmation."
        ),
        Tool(
            name="update_existing_invoice",
            func=lambda data_str: update_invoice(invoice_data=_robust_json_loads(data_str), user_id=user_id),
            description="Use to save changes to an existing invoice."
        ),
        Tool(
            name="get_next_invoice_number",
            func=lambda _: get_next_invoice_number(user_id=user_id),
            description="Use as the first step when creating a new invoice."
        )
    ]

    memory = ConversationBufferWindowMemory(
        k=6, 
        memory_key="chat_history", 
        input_key="input", 
        output_key="output", 
        return_messages=True
    )

    prompt = agent_prompt_template.partial(
        tools=render_text_description(tools),
        tool_names=", ".join([t.name for t in tools]),
        user_id=user_id,
        today_date=date.today().isoformat()
    )

    agent = create_react_agent(llm, tools, prompt)
    
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        handle_parsing_errors="I made a formatting error. I will use one of the two response options defined in the prompt.",
        max_iterations=10
    )
    
    AGENT_SESSIONS[user_id] = agent_executor
    return agent_executor