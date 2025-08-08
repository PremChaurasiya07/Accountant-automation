import os
import re
import logging
from langchain_community.utilities import SQLDatabase
from langchain.chains import create_sql_query_chain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from google.api_core.exceptions import ResourceExhausted

DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
if not DB_CONNECTION_STRING:
    raise ValueError("Supabase Postgres connection string not found.")
db = SQLDatabase.from_uri(DB_CONNECTION_STRING)

SQL_PROMPT = PromptTemplate.from_template("""You are a PostgreSQL expert...
... (The full, robust SQL prompt from the previous answer) ...
""")

ANSWER_PROMPT = PromptTemplate.from_template(
    """Given the following user question and the SQL result, write a natural language answer.
**Formatting Instruction:** When stating a currency amount, do not use symbols like '$' or '₹'. State the number plainly.

Question: {question}
SQL Result: {result}
Answer: """
)

def _clean_sql_query(raw_query: str) -> str:
    """Cleans the raw output from the LLM."""
    return re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()

def answer_database_question(user_question: str, llm: ChatGoogleGenerativeAI, key_manager: any) -> str:
    """
    Intelligently answers a database question, with built-in resilience
    for handling API rate limit errors by rotating keys.
    """
    logging.info(f"🧮 Answering database question: '{user_question}'")
    
    for i in range(len(key_manager.keys)):
        try:
            sql_query_chain = (
                RunnablePassthrough.assign(table_info=lambda x: db.get_table_info())
                | SQL_PROMPT
                | llm
                | StrOutputParser()
            )

            raw_sql_query = sql_query_chain.invoke({"question": user_question})
            sql_query = _clean_sql_query(raw_sql_query)
            if not sql_query.upper().startswith(("SELECT", "WITH")):
                return f"Error: The AI failed to generate a valid SQL query. Output: {sql_query}"

            sql_result = db.run(sql_query)
            
            answer_chain = ANSWER_PROMPT | llm
            final_answer = answer_chain.invoke({"question": user_question, "result": sql_result})

            return final_answer.content

        except ResourceExhausted:
            logging.warning(f"API key index {key_manager.current_key_index} is rate-limited inside SQL Tool.")
            if i == len(key_manager.keys) - 1:
                logging.error("All Gemini API keys are rate-limited.")
                return "Error: All available API keys are currently rate-limited. Please try again later."
            
            next_key = key_manager.get_next_key()
            llm.google_api_key = next_key
            
        except Exception as e:
            return f"Error: I could not answer the question using the database. Details: {str(e)}"

    return "Error: The request could not be completed after multiple retries."