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
from urllib.parse import quote
from cryptography.fernet import Fernet
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from google.api_core.exceptions import ResourceExhausted
from typing import Any



logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
if not DB_CONNECTION_STRING:
    raise ValueError("Database connection string not found in environment variables.")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
db_for_schema = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# --- Prompts for the General-Purpose LLM Tool ---
# This is a robust, modern prompt for Text-to-SQL tasks.
SQL_PROMPT = PromptTemplate.from_template(
    """You are a PostgreSQL expert. Given an input question, create a syntactically correct PostgreSQL query to run.

**Instructions & Rules:**
1.  **Query Safely**: Unless the user specifies a specific number of results, query for at most 5 results using the `LIMIT` clause.
2.  **Be Specific**: Never query for all columns from a table (`SELECT *`). You must query only the specific columns needed to answer the question.
3.  **Use Delimited Identifiers**: Always wrap column and table names in double quotes (e.g., "invoices_record", "invoice_no").
4.  **Use Provided Schema Only**: Only use the column names you can see in the table info below. Do not query for columns that do not exist. Pay close attention to which table each column belongs to.
5.  **Handle Dates**: If the question involves a time period like 'this month' or 'last year', calculate the date range relative to the current date if needed.

**Database Schema:**
{table_info}

**User Question:**
{question}

**SQL Query:**
"""
)

ANSWER_PROMPT = PromptTemplate.from_template(
    """Given the following user question and the SQL result, write a natural language answer.

**Formatting Instructions:**
-   When stating a currency amount, do not use symbols like '$' or '₹'. State the number plainly (e.g., "The total sales were 15000").
-   If the result is empty or shows no data, politely inform the user that no information was found for their query.
-   Keep the answer concise and directly related to the user's question.

**User Question:**
{question}

**SQL Result:**
{result}

**Natural Language Answer:**
"""
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
            return json.dumps({
                "status": "ok",
                "message": "All products are above their stock alert levels."
            })
        
        low_stock_items = [
            {
                "item_name": item['name'],
                "current_stock": item['stock'],
                "alert_level": item['alert_stock'],
                "unit": item['unit']
            }
            for item in results
        ]
        return json.dumps({"status": "low_stock", "items": low_stock_items})

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


#contact tools

# --- NEW HELPER FUNCTION ---
def _get_invoice_and_contact_details(user_id: str, invoice_no: str) -> dict:
    """A helper to fetch invoice URL and its associated buyer's contact details."""
    # First, get the invoice URL and buyer ID
    invoice_query = "SELECT id, invoice_url, buyer_id FROM invoices_record WHERE user_id = %s AND invoice_no ILIKE %s;"
    invoice_params = (user_id, f"%{invoice_no}%")
    invoice_result = db_manager.execute_query(invoice_query, invoice_params)
    
    if not invoice_result:
        raise ValueError(f"Invoice '{invoice_no}' not found.")
        
    invoice_data = invoice_result[0]
    buyer_id = invoice_data.get('buyer_id')

    # Now, get the buyer's contact details
    buyer_query = "SELECT name, email, phone_no FROM buyers_record WHERE id = %s;"
    buyer_params = (buyer_id,)
    buyer_result = db_manager.execute_query(buyer_query, buyer_params)
    
    if not buyer_result:
        raise ValueError(f"Buyer details for invoice '{invoice_no}' not found.")
        
    buyer_data = buyer_result[0]
    
    return {
        "invoice_id": invoice_data['id'],
        "invoice_no": invoice_no,
        "invoice_url": invoice_data['invoice_url'],
        "buyer_name": buyer_data['name'],
        "buyer_email": buyer_data.get('email'),
        "buyer_phone": buyer_data.get('phone_no')
    }

# --- NEW TOOLS ---

def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
    """Sends a specific invoice via email using the user's own stored sender credentials."""
    logging.info(f"Preparing to email invoice '{invoice_no}' for user '{user_id}'.")
    if not ENCRYPTION_KEY:
        return "Error: Encryption key is not configured on the server."
    cipher_suite = Fernet(ENCRYPTION_KEY.encode())
    
    try:
        # Step 1: Fetch and decrypt the user's sender credentials
        seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
        seller_result = db_manager.execute_query(seller_query, (user_id,))
        if not seller_result or not seller_result[0].get('sender_email') or not seller_result[0].get('encrypted_sender_password'):
            return "Error: Sender email is not configured in your company profile."

        sender_details = seller_result[0]
        sender_email = sender_details['sender_email']
        decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()

        # Step 2: Fetch invoice and recipient details
        details = _get_invoice_and_contact_details(user_id, invoice_no)
        target_email = email_address or details.get('buyer_email')
        if not target_email:
            return f"Error: No email address found for buyer '{details['buyer_name']}'."

        # Step 3: Create and send the email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {details['invoice_no']} from {details.get('company_name', 'Your Company')}"
        msg["From"] = sender_email
        msg["To"] = target_email
        html_body = f"""<html><body><p>Dear {details['buyer_name']},</p><p>Please find your invoice: {details['invoice_no']}.</p><p><a href="{details['invoice_url']}">Click here to view.</a></p><p>Thank you!</p></body></html>"""
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, decrypted_password)
            server.sendmail(sender_email, target_email, msg.as_string())
        
        return f"Successfully sent invoice {invoice_no} to {target_email} from your account."

    except Exception as e:
        if "Authentication failed" in str(e):
             return "Error: Email sending failed. Please check your sender email and Google App Password."
        return f"Error: Could not send email. Details: {e}"



