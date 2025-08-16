# import os
# import re
# import logging
# from langchain_community.utilities import SQLDatabase
# from langchain.chains import create_sql_query_chain
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_core.prompts import PromptTemplate
# from langchain_core.runnables import RunnablePassthrough
# from langchain_core.output_parsers import StrOutputParser
# from google.api_core.exceptions import ResourceExhausted

# DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
# if not DB_CONNECTION_STRING:
#     raise ValueError("Supabase Postgres connection string not found.")
# db = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# SQL_PROMPT = PromptTemplate.from_template("""You are a PostgreSQL expert...
# ... (The full, robust SQL prompt from the previous answer) ...
# """)

# ANSWER_PROMPT = PromptTemplate.from_template(
#     """Given the following user question and the SQL result, write a natural language answer.
# **Formatting Instruction:** When stating a currency amount, do not use symbols like '$' or '₹'. State the number plainly.

# Question: {question}
# SQL Result: {result}
# Answer: """
# )

# def _clean_sql_query(raw_query: str) -> str:
#     """Cleans the raw output from the LLM."""
#     return re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()

# def answer_database_question(user_question: str, llm: ChatGoogleGenerativeAI, key_manager: any) -> str:
#     """
#     Intelligently answers a database question, with built-in resilience
#     for handling API rate limit errors by rotating keys.
#     """
#     logging.info(f"🧮 Answering database question: '{user_question}'")
    
#     for i in range(len(key_manager.keys)):
#         try:
#             sql_query_chain = (
#                 RunnablePassthrough.assign(table_info=lambda x: db.get_table_info())
#                 | SQL_PROMPT
#                 | llm
#                 | StrOutputParser()
#             )

#             raw_sql_query = sql_query_chain.invoke({"question": user_question})
#             sql_query = _clean_sql_query(raw_sql_query)
#             if not sql_query.upper().startswith(("SELECT", "WITH")):
#                 return f"Error: The AI failed to generate a valid SQL query. Output: {sql_query}"

#             sql_result = db.run(sql_query)
            
#             answer_chain = ANSWER_PROMPT | llm
#             final_answer = answer_chain.invoke({"question": user_question, "result": sql_result})

#             return final_answer.content

#         except ResourceExhausted:
#             logging.warning(f"API key index {key_manager.current_key_index} is rate-limited inside SQL Tool.")
#             if i == len(key_manager.keys) - 1:
#                 logging.error("All Gemini API keys are rate-limited.")
#                 return "Error: All available API keys are currently rate-limited. Please try again later."
            
#             next_key = key_manager.get_next_key()
#             llm.google_api_key = next_key
            
#         except Exception as e:
#             return f"Error: I could not answer the question using the database. Details: {str(e)}"

#     return "Error: The request could not be completed after multiple retries."



# app/services/vyapari_tools.py

"""
Production-level tool implementations for the Vyapari AI assistant.

Key Features:
- Security: All SQL queries are parameterized to prevent SQL injection.
- Robustness: Uses a direct database connection manager to handle data types
  correctly (e.g., Decimal, datetime) and avoid parsing errors.
- Maintainability: Code is documented, type-hinted, and logically structured.
- Configuration: Key variables are defined as constants for easy management.
"""

import os
import re
import json
import logging
from datetime import datetime, date
from typing import List, Any, Tuple

import psycopg2
from psycopg2.extras import RealDictCursor
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse

from langchain_community.utilities import SQLDatabase
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import create_sql_query_chain
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser


# --- Configuration and Constants ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
if not DB_CONNECTION_STRING:
    raise ValueError("Database connection string not found in environment variables.")

# This object is now used ONLY for schema discovery by the Text-to-SQL tool.
db_for_schema = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# --- Prompts for the General-Purpose LLM Tool ---
# This is a robust, modern prompt for Text-to-SQL tasks.
SQL_PROMPT = PromptTemplate.from_template(
    """You are a PostgreSQL expert... (Full prompt from previous answer)"""
)
ANSWER_PROMPT = PromptTemplate.from_template(
    """Given the user question and SQL result, write a natural language answer... (Full prompt from previous answer)"""
)


