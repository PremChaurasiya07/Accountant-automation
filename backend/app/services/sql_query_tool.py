import os
import re
import logging
from langchain_community.utilities import SQLDatabase
from langchain.chains import create_sql_query_chain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# --- GeminiKeyManager Class (Integrated directly into this file) ---
class GeminiKeyManager:
    """A manager to load and rotate Google Gemini API keys from environment variables."""
    def __init__(self):
        self.keys = self._load_keys()
        if not self.keys:
            raise ValueError("No Gemini API keys found. Please set GEMINI_API_KEY_1, etc., in your .env file.")
        self.current_key_index = 0
        logging.info(f"✅ Loaded {len(self.keys)} Gemini API keys for SQL Tool.")

    def _load_keys(self) -> list[str]:
        """Loads all environment variables starting with 'GEMINI_API_KEY_'."""
        keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key:
                keys.append(key)
                i += 1
            else:
                break
        return keys
    
    def get_initial_key(self) -> str:
        """Returns the first key in the list."""
        return self.keys[0]

# --- Create a single instance for this tool ---
gemini_key_manager = GeminiKeyManager()


# --- Database Connection ---
DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")

if not DB_CONNECTION_STRING:
    raise ValueError("Supabase Postgres connection string not found in environment variables.")

# Initialize the database connection
db = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# The LLM now uses the integrated key manager for its initial key
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=gemini_key_manager.get_initial_key(),
    temperature=0.0
)

# This chain is responsible for converting a natural language question into a SQL query
sql_query_chain = create_sql_query_chain(llm, db)

# --- MODIFIED: Added a formatting instruction to the prompt ---
ANSWER_PROMPT = PromptTemplate.from_template(
    """Given the following user question, corresponding SQL query, and SQL result, answer the user question.
**Formatting Instruction:** When stating a currency amount, do not use any symbols like '$' or '₹'. State the number plainly. For example, instead of '$200.50', write '200.50'.

Question: {question}
SQL Query: {query}
SQL Result: {result}
Answer: """
)

def _clean_sql_query(raw_query: str) -> str:
    """
    Cleans the raw output from the LLM to ensure it's a valid SQL query.
    Removes markdown fences and leading/trailing whitespace.
    """
    # Remove markdown fences (e.g., ```sql ... ```)
    cleaned_query = re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()
    return cleaned_query

def answer_database_question(user_question: str) -> str:
    """
    Takes a user's question, converts it to SQL, cleans the query,
    executes it, and returns a natural language answer.
    """
    logging.info(f"🧮 Answering database question: '{user_question}'")
    try:
        # 1. Generate the raw SQL query
        raw_sql_query = sql_query_chain.invoke({"question": user_question})
        
        # 2. Clean the generated query to remove markdown
        sql_query = _clean_sql_query(raw_sql_query)
        
        # 3. Validate that the result is a query, not a sentence
        if not sql_query.upper().startswith(("SELECT", "WITH")):
             logging.error(f"LLM failed to generate a valid SQL query. Output: {sql_query}")
             return f"Error: I was unable to construct a valid database query for your question."

        # 4. Execute the cleaned SQL query
        sql_result = db.run(sql_query)
        
        # 5. Use the LLM to format a final answer
        answer_chain = ANSWER_PROMPT | llm
        final_answer = answer_chain.invoke({
            "question": user_question,
            "query": sql_query,
            "result": sql_result
        })

        return final_answer.content
    except Exception as e:
        logging.error(f"Error executing database query for question '{user_question}': {e}")
        return f"Error: I could not answer the question using the database. Details: {str(e)}"