def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
    """
    Sends a specific invoice via email using the user's own stored sender credentials.
    If no recipient email_address is provided, it uses the buyer's saved email.
    """
    logging.info(f"Preparing to email invoice '{invoice_no}' for user '{user_id}'.")
    try:
        # Step 1: Fetch the user's sender credentials and encryption key.
        encryption_key = os.getenv("ENCRYPTION_KEY")
        if not encryption_key:
            return "Error: Encryption key is not configured on the server."

        cipher_suite = Fernet(encryption_key.encode())
        
        # Query the sellers_record for the sender's details
        seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
        seller_result = db_manager.execute_query(seller_query, (user_id,))

        if not seller_result or not seller_result[0]['sender_email'] or not seller_result[0]['encrypted_sender_password']:
            return "Error: Sender email is not configured. Please set up your sender email and Google App Password in your company profile."

        sender_details = seller_result[0]
        sender_email = sender_details['sender_email']
        
        # Decrypt the password
        decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()

        # Step 2: Fetch invoice and recipient contact details.
        details = _get_invoice_and_contact_details(user_id, invoice_no)
        
        target_email = email_address or details.get('buyer_email')
        if not target_email:
            return f"Error: No email address found for buyer '{details['buyer_name']}'. Please provide an email."

        # Step 3: Create and send the email using the user's credentials.
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {details['invoice_no']} from {details.get('company_name', 'Your Company')}"
        msg["From"] = sender_email
        msg["To"] = target_email

        html_body = f"""
        <html><body><p>Dear {details['buyer_name']},</p>
        <p>Please find attached your invoice: {details['invoice_no']}.</p>
        <p><a href="{details['invoice_url']}">Click here to view and download your invoice.</a></p>
        <p>Thank you!</p></body></html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, decrypted_password) # Use the decrypted password
            server.sendmail(sender_email, target_email, msg.as_string())
        
        return f"Successfully sent invoice {invoice_no} to {target_email} from your account."

    except Exception as e:
        logging.error(f"Failed to send email for invoice {invoice_no}: {e}")
        # Add a specific check for authentication errors
        if "Authentication failed" in str(e):
             return "Error: Email sending failed. Please check that your sender email and Google App Password are correct in your profile."
        return f"Error: Could not send email. Details: {e}"
    
def generate_whatsapp_link(user_id: str, invoice_no: str, phone_number: str = None) -> str:
    """
    Generates the most compatible WhatsApp "Click-to-Chat" link for sharing an invoice.
    """
    logging.info(f"Generating WhatsApp link for invoice '{invoice_no}' for user '{user_id}'.")
    try:
        # Step 1: Fetch invoice and contact details.
        details = _get_invoice_and_contact_details(user_id, invoice_no)

        # Step 2: Determine and format the target phone number.
        target_phone = phone_number or details.get('buyer_phone')
        if not target_phone:
            return f"Error: No phone number found for buyer '{details['buyer_name']}'."
        
        # Clean the number and ensure it includes the country code (e.g., 91 for India)
        cleaned_phone = "".join(filter(str.isdigit, target_phone))
        if len(cleaned_phone) == 10:
            cleaned_phone = "91" + cleaned_phone

        # Step 3: Create the most compatible message template.
        message_body = (
            f"Dear {details['buyer_name']},\n\n"
            f"Here is your invoice {details['invoice_no']}.\n"
            f"You can view and download it here:\n{details['invoice_url']}\n\n"
            f"Thank you!"
        )
        
        # Step 4: URL-encode the message text.
        encoded_message = quote(message_body)

        # Step 5: Construct the final "Click-to-Chat" link using the recommended wa.me domain.
        whatsapp_url = f"https://wa.me/{cleaned_phone}?text={encoded_message}"
        
        return (
            f"Success! Here is the WhatsApp link to share invoice {invoice_no} with {details['buyer_name']}.\n"
            f"Click here to send: {whatsapp_url}"
        )

    except Exception as e:
        logging.error(f"Failed to generate WhatsApp link for invoice {invoice_no}: {e}")
        return f"Error: Could not generate WhatsApp link. Details: {e}"
    
# In app/services/vyapari_tools.py

def search_existing_buyer(user_id: str, buyer_name: str) -> str:
    """
    Searches for an existing buyer associated with the user's past invoices.
    Returns the buyer's full details as a JSON object if found.
    """
    logging.info(f"Searching for buyer matching '{buyer_name}' for user '{user_id}'.")
    try:
        # --- THE FIX: This query now joins through the invoices_record table ---
        # It finds distinct buyers that have appeared on the current user's invoices.
        query = """
            SELECT DISTINCT ON (br.id)
                br.id, br.name, br.address, br.email, br.gst_no, br.phone_no
            FROM buyers_record AS br
            JOIN invoices_record AS ir ON br.id = ir.buyer_id
            WHERE 
                ir.user_id = %s AND br.name ILIKE %s
            LIMIT 5;
        """
        params = (user_id, f"%{buyer_name}%")
        results = db_manager.execute_query(query, params)
        
        if not results:
            return json.dumps({"status": "not_found", "message": f"No existing buyer found with the name '{buyer_name}'."})

        # Since there could be multiple matches, we return the first one as the most likely candidate.
        return json.dumps({"status": "found", "details": results[0]})

    except Exception as e:
        logging.error(f"Error searching for buyer: {e}")
        return json.dumps({"status": "error", "message": f"An error occurred while searching for the buyer."})
    

def get_gstr3b_report(user_id: str, start_date: str, end_date: str) -> str:
    """
    Generates a SIMPLIFIED GSTR-3B summary.
    WARNING: This version assumes all sales are intra-state (CGST/SGST)
    because state information is not available in the database.
    """
    logging.info(f"Generating SIMPLIFIED GSTR-3B report for user '{user_id}' from {start_date} to {end_date}.")
    
    try:
        # 1. GSTIN Validation Check (without state)
        seller_query = "SELECT gst_no FROM sellers_record WHERE user_id = %s;"
        seller_result = db_manager.execute_query(seller_query, (user_id,))

        if not seller_result or not seller_result[0].get('gst_no'):
            return json.dumps({
                "status": "ineligible",
                "message": "GSTR-3B reports can only be generated for GST-registered businesses. Please update your Company Profile with your GSTIN."
            })
        
        seller_info = seller_result[0]

        # 2. Simplified Main Query (does not require state)
        main_query = """
            SELECT
                COALESCE(SUM(it.qty * it.item_rate), 0) AS total_taxable_value,
                COALESCE(SUM(it.qty * it.item_rate * it.gst_rate / 100), 0) AS total_gst,
                COALESCE(COUNT(DISTINCT i.id), 0) as invoice_count
            FROM invoices_record i
            JOIN items_record it ON i.id = it.product_id
            WHERE
                i.user_id = %s AND
                i.invoice_date BETWEEN %s AND %s;
        """
        params = (user_id, start_date, end_date)
        main_results = db_manager.execute_query(main_query, params)

        if not main_results or main_results[0]['invoice_count'] == 0:
            return json.dumps({"status": "no_data", "message": "No invoice data found for this period."})
        
        report_data = main_results[0]
        
        # 3. Structure the output with the intra-state assumption
        total_taxable = float(report_data.get('total_taxable_value', 0))
        total_gst = float(report_data.get('total_gst', 0))
        
        gstr3b_portal_data = {
            "_comment": "WARNING: This is a simplified report. Tax is NOT correctly split into IGST/CGST/SGST. All tax is shown under CGST and SGST as an assumption.",
            "gstin": seller_info.get('gst_no'),
            "ret_period": date.fromisoformat(start_date).strftime('%m%Y'),
            "sup_details": {
                "osup_det": {
                    "txval": total_taxable,
                    "iamt": 0.0, 
                    "camt": round(total_gst / 2, 2), 
                    "samt": round(total_gst / 2, 2),
                    "cess": 0.0
                }
            }
        }

        invoice_count = int(report_data.get('invoice_count', 0))
        analytics_summary = {
            "total_sales_value": round(total_taxable + total_gst, 2),
            "invoice_count": invoice_count,
            "average_invoice_value": round((total_taxable + total_gst) / invoice_count, 2) if invoice_count > 0 else 0,
        }

        final_output = {
            "gstr3b_data_for_download": gstr3b_portal_data,
            "analytics_for_chat": analytics_summary
        }
        return json.dumps(final_output, indent=2)

    except Exception as e:
        logging.error(f"Error generating simplified GSTR-3B report: {e}")
        return json.dumps({"status": "error", "message": f"Could not generate the report. Details: {e}"})
    
def generate_gstr3b_download_link(time_period: str) -> str:
    """
    Takes a natural language time period (e.g., 'last month') and creates the
    final, direct download URL for the GSTR-3B report for that period.
    """
    logging.info(f"Generating GSTR-3B download link for period: {time_period}")
    try:
        start_date, end_date = _parse_time_period(time_period)
        # IMPORTANT: Make sure this base URL matches your actual API domain.
        # It's better to get this from an environment variable.
        base_url = os.getenv("API_BASE_URL")
        
        url = f"{base_url}/reports/gstr3b?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
        
        return f"Success! The download link is ready: {url}"
    except Exception as e:
        logging.error(f"Failed to generate GSTR-3B download link: {e}")
        return "Error: Could not generate the download link."

# def find_hsn_code(product_description: str, key_manager: Any) -> str:
#     """
#     Finds the most relevant HSN code for a product description using semantic search
#     with built-in resilience for handling API rate limits by rotating keys.
#     """
#     logging.info(f"Finding HSN code for: '{product_description}'")