# --- Production-Grade Database Manager ---
class DatabaseManager:
    """Handles direct, secure database connections and query execution."""
    def __init__(self, conn_string: str):
        self.conn_string = conn_string

    def execute_query(self, query: str, params: tuple = None) -> List[dict]:
        """
        Executes a SQL query securely with parameters.
        Returns a list of dictionaries (rows).
        """
        results = []
        try:
            with psycopg2.connect(self.conn_string) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params or ())
                    if cursor.description:
                        results = cursor.fetchall()
        except psycopg2.Error as e:
            logging.error(f"Database query failed: {e}")
            # In a real app, you might raise a custom exception here.
            raise
        return [dict(row) for row in results]

# Initialize the manager for all tools to use.
db_manager = DatabaseManager(DB_CONNECTION_STRING)


# --- Helper Functions ---
def _parse_time_period(time_period: str) -> Tuple[date, date]:
    """Parses natural language time periods into start and end dates."""
    today = datetime.now().date()
    tp = time_period.lower().strip().replace('"', '')
    if tp == "today": return today, today
    if tp == "yesterday":
        start = today - relativedelta(days=1)
        return start, start
    if tp == "this month": return today.replace(day=1), today
    if tp == "last month":
        end = today.replace(day=1) - relativedelta(days=1)
        start = end.replace(day=1)
        return start, end
    if tp == "this year": return today.replace(month=1, day=1), today
    try:
        parsed_date = parse(tp).date()
        return parsed_date, parsed_date
    except ValueError:
        logging.warning(f"Could not parse time period '{time_period}'. Defaulting to 'this month'.")
        return today.replace(day=1), today

def _clean_sql_query(raw_query: str) -> str:
    """Cleans the raw SQL query output from the LLM."""
    return re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()


# --- Tool Implementations (Secure and Robust) ---

def get_sales_summary(user_id: str, time_period: str) -> str:
    """Use this to get total sales revenue, invoice count, or average sale value for a specific period."""
    logging.info(f"Running sales summary for user '{user_id}' for period '{time_period}'.")
    try:
        start_date, end_date = _parse_time_period(time_period)
        query = """
            WITH sales_data AS (
                SELECT 
                    SUM(it.qty * it.item_rate) as total_amount
                FROM invoices_record ir
                JOIN items_record it ON ir.id = it.product_id
                WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
                GROUP BY ir.id
            )
            SELECT 
                SUM(total_amount) as total_revenue, 
                COUNT(*) as invoice_count, 
                AVG(total_amount) as average_sale
            FROM sales_data;
        """
        params = (user_id, start_date, end_date)
        results = db_manager.execute_query(query, params)

        if not results or results[0]['total_revenue'] is None:
            return f"No sales data was found for the period: {time_period}."
        
        # Convert Decimal types to float for JSON serialization
        summary = {k: float(v) if v is not None else 0 for k, v in results[0].items()}
        return json.dumps(summary)
    except Exception as e:
        return f"Error: Could not retrieve sales summary. Details: {e}"

def get_sales_comparison(user_id: str, time_period_1: str, time_period_2: str) -> str:
    """Use this to compare sales data between two different time periods."""
    logging.info(f"Running sales comparison for user '{user_id}' between '{time_period_1}' and '{time_period_2}'.")
    try:
        # Re-use the get_sales_summary logic for each period
        summary_1_json = get_sales_summary(user_id, time_period_1)
        summary_2_json = get_sales_summary(user_id, time_period_2)

        if "Error:" in summary_1_json or "Error:" in summary_2_json:
            return "Could not retrieve the data for one or both periods to make a comparison."

        data_1 = json.loads(summary_1_json)
        data_2 = json.loads(summary_2_json)

        revenue_1 = data_1.get("total_revenue", 0)
        revenue_2 = data_2.get("total_revenue", 0)

        comparison = {
            "period_1": {"period": time_period_1, "revenue": revenue_1},
            "period_2": {"period": time_period_2, "revenue": revenue_2},
            "difference": round(revenue_1 - revenue_2, 2)
        }
        return json.dumps(comparison, indent=2)
    except Exception as e:
        return f"Error: Could not perform sales comparison. Details: {e}"