#     # --- NEW: Resilient Retry Loop ---
#     for i in range(len(key_manager.keys)):
#         try:
#             # Step 1: Get the current key and configure the client
#             current_key = key_manager.keys[key_manager.current_key_index]
#             genai.configure(api_key=current_key)

#             # Step 2: Generate embedding for the user's query
#             response = genai.embed_content(
#                 model="models/text-embedding-004",
#                 content=product_description,
#                 task_type="retrieval_query"
#             )
#             query_embedding = response["embedding"]

#             # Step 3: Call the database function to find matches
#             matches = db_manager.execute_query(
#                 "SELECT * FROM match_hsn_codes(%s, %s, %s)",
#                 (query_embedding, 0.75, 3) # (embedding, similarity_threshold, match_count)
#             )

#             if not matches:
#                 return json.dumps({"status": "not_found", "message": "Could not find a matching HSN code."})
            
#             # Convert Decimal types to float for clean JSON output
#             for row in matches:
#                 for key, value in row.items():
#                     if hasattr(value, 'is_normal'):
#                         row[key] = float(value)
            
#             # If successful, return the result and exit the loop
#             return json.dumps({"status": "found", "suggestions": matches})

#         except ResourceExhausted:
#             logging.warning(f"Gemini API key index {key_manager.current_key_index} is rate-limited in HSN tool.")
#             # If this is the last key, break the loop and return an error
#             if i == len(key_manager.keys) - 1:
#                 logging.error("All Gemini API keys are rate-limited for the HSN tool.")
#                 return json.dumps({"status": "error", "message": "All API keys are currently rate-limited. Please try again later."})
            
#             # Move to the next key for the next attempt
#             key_manager.get_next_key()
            
#         except Exception as e:
#             logging.error(f"Error finding HSN code: {e}")
#             return json.dumps({"status": "error", "message": "An error occurred during HSN code lookup."})
            
#     # This part is reached only if all keys fail with rate limiting
#     return json.dumps({"status": "error", "message": "Failed to get a response after trying all available API keys."})