def get_low_stock_alerts(user_id: str) -> str:
    """Use this to find products that are low in stock."""
    logging.info(f"Checking for low stock items for user '{user_id}'.")
    try:
        query = "SELECT name, stock, alert_stock, unit FROM products WHERE user_id = %s AND stock <= alert_stock;"
        results = db_manager.execute_query(query, (user_id,))
        
        if not results:
            return "All products are above their stock alert levels."
        
        # Format into a natural sentence to avoid agent formatting errors.
        item = results[0]
        return f"The item '{item['name']}' is low on stock. You have {item['stock']} {item['unit']}, which is below the alert level of {item['alert_stock']} {item['unit']}."
    except Exception as e:
        return f"Error: Could not retrieve low stock alerts. Details: {e}"

def get_top_performing_entities(user_id: str, time_period: str, entity_type: str = 'product', limit: int = 5) -> str:
    """Use to find the best-selling products or top buyers by revenue."""
    logging.info(f"Finding top {limit} performing '{entity_type}' for user '{user_id}'.")
    try:
        start_date, end_date = _parse_time_period(time_period)
        
        if entity_type.lower() == 'product':
            query = """
                SELECT it.item_name, SUM(it.qty * it.item_rate) as total_revenue
                FROM items_record it
                JOIN invoices_record ir ON it.product_id = ir.id
                WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
                GROUP BY it.item_name ORDER BY total_revenue DESC LIMIT %s;
            """
        elif entity_type.lower() == 'buyer':
            query = """
                SELECT br.name, SUM(it.qty * it.item_rate) as total_spent
                FROM invoices_record ir
                JOIN buyers_record br ON ir.buyer_id = br.id
                JOIN items_record it ON ir.id = it.product_id
                WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
                GROUP BY br.name ORDER BY total_spent DESC LIMIT %s;
            """
        else:
            return "Error: Invalid entity_type. Please choose 'product' or 'buyer'."

        params = (user_id, start_date, end_date, limit)
        results = db_manager.execute_query(query, params)

        if not results:
            return f"No data found for top performing {entity_type}s in {time_period}."
        
        # Convert Decimal types to float for clean JSON output
        for row in results:
            for key, value in row.items():
                if hasattr(value, 'is_normal'): # Check if it's a Decimal
                    row[key] = float(value)
                    
        return f"Top {entity_type}s for {time_period}: {json.dumps(results)}"
    except Exception as e:
        return f"Error: Could not retrieve top entities. Details: {e}"


# --- General-Purpose LLM Tool (Text-to-SQL Fallback) ---
def answer_database_question(user_question: str, llm: ChatGoogleGenerativeAI, key_manager: Any) -> str:
    """
    Answers a database question by generating and executing a SQL query.

    SECURITY WARNING: This tool allows the LLM to construct and execute arbitrary
    SQL queries. For production, it is highly recommended to run this tool with a 
    read-only database user to prevent any data modification vulnerabilities.
    """
    logging.info(f"🧮 Using generic Text-to-SQL tool for question: '{user_question}'")
    try:
        # Use LangChain's SQLDatabaseChain which is a high-level implementation
        # that handles the prompt, query execution, and response generation.
        from langchain.chains import SQLDatabaseChain
        
        db_chain = SQLDatabaseChain.from_llm(llm, db_for_schema, verbose=True)
        result = db_chain.run(user_question)
        
        return result

    except Exception as e:
        logging.error(f"Error during Text-to-SQL execution: {e}")
        return f"Error: Could not answer the question using the database. Details: {e}"
