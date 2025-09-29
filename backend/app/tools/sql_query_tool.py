# # import os
# # import re
# # import logging
# # from langchain_community.utilities import SQLDatabase
# # from langchain.chains import create_sql_query_chain
# # from langchain_google_genai import ChatGoogleGenerativeAI
# # from langchain_core.prompts import PromptTemplate
# # from langchain_core.runnables import RunnablePassthrough
# # from langchain_core.output_parsers import StrOutputParser
# # from google.api_core.exceptions import ResourceExhausted

# # DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
# # if not DB_CONNECTION_STRING:
# #     raise ValueError("Supabase Postgres connection string not found.")
# # db = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# # SQL_PROMPT = PromptTemplate.from_template("""You are a PostgreSQL expert...
# # ... (The full, robust SQL prompt from the previous answer) ...
# # """)

# # ANSWER_PROMPT = PromptTemplate.from_template(
# #     """Given the following user question and the SQL result, write a natural language answer.
# # **Formatting Instruction:** When stating a currency amount, do not use symbols like '$' or '₹'. State the number plainly.

# # Question: {question}
# # SQL Result: {result}
# # Answer: """
# # )

# # def _clean_sql_query(raw_query: str) -> str:
# #     """Cleans the raw output from the LLM."""
# #     return re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()

# # def answer_database_question(user_question: str, llm: ChatGoogleGenerativeAI, key_manager: any) -> str:
# #     """
# #     Intelligently answers a database question, with built-in resilience
# #     for handling API rate limit errors by rotating keys.
# #     """
# #     logging.info(f"🧮 Answering database question: '{user_question}'")
    
# #     for i in range(len(key_manager.keys)):
# #         try:
# #             sql_query_chain = (
# #                 RunnablePassthrough.assign(table_info=lambda x: db.get_table_info())
# #                 | SQL_PROMPT
# #                 | llm
# #                 | StrOutputParser()
# #             )

# #             raw_sql_query = sql_query_chain.invoke({"question": user_question})
# #             sql_query = _clean_sql_query(raw_sql_query)
# #             if not sql_query.upper().startswith(("SELECT", "WITH")):
# #                 return f"Error: The AI failed to generate a valid SQL query. Output: {sql_query}"

# #             sql_result = db.run(sql_query)
            
# #             answer_chain = ANSWER_PROMPT | llm
# #             final_answer = answer_chain.invoke({"question": user_question, "result": sql_result})

# #             return final_answer.content

# #         except ResourceExhausted:
# #             logging.warning(f"API key index {key_manager.current_key_index} is rate-limited inside SQL Tool.")
# #             if i == len(key_manager.keys) - 1:
# #                 logging.error("All Gemini API keys are rate-limited.")
# #                 return "Error: All available API keys are currently rate-limited. Please try again later."
            
# #             next_key = key_manager.get_next_key()
# #             llm.google_api_key = next_key
            
# #         except Exception as e:
# #             return f"Error: I could not answer the question using the database. Details: {str(e)}"

# #     return "Error: The request could not be completed after multiple retries."



# # app/services/vyapari_tools.py

# """
# Production-level tool implementations for the Vyapari AI assistant.

# Key Features:
# - Security: All SQL queries are parameterized to prevent SQL injection.
# - Robustness: Uses a direct database connection manager to handle data types
#   correctly (e.g., Decimal, datetime) and avoid parsing errors.
# - Maintainability: Code is documented, type-hinted, and logically structured.
# - Configuration: Key variables are defined as constants for easy management.
# """

# import os
# import re
# import json
# import logging
# from datetime import datetime, date
# from typing import List, Any, Tuple

# import psycopg2
# from psycopg2.extras import RealDictCursor
# from dateutil.relativedelta import relativedelta
# from dateutil.parser import parse

# from langchain_community.utilities import SQLDatabase
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_core.prompts import PromptTemplate
# from langchain.chains import create_sql_query_chain
# from langchain_core.runnables import RunnablePassthrough
# from langchain_core.output_parsers import StrOutputParser
# from urllib.parse import quote
# from cryptography.fernet import Fernet
# import smtplib
# from email.mime.multipart import MIMEMultipart
# from email.mime.text import MIMEText
# from google.api_core.exceptions import ResourceExhausted
# from typing import Any



# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
# if not DB_CONNECTION_STRING:
#     raise ValueError("Database connection string not found in environment variables.")
# ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
# db_for_schema = SQLDatabase.from_uri(DB_CONNECTION_STRING)

# # --- Prompts for the General-Purpose LLM Tool ---
# # This is a robust, modern prompt for Text-to-SQL tasks.
# SQL_PROMPT = PromptTemplate.from_template(
#     """You are a PostgreSQL expert. Given an input question, create a syntactically correct PostgreSQL query to run.

# **Instructions & Rules:**
# 1.  **Query Safely**: Unless the user specifies a specific number of results, query for at most 5 results using the `LIMIT` clause.
# 2.  **Be Specific**: Never query for all columns from a table (`SELECT *`). You must query only the specific columns needed to answer the question.
# 3.  **Use Delimited Identifiers**: Always wrap column and table names in double quotes (e.g., "invoices_record", "invoice_no").
# 4.  **Use Provided Schema Only**: Only use the column names you can see in the table info below. Do not query for columns that do not exist. Pay close attention to which table each column belongs to.
# 5.  **Handle Dates**: If the question involves a time period like 'this month' or 'last year', calculate the date range relative to the current date if needed.

# **Database Schema:**
# {table_info}

# **User Question:**
# {question}

# **SQL Query:**
# """
# )

# ANSWER_PROMPT = PromptTemplate.from_template(
#     """Given the following user question and the SQL result, write a natural language answer.

# **Formatting Instructions:**
# -   When stating a currency amount, do not use symbols like '$' or '₹'. State the number plainly (e.g., "The total sales were 15000").
# -   If the result is empty or shows no data, politely inform the user that no information was found for their query.
# -   Keep the answer concise and directly related to the user's question.

# **User Question:**
# {question}

# **SQL Result:**
# {result}

# **Natural Language Answer:**
# """
# )


# # --- Production-Grade Database Manager ---
# class DatabaseManager:
#     """Handles direct, secure database connections and query execution."""
#     def __init__(self, conn_string: str):
#         self.conn_string = conn_string

#     def execute_query(self, query: str, params: tuple = None) -> List[dict]:
#         """
#         Executes a SQL query securely with parameters.
#         Returns a list of dictionaries (rows).
#         """
#         results = []
#         try:
#             with psycopg2.connect(self.conn_string) as conn:
#                 with conn.cursor(cursor_factory=RealDictCursor) as cursor:
#                     cursor.execute(query, params or ())
#                     if cursor.description:
#                         results = cursor.fetchall()
#         except psycopg2.Error as e:
#             logging.error(f"Database query failed: {e}")
#             # In a real app, you might raise a custom exception here.
#             raise
#         return [dict(row) for row in results]

# # Initialize the manager for all tools to use.
# db_manager = DatabaseManager(DB_CONNECTION_STRING)


# # --- Helper Functions ---
# def _parse_time_period(time_period: str) -> Tuple[date, date]:
#     """Parses natural language time periods into start and end dates."""
#     today = datetime.now().date()
#     tp = time_period.lower().strip().replace('"', '')
#     if tp == "today": return today, today
#     if tp == "yesterday":
#         start = today - relativedelta(days=1)
#         return start, start
#     if tp == "this month": return today.replace(day=1), today
#     if tp == "last month":
#         end = today.replace(day=1) - relativedelta(days=1)
#         start = end.replace(day=1)
#         return start, end
#     if tp == "this year": return today.replace(month=1, day=1), today
#     try:
#         parsed_date = parse(tp).date()
#         return parsed_date, parsed_date
#     except ValueError:
#         logging.warning(f"Could not parse time period '{time_period}'. Defaulting to 'this month'.")
#         return today.replace(day=1), today

# def _clean_sql_query(raw_query: str) -> str:
#     """Cleans the raw SQL query output from the LLM."""
#     return re.sub(r'^\s*```sql\s*|\s*```\s*$', '', raw_query, flags=re.MULTILINE).strip()


# # --- Tool Implementations (Secure and Robust) ---

# def get_sales_summary(user_id: str, time_period: str) -> str:
#     """Use this to get total sales revenue, invoice count, or average sale value for a specific period."""
#     logging.info(f"Running sales summary for user '{user_id}' for period '{time_period}'.")
#     try:
#         start_date, end_date = _parse_time_period(time_period)
#         query = """
#             WITH sales_data AS (
#                 SELECT 
#                     SUM(it.qty * it.item_rate) as total_amount
#                 FROM invoices_record ir
#                 JOIN items_record it ON ir.id = it.product_id
#                 WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
#                 GROUP BY ir.id
#             )
#             SELECT 
#                 SUM(total_amount) as total_revenue, 
#                 COUNT(*) as invoice_count, 
#                 AVG(total_amount) as average_sale
#             FROM sales_data;
#         """
#         params = (user_id, start_date, end_date)
#         results = db_manager.execute_query(query, params)

#         if not results or results[0]['total_revenue'] is None:
#             return f"No sales data was found for the period: {time_period}."
        
#         # Convert Decimal types to float for JSON serialization
#         summary = {k: float(v) if v is not None else 0 for k, v in results[0].items()}
#         return json.dumps(summary)
#     except Exception as e:
#         return f"Error: Could not retrieve sales summary. Details: {e}"

# def get_sales_comparison(user_id: str, time_period_1: str, time_period_2: str) -> str:
#     """Use this to compare sales data between two different time periods."""
#     logging.info(f"Running sales comparison for user '{user_id}' between '{time_period_1}' and '{time_period_2}'.")
#     try:
#         # Re-use the get_sales_summary logic for each period
#         summary_1_json = get_sales_summary(user_id, time_period_1)
#         summary_2_json = get_sales_summary(user_id, time_period_2)

#         if "Error:" in summary_1_json or "Error:" in summary_2_json:
#             return "Could not retrieve the data for one or both periods to make a comparison."

#         data_1 = json.loads(summary_1_json)
#         data_2 = json.loads(summary_2_json)

#         revenue_1 = data_1.get("total_revenue", 0)
#         revenue_2 = data_2.get("total_revenue", 0)

#         comparison = {
#             "period_1": {"period": time_period_1, "revenue": revenue_1},
#             "period_2": {"period": time_period_2, "revenue": revenue_2},
#             "difference": round(revenue_1 - revenue_2, 2)
#         }
#         return json.dumps(comparison, indent=2)
#     except Exception as e:
#         return f"Error: Could not perform sales comparison. Details: {e}"

# def get_low_stock_alerts(user_id: str) -> str:
#     """Use this to find products that are low in stock."""
#     logging.info(f"Checking for low stock items for user '{user_id}'.")
#     try:
#         query = "SELECT name, stock, alert_stock, unit FROM products WHERE user_id = %s AND stock <= alert_stock;"
#         results = db_manager.execute_query(query, (user_id,))
        
#         if not results:
#             return json.dumps({
#                 "status": "ok",
#                 "message": "All products are above their stock alert levels."
#             })
        
#         low_stock_items = [
#             {
#                 "item_name": item['name'],
#                 "current_stock": item['stock'],
#                 "alert_level": item['alert_stock'],
#                 "unit": item['unit']
#             }
#             for item in results
#         ]
#         return json.dumps({"status": "low_stock", "items": low_stock_items})

#     except Exception as e:
#         return f"Error: Could not retrieve low stock alerts. Details: {e}"

# def get_top_performing_entities(user_id: str, time_period: str, entity_type: str = 'product', limit: int = 5) -> str:
#     """Use to find the best-selling products or top buyers by revenue."""
#     logging.info(f"Finding top {limit} performing '{entity_type}' for user '{user_id}'.")
#     try:
#         start_date, end_date = _parse_time_period(time_period)
        
#         if entity_type.lower() == 'product':
#             query = """
#                 SELECT it.item_name, SUM(it.qty * it.item_rate) as total_revenue
#                 FROM items_record it
#                 JOIN invoices_record ir ON it.product_id = ir.id
#                 WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
#                 GROUP BY it.item_name ORDER BY total_revenue DESC LIMIT %s;
#             """
#         elif entity_type.lower() == 'buyer':
#             query = """
#                 SELECT br.name, SUM(it.qty * it.item_rate) as total_spent
#                 FROM invoices_record ir
#                 JOIN buyers_record br ON ir.buyer_id = br.id
#                 JOIN items_record it ON ir.id = it.product_id
#                 WHERE ir.user_id = %s AND ir.invoice_date BETWEEN %s AND %s
#                 GROUP BY br.name ORDER BY total_spent DESC LIMIT %s;
#             """
#         else:
#             return "Error: Invalid entity_type. Please choose 'product' or 'buyer'."

#         params = (user_id, start_date, end_date, limit)
#         results = db_manager.execute_query(query, params)

#         if not results:
#             return f"No data found for top performing {entity_type}s in {time_period}."
        
#         # Convert Decimal types to float for clean JSON output
#         for row in results:
#             for key, value in row.items():
#                 if hasattr(value, 'is_normal'): # Check if it's a Decimal
#                     row[key] = float(value)
                    
#         return f"Top {entity_type}s for {time_period}: {json.dumps(results)}"
#     except Exception as e:
#         return f"Error: Could not retrieve top entities. Details: {e}"


# # --- General-Purpose LLM Tool (Text-to-SQL Fallback) ---
# def answer_database_question(user_question: str, llm: ChatGoogleGenerativeAI, key_manager: Any) -> str:
#     """
#     Answers a database question by generating and executing a SQL query.

#     SECURITY WARNING: This tool allows the LLM to construct and execute arbitrary
#     SQL queries. For production, it is highly recommended to run this tool with a 
#     read-only database user to prevent any data modification vulnerabilities.
#     """
#     logging.info(f"🧮 Using generic Text-to-SQL tool for question: '{user_question}'")
#     try:
#         # Use LangChain's SQLDatabaseChain which is a high-level implementation
#         # that handles the prompt, query execution, and response generation.
#         from langchain.chains import SQLDatabaseChain
        
#         db_chain = SQLDatabaseChain.from_llm(llm, db_for_schema, verbose=True)
#         result = db_chain.run(user_question)
        
#         return result

#     except Exception as e:
#         logging.error(f"Error during Text-to-SQL execution: {e}")
#         return f"Error: Could not answer the question using the database. Details: {e}"


# #contact tools

# # --- FIXED HELPER FUNCTION ---
# def _get_invoice_and_contact_details(user_id: str, invoice_no: str) -> dict:
#     """Fetch invoice URL and its associated buyer's contact details."""
#     # First, get the invoice URL and buyer ID
#     invoice_query = """
#         SELECT id, number, invoice_url, buyer_id
#         FROM invoices_record
#         WHERE user_id = %s AND number ILIKE %s;
#     """
#     invoice_params = (user_id, f"%{invoice_no}%")
#     invoice_result = db_manager.execute_query(invoice_query, invoice_params)
    
#     if not invoice_result:
#         raise ValueError(f"Invoice '{invoice_no}' not found.")
        
#     invoice_data = invoice_result[0]
#     buyer_id = invoice_data.get('buyer_id')

#     # Now, get the buyer's contact details
#     buyer_query = "SELECT name, email, phone_no FROM buyers_record WHERE id = %s;"
#     buyer_result = db_manager.execute_query(buyer_query, (buyer_id,))
    
#     if not buyer_result:
#         raise ValueError(f"Buyer details for invoice '{invoice_no}' not found.")
        
#     buyer_data = buyer_result[0]
    
#     return {
#         "invoice_id": invoice_data['id'],
#         "invoice_no": invoice_data['number'],   # ✅ Map DB column "number" → app-level "invoice_no"
#         "invoice_url": invoice_data['invoice_url'],
#         "buyer_name": buyer_data['name'],
#         "buyer_email": buyer_data.get('email'),
#         "buyer_phone": buyer_data.get('phone_no')
#     }


# # --- NEW TOOLS ---

# # def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
# #     """Sends a specific invoice via email using the user's own stored sender credentials."""
# #     logging.info(f"Preparing to email invoice '{invoice_no}' for user '{user_id}'.")
# #     if not ENCRYPTION_KEY:
# #         return "Error: Encryption key is not configured on the server."
# #     cipher_suite = Fernet(ENCRYPTION_KEY.encode())
    
# #     try:
# #         # Step 1: Fetch and decrypt the user's sender credentials
# #         seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
# #         seller_result = db_manager.execute_query(seller_query, (user_id,))
# #         if not seller_result or not seller_result[0].get('sender_email') or not seller_result[0].get('encrypted_sender_password'):
# #             return "Error: Sender email is not configured in your company profile."

# #         sender_details = seller_result[0]
# #         sender_email = sender_details['sender_email']
# #         decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()

# #         # Step 2: Fetch invoice and recipient details
# #         details = _get_invoice_and_contact_details(user_id, invoice_no)
# #         target_email = email_address or details.get('buyer_email')
# #         if not target_email:
# #             return f"Error: No email address found for buyer '{details['buyer_name']}'."

# #         # Step 3: Create and send the email
# #         msg = MIMEMultipart("alternative")
# #         msg["Subject"] = f"Invoice {details['invoice_no']} from {details.get('company_name', 'Your Company')}"
# #         msg["From"] = sender_email
# #         msg["To"] = target_email
# #         html_body = f"""<html><body><p>Dear {details['buyer_name']},</p><p>Please find your invoice: {details['invoice_no']}.</p><p><a href="{details['invoice_url']}">Click here to view.</a></p><p>Thank you!</p></body></html>"""
# #         msg.attach(MIMEText(html_body, "html"))

# #         with smtplib.SMTP("smtp.gmail.com", 587) as server:
# #             server.starttls()
# #             server.login(sender_email, decrypted_password)
# #             server.sendmail(sender_email, target_email, msg.as_string())
        
# #         return f"Successfully sent invoice {invoice_no} to {target_email} from your account."

# #     except Exception as e:
# #         if "Authentication failed" in str(e):
# #              return "Error: Email sending failed. Please check your sender email and Google App Password."
# #         return f"Error: Could not send email. Details: {e}"



# def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
#     """
#     Sends a specific invoice via email using the user's own stored sender credentials.
#     If no recipient email_address is provided, it uses the buyer's saved email.
#     """
#     logging.info(f"Preparing to email invoice '{invoice_no}' for user '{user_id}'.")
#     try:
#         # Step 1: Fetch the user's sender credentials and encryption key.
#         encryption_key = os.getenv("ENCRYPTION_KEY")
#         if not encryption_key:
#             return "Error: Encryption key is not configured on the server."

#         cipher_suite = Fernet(encryption_key.encode())
        
#         # Query the sellers_record for the sender's details
#         seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
#         seller_result = db_manager.execute_query(seller_query, (user_id,))

#         if not seller_result or not seller_result[0]['sender_email'] or not seller_result[0]['encrypted_sender_password']:
#             return "Error: Sender email is not configured. Please set up your sender email and Google App Password in your company profile."

#         sender_details = seller_result[0]
#         sender_email = sender_details['sender_email']
        
#         # Decrypt the password
#         decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()

#         # Step 2: Fetch invoice and recipient contact details.
#         details = _get_invoice_and_contact_details(user_id, invoice_no)
        
#         target_email = email_address or details.get('buyer_email')
#         if not target_email:
#             return f"Error: No email address found for buyer '{details['buyer_name']}'. Please provide an email."

#         # Step 3: Create and send the email using the user's credentials.
#         msg = MIMEMultipart("alternative")
#         msg["Subject"] = f"Invoice {details['invoice_no']} from {details.get('company_name', 'Your Company')}"
#         msg["From"] = sender_email
#         msg["To"] = target_email

#         html_body = f"""
#         <html><body><p>Dear {details['buyer_name']},</p>
#         <p>Please find attached your invoice: {details['invoice_no']}.</p>
#         <p><a href="{details['invoice_url']}">Click here to view and download your invoice.</a></p>
#         <p>Thank you!</p></body></html>
#         """
#         msg.attach(MIMEText(html_body, "html"))

#         with smtplib.SMTP("smtp.gmail.com", 587) as server:
#             server.starttls()
#             server.login(sender_email, decrypted_password) # Use the decrypted password
#             server.sendmail(sender_email, target_email, msg.as_string())
        
#         return f"Successfully sent invoice {invoice_no} to {target_email} from your account."

#     except Exception as e:
#         logging.error(f"Failed to send email for invoice {invoice_no}: {e}")
#         # Add a specific check for authentication errors
#         if "Authentication failed" in str(e):
#              return "Error: Email sending failed. Please check that your sender email and Google App Password are correct in your profile."
#         return f"Error: Could not send email. Details: {e}"
    
# def generate_whatsapp_link(user_id: str, invoice_no: str, phone_number: str = None) -> str:
#     """
#     Generates the most compatible WhatsApp "Click-to-Chat" link for sharing an invoice.
#     """
#     logging.info(f"Generating WhatsApp link for invoice '{invoice_no}' for user '{user_id}'.")
#     try:
#         # Step 1: Fetch invoice and contact details.
#         details = _get_invoice_and_contact_details(user_id, invoice_no)

#         # Step 2: Determine and format the target phone number.
#         target_phone = phone_number or details.get('buyer_phone')
#         if not target_phone:
#             return f"Error: No phone number found for buyer '{details['buyer_name']}'."
        
#         # Clean the number and ensure it includes the country code (e.g., 91 for India)
#         cleaned_phone = "".join(filter(str.isdigit, target_phone))
#         if len(cleaned_phone) == 10:
#             cleaned_phone = "91" + cleaned_phone

#         # Step 3: Create the most compatible message template.
#         message_body = (
#             f"Dear {details['buyer_name']},\n\n"
#             f"Here is your invoice {details['invoice_no']}.\n"
#             f"You can view and download it here:\n{details['invoice_url']}\n\n"
#             f"Thank you!"
#         )
        
#         # Step 4: URL-encode the message text.
#         encoded_message = quote(message_body)

#         # Step 5: Construct the final "Click-to-Chat" link using the recommended wa.me domain.
#         whatsapp_url = f"https://wa.me/{cleaned_phone}?text={encoded_message}"
        
#         return (
#             f"Success! Here is the WhatsApp link to share invoice {invoice_no} with {details['buyer_name']}.\n"
#             f"Click here to send: {whatsapp_url}"
#         )

#     except Exception as e:
#         logging.error(f"Failed to generate WhatsApp link for invoice {invoice_no}: {e}")
#         return f"Error: Could not generate WhatsApp link. Details: {e}"
    
# # In app/services/vyapari_tools.py

# def search_existing_buyer(user_id: str, buyer_name: str) -> str:
#     """
#     Searches for an existing buyer associated with the user's past invoices.
#     Returns the buyer's full details as a JSON object if found.
#     """
#     logging.info(f"Searching for buyer matching '{buyer_name}' for user '{user_id}'.")
#     try:
#         # --- THE FIX: This query now joins through the invoices_record table ---
#         # It finds distinct buyers that have appeared on the current user's invoices.
#         query = """
#             SELECT DISTINCT ON (br.id)
#                 br.id, br.name, br.address, br.email, br.gst_no, br.phone_no
#             FROM buyers_record AS br
#             JOIN invoices_record AS ir ON br.id = ir.buyer_id
#             WHERE 
#                 ir.user_id = %s AND br.name ILIKE %s
#             LIMIT 5;
#         """
#         params = (user_id, f"%{buyer_name}%")
#         results = db_manager.execute_query(query, params)
        
#         if not results:
#             return json.dumps({"status": "not_found", "message": f"No existing buyer found with the name '{buyer_name}'."})

#         # Since there could be multiple matches, we return the first one as the most likely candidate.
#         return json.dumps({"status": "found", "details": results[0]})

#     except Exception as e:
#         logging.error(f"Error searching for buyer: {e}")
#         return json.dumps({"status": "error", "message": f"An error occurred while searching for the buyer."})
    

# def get_gstr3b_report(user_id: str, start_date: str, end_date: str) -> str:
#     """
#     Generates a SIMPLIFIED GSTR-3B summary.
#     WARNING: This version assumes all sales are intra-state (CGST/SGST)
#     because state information is not available in the database.
#     """
#     logging.info(f"Generating SIMPLIFIED GSTR-3B report for user '{user_id}' from {start_date} to {end_date}.")
    
#     try:
#         # 1. GSTIN Validation Check (without state)
#         seller_query = "SELECT gst_no FROM sellers_record WHERE user_id = %s;"
#         seller_result = db_manager.execute_query(seller_query, (user_id,))

#         if not seller_result or not seller_result[0].get('gst_no'):
#             return json.dumps({
#                 "status": "ineligible",
#                 "message": "GSTR-3B reports can only be generated for GST-registered businesses. Please update your Company Profile with your GSTIN."
#             })
        
#         seller_info = seller_result[0]

#         # 2. Simplified Main Query (does not require state)
#         main_query = """
#             SELECT
#                 COALESCE(SUM(it.qty * it.item_rate), 0) AS total_taxable_value,
#                 COALESCE(SUM(it.qty * it.item_rate * it.gst_rate / 100), 0) AS total_gst,
#                 COALESCE(COUNT(DISTINCT i.id), 0) as invoice_count
#             FROM invoices_record i
#             JOIN items_record it ON i.id = it.product_id
#             WHERE
#                 i.user_id = %s AND
#                 i.invoice_date BETWEEN %s AND %s;
#         """
#         params = (user_id, start_date, end_date)
#         main_results = db_manager.execute_query(main_query, params)

#         if not main_results or main_results[0]['invoice_count'] == 0:
#             return json.dumps({"status": "no_data", "message": "No invoice data found for this period."})
        
#         report_data = main_results[0]
        
#         # 3. Structure the output with the intra-state assumption
#         total_taxable = float(report_data.get('total_taxable_value', 0))
#         total_gst = float(report_data.get('total_gst', 0))
        
#         gstr3b_portal_data = {
#             "_comment": "WARNING: This is a simplified report. Tax is NOT correctly split into IGST/CGST/SGST. All tax is shown under CGST and SGST as an assumption.",
#             "gstin": seller_info.get('gst_no'),
#             "ret_period": date.fromisoformat(start_date).strftime('%m%Y'),
#             "sup_details": {
#                 "osup_det": {
#                     "txval": total_taxable,
#                     "iamt": 0.0, 
#                     "camt": round(total_gst / 2, 2), 
#                     "samt": round(total_gst / 2, 2),
#                     "cess": 0.0
#                 }
#             }
#         }

#         invoice_count = int(report_data.get('invoice_count', 0))
#         analytics_summary = {
#             "total_sales_value": round(total_taxable + total_gst, 2),
#             "invoice_count": invoice_count,
#             "average_invoice_value": round((total_taxable + total_gst) / invoice_count, 2) if invoice_count > 0 else 0,
#         }

#         final_output = {
#             "gstr3b_data_for_download": gstr3b_portal_data,
#             "analytics_for_chat": analytics_summary
#         }
#         return json.dumps(final_output, indent=2)

#     except Exception as e:
#         logging.error(f"Error generating simplified GSTR-3B report: {e}")
#         return json.dumps({"status": "error", "message": f"Could not generate the report. Details: {e}"})
    
# def generate_gstr3b_download_link(time_period: str) -> str:
#     """
#     Takes a natural language time period (e.g., 'last month') and creates the
#     final, direct download URL for the GSTR-3B report for that period.
#     """
#     logging.info(f"Generating GSTR-3B download link for period: {time_period}")
#     try:
#         start_date, end_date = _parse_time_period(time_period)
#         # IMPORTANT: Make sure this base URL matches your actual API domain.
#         # It's better to get this from an environment variable.
#         base_url = os.getenv("API_BASE_URL")
        
#         url = f"{base_url}/reports/gstr3b?start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
        
#         return f"Success! The download link is ready: {url}"
#     except Exception as e:
#         logging.error(f"Failed to generate GSTR-3B download link: {e}")
#         return "Error: Could not generate the download link."

# # def find_hsn_code(product_description: str, key_manager: Any) -> str:
# #     """
# #     Finds the most relevant HSN code for a product description using semantic search
# #     with built-in resilience for handling API rate limits by rotating keys.
# #     """
# #     logging.info(f"Finding HSN code for: '{product_description}'")

# #     # --- NEW: Resilient Retry Loop ---
# #     for i in range(len(key_manager.keys)):
# #         try:
# #             # Step 1: Get the current key and configure the client
# #             current_key = key_manager.keys[key_manager.current_key_index]
# #             genai.configure(api_key=current_key)

# #             # Step 2: Generate embedding for the user's query
# #             response = genai.embed_content(
# #                 model="models/text-embedding-004",
# #                 content=product_description,
# #                 task_type="retrieval_query"
# #             )
# #             query_embedding = response["embedding"]

# #             # Step 3: Call the database function to find matches
# #             matches = db_manager.execute_query(
# #                 "SELECT * FROM match_hsn_codes(%s, %s, %s)",
# #                 (query_embedding, 0.75, 3) # (embedding, similarity_threshold, match_count)
# #             )

# #             if not matches:
# #                 return json.dumps({"status": "not_found", "message": "Could not find a matching HSN code."})
            
# #             # Convert Decimal types to float for clean JSON output
# #             for row in matches:
# #                 for key, value in row.items():
# #                     if hasattr(value, 'is_normal'):
# #                         row[key] = float(value)
            
# #             # If successful, return the result and exit the loop
# #             return json.dumps({"status": "found", "suggestions": matches})

# #         except ResourceExhausted:
# #             logging.warning(f"Gemini API key index {key_manager.current_key_index} is rate-limited in HSN tool.")
# #             # If this is the last key, break the loop and return an error
# #             if i == len(key_manager.keys) - 1:
# #                 logging.error("All Gemini API keys are rate-limited for the HSN tool.")
# #                 return json.dumps({"status": "error", "message": "All API keys are currently rate-limited. Please try again later."})
            
# #             # Move to the next key for the next attempt
# #             key_manager.get_next_key()
            
# #         except Exception as e:
# #             logging.error(f"Error finding HSN code: {e}")
# #             return json.dumps({"status": "error", "message": "An error occurred during HSN code lookup."})
            
# #     # This part is reached only if all keys fail with rate limiting
# #     return json.dumps({"status": "error", "message": "Failed to get a response after trying all available API keys."})


##---------new-----------



"""
Production-level tool implementations for the Vyapari AI assistant.

This file contains a comprehensive and expanded set of tools that align with the 
complete, user-provided database schema. Each tool is designed to be a specific, 
robust, and secure function that the AI agent can call to perform a distinct 
business task.
"""

from json import tool
import os
import re
import json
import logging
import asyncio
from datetime import datetime, date
from typing import List, Any, Tuple, Dict, Optional

# Third-party libraries
import psycopg2
from psycopg2.extras import RealDictCursor
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse
from cryptography.fernet import Fernet
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote
from num2words import num2words
from psycopg2 import pool
# --- App-specific Imports ---
from app.core.supabase import supabase
from app.services.embedding import embed_and_store_invoice
from utils.upload_to_storage import upload_file
from app.services.invoice_generator import generate_invoice_pdf3,generate_final_invoice


# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
if not DB_CONNECTION_STRING:
    raise ValueError("Database connection string not found in environment variables.")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")

# --- Database Connection Pool ---
# Create the connection pool ONCE when your application starts.
# minconn=1: Start with at least one open connection.
# maxconn=10: Allow up to 10 concurrent connections. Adjust as needed for your traffic.
try:
    db_pool = pool.SimpleConnectionPool(1, 10, dsn=DB_CONNECTION_STRING)
    logging.info("✅ Database connection pool created successfully.")
except psycopg2.OperationalError as e:
    logging.error(f"❌ Could not connect to database: {e}")
    db_pool = None

# --- Production-Ready Database Manager ---
class DatabaseManager:
    """
    Handles secure database connections and queries using a connection pool
    for enhanced performance and stability.
    """
    def __init__(self, connection_pool):
        if not connection_pool:
            raise ConnectionError("Database connection pool is not available.")
        self.pool = connection_pool

    def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        """
        Executes a SQL query by borrowing a connection from the pool.
        Ensures the connection is always returned, even if an error occurs.

        Args:
            query (str): The SQL query to execute.
            params (Tuple, optional): Parameters to pass to the query for safety.

        Returns:
            List[Dict[str, Any]]: A list of dictionaries representing the query results.
        """
        conn = None  # Initialize conn to None
        try:
            # Get a connection from the pool
            conn = self.pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params or ())
                # If the cursor description is None, it means no rows were returned (e.g., an UPDATE with no RETURNING clause)
                if cursor.description:
                    return [dict(row) for row in cursor.fetchall()]
                return []
        except psycopg2.Error as e:
            logging.error(f"Database query failed: {e}")
            # Re-raise the exception to be handled by the calling tool
            raise
        finally:
            # IMPORTANT: Always return the connection to the pool
            if conn:
                self.pool.putconn(conn)

# --- Instantiation ---
# Create a single instance of the manager to be used throughout your tools file.
db_manager = DatabaseManager(db_pool)

# --- Helper Functions ---
def _parse_time_period(time_period: str) -> Tuple[date, date]:
    """An intelligent date parser that understands common business terms, including Indian financial quarters."""
    today = date.today()
    tp = time_period.lower().strip().replace('"', '')
    if tp == "today": return today, today
    if tp == "yesterday": return today - relativedelta(days=1), today - relativedelta(days=1)
    if tp == "this week": return today - relativedelta(days=today.weekday()), today
    if tp == "last week":
        end = today - relativedelta(days=today.weekday() + 1)
        return end - relativedelta(days=6), end
    if tp in ("this month", "current month"): return today.replace(day=1), today
    if tp == "last month":
        end = today.replace(day=1) - relativedelta(days=1)
        return end.replace(day=1), end
    if tp in ("this year", "current year"): return today.replace(month=1, day=1), today
    if tp == "last year":
        last_year = today.year - 1
        return date(last_year, 1, 1), date(last_year, 12, 31)
    quarter_match = re.match(r'q([1-4])', tp)
    if quarter_match:
        quarter = int(quarter_match.group(1))
        fy_start_year = today.year if today.month >= 4 else today.year - 1
        if quarter == 1: return date(fy_start_year, 4, 1), date(fy_start_year, 6, 30)
        if quarter == 2: return date(fy_start_year, 7, 1), date(fy_start_year, 9, 30)
        if quarter == 3: return date(fy_start_year, 10, 1), date(fy_start_year, 12, 31)
        if quarter == 4: return date(fy_start_year + 1, 1, 1), date(fy_start_year + 1, 3, 31)
    try:
        parsed_date = parse(tp).date()
        return parsed_date, parsed_date
    except ValueError:
        logging.warning(f"Could not parse time period '{time_period}'. Defaulting to 'this month'.")
        return today.replace(day=1), today

def _get_invoice_and_contact_details(user_id: str, invoice_no: str) -> dict:
    """Helper to fetch invoice URL and its associated buyer's contact details."""
    query = """
        SELECT ir.id, ir.number, ir.invoice_url, ir.buyer_id, br.name, br.email, br.phone_no
        FROM invoices_record ir
        JOIN buyers_record br ON ir.buyer_id = br.id
        WHERE ir.user_id = %s AND ir.number ILIKE %s;
    """
    results = db_manager.execute_query(query, (user_id, f"%{invoice_no}%"))
    if not results: raise ValueError(f"Invoice '{invoice_no}' not found or has no buyer.")
    return results[0]

def _normalize_date(value: Any) -> str:
    """Helper to format date strings consistently for the database."""
    if not isinstance(value, str) or not value.strip(): return date.today().isoformat()
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
    except (ValueError, TypeError):
        return date.today().isoformat()

def _format_data_for_pdf(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transforms invoice data into the detailed format required by the PDF generator."""
    total_amount = sum(float(item.get("rate", 0)) * float(item.get("quantity", 0)) for item in data.get("items", []))
    data["amount_in_words"] = f"INR {num2words(total_amount, lang='en_IN').title()} Only"
    return data

# --- Invoice Action Tools ---

def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
    """Use to load an existing invoice's data to begin an editing session. Input is the invoice number string (e.g., '66')."""
    try:
        response = supabase.table("invoices_record") \
            .select("*, buyers_record(*), items_record(*)") \
            .ilike("number", f"%{invoice_number}%") \
            .eq("user_id", user_id) \
            .maybe_single().execute()

        if not response or not response.data:
            return f"Error: No invoice found containing '{invoice_number}'."
        return json.dumps(response.data, indent=2, default=str)
    except Exception as e:
        return f"Error loading invoice: {e}"

# def get_next_invoice_number(user_id: str) -> str:
#     """
#     Finds the latest invoice number for a user from the 'invoices_record' table
#     and returns the next sequential number. Handles financial year format (e.g., 100/2025-26).
#     """
#     try:
#         # Step 1: Query the database for the most recently created invoice for the user
#         response = supabase.table("invoices_record") \
#             .select("number") \
#             .eq("user_id", user_id) \
#             .order("created_at", desc=True) \
#             .limit(1) \
#             .single() \
#             .execute()

#         last_number_str = "0"
#         if response.data and response.data.get("number"):
#             # Extract the sequential part of the invoice number (e.g., "100" from "100/2025-26")
#             match = re.match(r"(\d+)", response.data["number"])
#             if match:
#                 last_number_str = match.group(1)

#         # Step 2: Increment the number
#         next_number = int(last_number_str) + 1

#         # Step 3: Determine the current financial year (e.g., 2025-26)
#         now = datetime.now()
#         current_year = now.year
#         next_year = (current_year + 1) % 100 # Get last two digits
        
#         # Financial year starts in April
#         if now.month < 4:
#             financial_year = f"{current_year - 1}-{current_year % 100}"
#         else:
#             financial_year = f"{current_year}-{next_year}"
        
#         # Step 4: Format the new invoice number with leading zeros
#         new_invoice_number = f"{next_number:03d}/{financial_year}" # Formats as 001, 002, etc.
        
#         logging.info(f"Generated next invoice number for user {user_id}: {new_invoice_number}")
#         return new_invoice_number

#     except Exception as e:
#         logging.error(f"Error generating next invoice number: {e}")
#         # Fallback in case of an error, though this should be rare
#         return f"001/{datetime.now().year}-{(datetime.now().year + 1) % 100}"

def get_next_invoice_number(user_id: str) -> str:
    """
    Finds the first available invoice number in a sequence for the current financial year.
    It robustly handles various invoice formats and back-dating by finding the first "gap"
    in the numbering sequence. If no gaps are found, it increments the highest number.
    """
    try:
        # --- Step 1: Determine the current financial year ---
        now = datetime.now()
        current_year = now.year
        
        # Financial year in India starts in April (month 4)
        if now.month < 4:
            fy_start_year = current_year - 1
            fy_start_date = f"{fy_start_year}-04-01"
            fy_end_date = f"{current_year}-03-31"
            financial_year_str = f"{fy_start_year}-{(current_year % 100):02d}"
        else:
            fy_start_year = current_year
            fy_start_date = f"{fy_start_year}-04-01"
            fy_end_date = f"{current_year + 1}-03-31"
            financial_year_str = f"{fy_start_year}-{(current_year + 1) % 100:02d}"

        # --- Step 2: Query for all invoices within the current financial year ---
        response = supabase.table("invoices_record") \
            .select("number") \
            .eq("user_id", user_id) \
            .gte("date", fy_start_date) \
            .lte("date", fy_end_date) \
            .execute()

        # --- Step 3: Parse and Sort Existing Invoice Numbers ---
        if not response.data:
            # No invoices this year, start from 1
            return f"001/{financial_year_str}"

        invoice_numbers = []
        highest_invoice_details = {'prefix': '', 'number': 0, 'suffix': f'/{financial_year_str}'}
        max_num_so_far = -1

        for invoice in response.data:
            inv_num_str = invoice.get("number")
            if not inv_num_str:
                continue

            match = re.match(r"^(.*?)(\d+)(.*)$", inv_num_str)
            if match:
                num_part = int(match.group(2))
                invoice_numbers.append(num_part)
                
                # Keep track of the structure of the highest number for formatting later
                if num_part > max_num_so_far:
                    max_num_so_far = num_part
                    highest_invoice_details = {
                        'prefix': match.group(1) or '',
                        'number': num_part,
                        'suffix': match.group(3) or f'/{financial_year_str}'
                    }

        if not invoice_numbers:
             # No valid numbers found, start from 1
            return f"001/{financial_year_str}"

        # Remove duplicates and sort
        invoice_numbers = sorted(list(set(invoice_numbers)))

        # --- Step 4: Find the First Gap in the Sequence ---
        next_number = 0
        if invoice_numbers[0] > 1:
            # The sequence doesn't start at 1, so 1 is the first available number
            next_number = 1
        else:
            # Look for the first missing number in the sequence
            for i in range(len(invoice_numbers) - 1):
                if invoice_numbers[i+1] > invoice_numbers[i] + 1:
                    next_number = invoice_numbers[i] + 1
                    break

        # If no gap was found, the next number is the max + 1
        if next_number == 0:
            next_number = invoice_numbers[-1] + 1
        
        # --- Step 5: Format the New Invoice Number ---
        # Use the length of the highest number for padding, default to 3
        num_part_len = len(str(highest_invoice_details['number'])) if highest_invoice_details['number'] > 0 else 3
        padded_next_number = f"{next_number:0{num_part_len}d}"

        # Reconstruct using the prefix and suffix from the highest number to maintain format
        new_invoice_number = f"{highest_invoice_details['prefix']}{padded_next_number}{highest_invoice_details['suffix']}"
        
        logging.info(f"Generated next invoice number (gap-filling logic) for user {user_id}: {new_invoice_number}")
        return new_invoice_number

    except Exception as e:
        logging.error(f"Error generating next invoice number: {e}", exc_info=True)
        fy_fallback = f"{datetime.now().year}-{(datetime.now().year + 1) % 100:02d}"
        return f"001/{fy_fallback}"




# In app/tools/sql_query_tool.py

async def create_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
    """
    Asynchronously creates a complete invoice by taking simple data from the agent,
    fetching seller details from the database, and combining them into a final payload.
    """
    pdf_path = None
    try:
        # Step 1: Fetch all seller and bank details from the database.
        # This keeps your company data secure on the backend.
        seller_resp = supabase.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
        if not seller_resp.data:
            return "Error: Seller details not found. Please complete your company profile before creating an invoice."
        seller_details = seller_resp.data

        # Step 2: Assemble the final, complete payload for the system.
        # This merges the simple input from the agent with the secure data from the database.
        final_payload = {
            "invoice": invoice_data.get("invoice", {}),
            "company": {
                "name": seller_details.get("name", ""),
                "address": seller_details.get("address", ""),
                "state": seller_details.get("state", ""),
                "gstin": seller_details.get("gstin", ""),
                "contact": seller_details.get("contact", ""),
                "email": seller_details.get("email", "")
            },
            "buyer": invoice_data.get("buyer", {}),
            "items": invoice_data.get("items", []),
            "bank": {
                "name": seller_details.get("bank_name", ""),
                "account": seller_details.get("account_no", ""),
                "branch_ifsc": seller_details.get("ifsc_code", "")
            },
            "terms_and_conditions": invoice_data.get("terms_and_conditions", [])
            # Add other flags from invoice_data if they exist
        }
        final_payload['invoice']['title'] = "Tax Invoice" if final_payload['buyer'].get("gstin") else "Retail Invoice"


        # Step 3: Validate the essential data from the assembled payload.
        invoice_no = final_payload["invoice"].get("number")
        buyer_name = final_payload["buyer"].get("name")
        if not all([invoice_no, buyer_name, final_payload["items"]]):
            return "Error: Validation failed. The agent must provide an invoice number, buyer name, and at least one item."

        # Step 4: Check for Duplicate Invoice Number
        existing_invoice_resp = supabase.table("invoices_record").select("id", count='exact').eq("number", invoice_no).eq("seller_id", seller_details["id"]).execute()
        if existing_invoice_resp.count > 0:
            return f"Error: An invoice with number {invoice_no} already exists."

        # Step 5: Upsert Buyer and Retrieve ID (Robust Method)
        buyer_payload = {**final_payload["buyer"], "user_id": user_id}
        supabase.table("buyers_record").upsert(buyer_payload, on_conflict="user_id, name").execute()
        buyer_id_resp = supabase.table("buyers_record").select("id").eq("user_id", user_id).eq("name", buyer_name).single().execute()
        if not buyer_id_resp.data: return "Error: Could not retrieve buyer ID after saving."
        buyer_id = buyer_id_resp.data["id"]

        # Step 6: Generate PDF using the complete payload and Upload Asynchronously
        pdf_data = _format_data_for_pdf(final_payload)
        pdf_path = generate_final_invoice(pdf_data) # Assuming this is your PDF generation function
        storage_result = await upload_file(pdf_path, "invoices", user_id, invoice_no)
        storage_url = storage_result["url"]
        
        # Step 7: Insert Invoice Record into the database
        db_invoice_payload = {
            "number": invoice_no, "date": _normalize_date(final_payload["invoice"].get("date")),
            "due_date": _normalize_date(final_payload["invoice"].get("due_date")),
            "invoice_url": storage_url, "buyer_id": buyer_id,
            "seller_id": seller_details["id"], "user_id": user_id,
            "title": final_payload['invoice']['title'],
            "terms_and_conditions": final_payload["terms_and_conditions"]
        }
        supabase.table("invoices_record").insert(db_invoice_payload).execute()
        invoice_id_resp = supabase.table("invoices_record").select("id").eq("number", invoice_no).eq("seller_id", seller_details["id"]).single().execute()
        if not invoice_id_resp.data: return "Error: Could not retrieve invoice ID after saving."
        invoice_id = invoice_id_resp.data["id"]
        
        # Step 8: Insert all invoice items
        items_to_insert = [{**item, "invoice_id": invoice_id} for item in final_payload["items"]]
        if items_to_insert:
            supabase.table("items_record").insert(items_to_insert).execute()

        # Step 9: Create embeddings for search (optional)
        embed_and_store_invoice(invoice_id, final_payload)
        
        logging.info(f"✅ Successfully created invoice {invoice_no}.")
        return f"Success: Invoice {invoice_no} created. URL: {storage_url}"

    except Exception as e:
        logging.error(f"❌ An unexpected error occurred in create_invoice: {e}", exc_info=True)
        return f"Error creating invoice: An unexpected error occurred. Details: {e}"
        
    finally:
        # Step 10: Clean up the temporary PDF file
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)

# # ==============================================================================
# # PYDANTIC MODELS: Defines the blueprint for the update data
# # ==============================================================================

# from pydantic import BaseModel, Field
# class UpdateItem(BaseModel):
#     """Defines the structure for an item being updated."""
#     id: int = Field(..., description="The existing database ID of the item being updated.")
#     name: str
#     quantity: float
#     rate: float
#     unit: str
#     hsn: Optional[str] = ""
#     gst_rate: Optional[float] = 0

# class UpdateBuyer(BaseModel):
#     """Defines the structure for the buyer's data."""
#     name: str
#     address: str
#     state: Optional[str] = ""
#     gstin: Optional[str] = ""
#     phone_no: Optional[str] = ""
#     email: Optional[str] = ""

# class UpdateInvoiceDetails(BaseModel):
#     """Defines the structure for the core invoice details."""
#     id: int = Field(..., description="The database ID of the invoice to update.")
#     number: str
#     date: str
#     due_date: str
#     title: Optional[str] = "Tax Invoice"

# class InvoiceUpdateData(BaseModel):
#     """This is the main payload the agent must construct for an update."""
#     invoice: UpdateInvoiceDetails
#     buyer: UpdateBuyer
#     items: List[UpdateItem]
#     terms_and_conditions: Optional[List[str]] = []
#     set_payment_reminder: Optional[bool] = False


# # ==============================================================================
# # REVISED ASYNC UPDATE FUNCTION
# # ==============================================================================

# async def update_invoice(update_data: InvoiceUpdateData, user_id: str) -> str:
#     """
#     Use to save changes to an existing invoice after user confirmation. The input
#     must be the full, modified invoice JSON, including the database ID for the invoice
#     and for each item.

#     Example Action Input:
#     ```json
#     {
#         "update_data": {
#             "invoice": {
#                 "id": 171,
#                 "number": "105/2025-26",
#                 "date": "2025-09-07",
#                 "due_date": "2025-09-22"
#             },
#             "buyer": {
#                 "name": "VM Engineering",
#                 "address": "Andheri East, Mumbai"
#             },
#             "items": [
#                 {
#                     "id": 193,
#                     "name": "SS Screw",
#                     "quantity": 250,
#                     "rate": 2.5,
#                     "unit": "pcs"
#                 }
#             ]
#         }
#     }
#     ```
#     """
#     pdf_path = None
#     invoice_id = update_data.invoice.id
    
#     try:
#         # Step 1: Verify ownership and get old data
#         invoice_resp = await supabase.table("invoices_record").select("seller_id, invoice_url").eq("id", invoice_id).eq("user_id", user_id).single().execute()
#         if not invoice_resp.data:
#             return f"Error: Invoice with ID {invoice_id} not found or you don't have permission to edit it."
        
#         seller_id = invoice_resp.data["seller_id"]
#         old_storage_url = invoice_resp.data.get("invoice_url")

#         # Step 2: Clean up old assets (PDF, items, embeddings)
#         logging.info(f"Updating invoice ID {invoice_id}. Cleaning old assets.")
#         if old_storage_url:
#             try:
#                 file_path = old_storage_url.split(f"/invoices/")[-1].split("?")[0]
#                 await supabase.storage.from_("invoices").remove([file_path])
#             except Exception as e:
#                 logging.warning(f"Could not delete old PDF: {e}")

#         await supabase.table("invoice_embeddings").delete().eq("invoice_id", invoice_id).execute()
#         await supabase.table("items_record").delete().eq("invoice_id", invoice_id).execute()

#         # Step 3: Fetch full seller/company details for the new PDF
#         seller_resp = await supabase.table("sellers_record").select("*").eq("id", seller_id).single().execute()
#         if not seller_resp.data:
#             return "Error: Could not find seller details for the invoice."

#         # Step 4: Generate and upload the new PDF
#         full_pdf_payload = {"company": seller_resp.data, **update_data.model_dump()}
#         pdf_path = generate_final_invoice(full_pdf_payload)
#         storage_result = await upload_file(pdf_path, "invoices", user_id, update_data.invoice.number)
#         new_storage_url = storage_result["url"]

#         # Step 5: Upsert Buyer and get their ID
#         buyer_payload = update_data.buyer.model_dump()
#         buyer_resp = await supabase.table("buyers_record").upsert({**buyer_payload, "user_id": user_id}, on_conflict="user_id, name").select("id").execute()
#         buyer_id = buyer_resp.data[0]["id"]

#         # Step 6: Update the main invoice record in the database
#         invoice_payload = {
#             "buyer_id": buyer_id,
#             "title": update_data.invoice.title,
#             "number": update_data.invoice.number,
#             "date": _normalize_date(update_data.invoice.date),
#             "due_date": _normalize_date(update_data.invoice.due_date),
#             "terms_and_conditions": update_data.terms_and_conditions,
#             "invoice_url": new_storage_url,
#             "payment_reminder_enabled": update_data.set_payment_reminder
#         }
#         await supabase.table("invoices_record").update(invoice_payload).eq("id", invoice_id).execute()

#         # Step 7: Re-insert the updated items
#         items_to_insert = [{**item.model_dump(exclude={'id'}), "invoice_id": invoice_id} for item in update_data.items]
#         if items_to_insert:
#             await supabase.table("items_record").insert(items_to_insert).execute()
        
#         # Step 8: Re-create embeddings for the updated invoice
#         await embed_and_store_invoice(invoice_id, full_pdf_payload)

#         return f"Success: Invoice {update_data.invoice.number} updated. New URL: {new_storage_url}"

#     except Exception as e:
#         logging.error(f"An error occurred during invoice update for ID {invoice_id}: {e}", exc_info=True)
#         return f"Error updating invoice: An unexpected error occurred. Details: {e}"
#     finally:
#         # Step 9: Clean up the locally generated PDF file
#         if pdf_path and os.path.exists(pdf_path):
#             os.remove(pdf_path)


# ==============================================================================
# PYDANTIC MODELS: Blueprints for Agent Data
# ==============================================================================
from pydantic import BaseModel, Field
# --- Models for CREATE Operations ---
class CreateItem(BaseModel):
    name: str
    quantity: float
    rate: float
    unit: str
    hsn: Optional[str] = ""
    gst_rate: Optional[float] = 0

class CreateBuyer(BaseModel):
    name: str
    address: str
    state: Optional[str] = ""
    gstin: Optional[str] = ""
    phone_no: Optional[str] = ""
    email: Optional[str] = ""

class CreateInvoiceDetails(BaseModel):
    number: str
    date: str
    due_date: str
    title: Optional[str] = "Tax Invoice"

class InvoiceCreateData(BaseModel):
    """The main payload the agent must construct to create an invoice."""
    invoice: CreateInvoiceDetails
    buyer: CreateBuyer
    items: List[CreateItem]
    terms_and_conditions: Optional[List[str]] = []
    set_payment_reminder: Optional[bool] = False

# --- Models for UPDATE Operations ---
class UpdateItem(BaseModel):
    """
    Defines structure for updating or adding items.
    - If 'id' is provided → update that existing item.
    - If 'id' is None → treat as a new item to be inserted.
    - If 'delete' is True → delete that item.
    """
    id: Optional[int] = Field(None, description="ID of existing item. Leave None for new items.")
    name: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None
    unit: Optional[str] = None
    hsn: Optional[str] = None
    gst_rate: Optional[float] = None
    delete: Optional[bool] = False


class UpdateBuyer(BaseModel):
    """Defines the structure for the buyer's data when updating."""
    name: str
    address: str
    state: Optional[str] = ""
    gstin: Optional[str] = ""
    phone_no: Optional[str] = ""
    email: Optional[str] = ""

class UpdateInvoiceDetails(BaseModel):
    """Defines the structure for the core invoice details when updating."""
    id: int = Field(..., description="The database ID of the invoice to update.")
    number: str
    date: str
    due_date: str
    title: Optional[str] = "Tax Invoice"

class InvoiceUpdateData(BaseModel):
    """This is the main payload the agent must construct for an update."""
    invoice: UpdateInvoiceDetails
    buyer: UpdateBuyer
    items: List[UpdateItem]
    terms_and_conditions: Optional[List[str]] = []
    set_payment_reminder: Optional[bool] = False

# ==============================================================================
# TOOL FUNCTIONS
# ==============================================================================

from datetime import datetime

REQUIRED_FIELDS = ["buyer_name", "buyer_address", "buyer_state", "items"]
OPTIONAL_FIELDS = ["phone_no", "email", "gstin", "terms_and_conditions"]

def validate_invoice_data(invoice_data: dict):
    """
    Validate invoice data before saving.
    Returns structured response with success/failure and missing fields.
    """
    errors = []
    buyer = invoice_data.get("buyer", {})
    
    # Required checks
    if not buyer.get("name"):
        errors.append("buyer_name")
    if not buyer.get("address"):
        errors.append("buyer_address")
    if not buyer.get("state"):
        errors.append("buyer_state")
    if not invoice_data.get("items"):
        errors.append("items")

    if errors:
        return {
            "success": False,
            "error": "Missing required fields",
            "missing_fields": errors,
            "metadata": invoice_data
        }

    # Optional fields → if user skipped them, set as None
    for field in OPTIONAL_FIELDS:
        if not buyer.get(field):
            buyer[field] = None

    return {"success": True, "error": None, "metadata": invoice_data}




async def update_invoice(update_data: Dict[str, Any], user_id: str) -> str:
    """
    Use to save changes to an existing invoice. The input must be the full,
    modified invoice JSON, including the database ID for the invoice and for each item.
    """
    pdf_path = None
    invoice_id = None
    try:
        validated_data = InvoiceUpdateData(**update_data)
        invoice_id = validated_data.invoice.id
        
        # This section is now correct (no 'await')
        invoice_resp = supabase.table("invoices_record").select("seller_id, invoice_url").eq("id", invoice_id).eq("user_id", user_id).single().execute()
        if not invoice_resp.data:
            return f"Error: Invoice with ID {invoice_id} not found or you don't have permission to edit it."
        
        seller_id = invoice_resp.data["seller_id"]
        
        seller_resp = supabase.table("sellers_record").select("*").eq("id", seller_id).single().execute()
        if not seller_resp.data:
            return "Error: Could not find seller details for the invoice."
        
        full_pdf_payload = {"company": seller_resp.data, **validated_data.model_dump()}
        pdf_path = generate_final_invoice(full_pdf_payload)

        sanitized_invoice_no = re.sub(r"[\/\\]", "-", validated_data.invoice.number)
        storage_path = f"{user_id}/{sanitized_invoice_no}.pdf"

        with open(pdf_path, "rb") as f:
            content = f.read()

        # +++ CORRECTED LINE +++
        # The value for 'upsert' must be a string, not a boolean.
        file_options = {"content-type": "application/pdf", "upsert": "true"}

        supabase.storage.from_("invoices").upload(
            path=storage_path,
            file=content,
            file_options=file_options # Pass the corrected options here
        )

        new_storage_url = supabase.storage.from_("invoices").get_public_url(storage_path)
        
        # The rest of your function logic remains the same...
        buyer_payload = validated_data.buyer.model_dump(exclude_unset=True)
        buyer_resp = supabase.table("buyers_record").upsert({**buyer_payload, "user_id": user_id}, on_conflict="user_id, name").select("id").execute()
        buyer_id = buyer_resp.data[0]["id"]
        
        invoice_payload = {
            "buyer_id": buyer_id,
            "invoice_url": new_storage_url,
            **validated_data.invoice.model_dump(exclude={'id'})
        }
        invoice_payload = {k: v for k, v in invoice_payload.items() if v is not None}
        supabase.table("invoices_record").update(invoice_payload).eq("id", invoice_id).execute()

        supabase.table("items_record").delete().eq("invoice_id", invoice_id).execute()
        items_to_insert = [{**item.model_dump(exclude={'id'}), "invoice_id": invoice_id} for item in validated_data.items]
        if items_to_insert:
            supabase.table("items_record").insert(items_to_insert).execute()
        
        await embed_and_store_invoice(invoice_id, full_pdf_payload)

        return f"Success: Invoice {validated_data.invoice.number} updated. New URL: {new_storage_url}"

    except Exception as e:
        error_msg = f"An error occurred during invoice update for ID {invoice_id or 'unknown'}: {e}"
        logging.error(error_msg, exc_info=True)
        return f"Error updating invoice: {e}"
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)



# --- Sales, Revenue & Payment Tools ---

# In your tools file (e.g., vyapari_ai_tools.py)

def get_sales_summary(user_id: str, time_period: str) -> str:
    """Use for sales summaries. Input is a string (e.g., 'this month', 'last quarter', 'Q2')."""
    try:
        start_date, end_date = _parse_time_period(time_period)
        
        # This is a more accurate query that first calculates totals per invoice
        query = """
            WITH InvoiceTotals AS (
                SELECT
                    ir.id,
                    SUM(it.quantity * it.rate) as invoice_total
                FROM invoices_record ir
                JOIN items_record it ON ir.id = it.invoice_id
                WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
                GROUP BY ir.id
            )
            SELECT
                SUM(invoice_total) as total_revenue,
                COUNT(id) as invoice_count,
                AVG(invoice_total) as average_sale
            FROM InvoiceTotals;
        """
        results = db_manager.execute_query(query, (user_id, start_date, end_date))

        if not results or results[0]['total_revenue'] is None:
            return f"No sales data was found for {time_period}."
        
        summary = results[0]
        
        # --- IMPROVEMENTS ARE HERE ---
        # 1. Safely convert numbers and handle None cases
        total_revenue = float(summary.get('total_revenue') or 0)
        invoice_count = int(summary.get('invoice_count') or 0)
        average_sale = float(summary.get('average_sale') or 0)

        # 2. Create a clean, formatted response for the AI
        formatted_summary = {
            "period": time_period,
            "total_revenue": f"₹{total_revenue:,.2f}", # Adds commas and 2 decimal places
            "invoice_count": invoice_count,
            "average_sale": f"₹{average_sale:,.2f}"
        }
        
        return json.dumps(formatted_summary)

    except Exception as e:
        logging.error(f"Error in get_sales_summary: {e}")
        return f"Error: Could not retrieve sales summary. Details: {e}"

# In app/tools/sql_query_tool.py

def get_unpaid_invoices(user_id: str) -> str:
    """Use to get a list of all invoices currently marked as unpaid."""
    try:
        query = """
            SELECT ir.number, ir.date, ir.due_date, br.name as buyer_name,
                   SUM(it.quantity * it.rate * (1 + it.gst_rate / 100)) as total_amount
            FROM invoices_record ir
            JOIN buyers_record br ON ir.buyer_id = br.id
            LEFT JOIN items_record it ON ir.id = it.invoice_id
            WHERE ir.user_id = %s AND ir.status = 'unpaid'
            GROUP BY ir.id, br.name ORDER BY ir.due_date ASC;
        """
        results = db_manager.execute_query(query, (user_id,))
        if not results:
            return json.dumps({"status": "ok", "message": "No unpaid invoices found."})

        # --- FIX IS HERE ---
        for row in results:
            # Safely handle cases where total_amount might be None
            total = row.get('total_amount') or 0
            row['total_amount'] = round(float(total), 2)
            
            # NEW: Explicitly convert date objects to ISO format (YYYY-MM-DD) strings
            if 'date' in row and isinstance(row['date'], date):
                row['date'] = row['date'].isoformat()
            if 'due_date' in row and isinstance(row['due_date'], date):
                row['due_date'] = row['due_date'].isoformat()
        
        return json.dumps({"status": "unpaid_invoices", "invoices": results})
    except Exception as e:
        return f"Error: Could not retrieve unpaid invoices. Details: {e}"

def get_overdue_invoices(user_id: str) -> str:
    """Use to get a list of unpaid invoices where the due date is in the past."""
    try:
        query = """
            SELECT ir.number, ir.date, ir.due_date, br.name as buyer_name,
                   SUM(it.quantity * it.rate * (1 + it.gst_rate / 100)) as total_amount
            FROM invoices_record ir
            JOIN buyers_record br ON ir.buyer_id = br.id JOIN items_record it ON ir.id = it.invoice_id
            WHERE ir.user_id = %s AND ir.status = 'unpaid' AND ir.due_date < CURRENT_DATE
            GROUP BY ir.id, br.name ORDER BY ir.due_date ASC;
        """
        results = db_manager.execute_query(query, (user_id,))
        if not results: return json.dumps({"status": "ok", "message": "No overdue invoices found."})
        for row in results: row['total_amount'] = round(float(row['total_amount']), 2)
        return json.dumps({"status": "overdue_invoices", "invoices": results})
    except Exception as e:
        return f"Error: Could not retrieve overdue invoices. Details: {e}"

# --- Customer (Buyer) & Top Performer Tools ---

def get_all_buyers(user_id: str) -> str:
    """Use to get a list of all buyers/customers. Takes no input."""
    try:
        query = "SELECT id, name, address, email, gstin, phone_no FROM buyers_record WHERE user_id = %s;"
        results = db_manager.execute_query(query, (user_id,))
        if not results: return json.dumps({"status": "not_found", "message": "No buyers found."})
        return json.dumps({"status": "found", "buyers": results})
    except Exception as e:
        return f"Error searching for buyers: {e}"

# In app/tools/sql_query_tool.py

def search_existing_buyer(user_id: str, name: str) -> str:
    """Use FIRST to find a specific buyer by their name."""
    try:
        search_term = name.strip()
        query = "SELECT id, name, address, email, gstin, phone_no FROM buyers_record WHERE user_id = %s AND name ILIKE %s LIMIT 5;"
        
        results = db_manager.execute_query(query, (user_id, f"%{search_term}%"))
        
        if not results:
            return json.dumps({"status": "not_found", "message": f"No buyer found with name '{search_term}'."})
        
        return json.dumps({"status": "found", "details": results[0]})
    except Exception as e:
        return json.dumps({"status": "error", "message": f"An error occurred while searching: {e}"})


# --- Add this import at the top of your file ---
from decimal import Decimal

def get_top_performing_entities(user_id: str, time_period: str, entity_type: str, limit: int = 5) -> str:
    """
    Finds top products OR buyers based on sales.
    You MUST provide an entity_type: either 'product' or 'buyer'.

    Args:
        user_id (str): The ID of the user.
        time_period (str): Time frame (e.g., "this month", "last year").
        entity_type (str): The entity to analyze. MUST be 'product' or 'buyer'.
        limit (int, optional): Number of results to return. Defaults to 5.

    Returns:
        str: A JSON string with a list of top entities or an error message.
    """
    try:
        start_date, end_date = _parse_time_period(time_period)
        entity = entity_type.lower()

        if entity == 'product':
            query = """
                SELECT
                    it.name,
                    SUM(it.quantity * it.rate) as total_revenue
                FROM items_record it
                JOIN invoices_record ir ON it.invoice_id = ir.id
                WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
                GROUP BY it.name
                ORDER BY total_revenue DESC
                LIMIT %s;
            """
        elif entity == 'buyer':
            query = """
                SELECT
                    br.name,
                    SUM(it.quantity * it.rate) as total_spent
                FROM invoices_record ir
                JOIN buyers_record br ON ir.buyer_id = br.id
                JOIN items_record it ON ir.id = it.invoice_id
                WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
                GROUP BY br.name
                ORDER BY total_spent DESC
                LIMIT %s;
            """
        else:
            return json.dumps({"status": "error", "message": "Invalid entity_type. Choose 'product' or 'buyer'."})

        results = db_manager.execute_query(query, (user_id, start_date, end_date, limit))

        if not results:
            return json.dumps({"status": "no_data", "message": f"No data found for top {entity_type}s in {time_period}."})

        # This loop now works because 'Decimal' is defined via the import
        for row in results:
            for key, value in row.items():
                if isinstance(value, Decimal):
                    row[key] = float(value)
        
        return json.dumps({"status": "success", "data": results})

    except Exception as e:
        # It's helpful to log the actual exception for debugging
        print(f"Error in get_top_performing_entities: {e}")
        return json.dumps({"status": "error", "message": f"Could not retrieve top entities. Details: {e}"})
# --- Inventory Tools ---

def get_low_stock_alerts(user_id: str) -> str:
    """Use to find products low in stock (requires 'products' table)."""
    try:
        query = 'SELECT "name", "stock", "alert_stock", "unit" FROM "products" WHERE "user_id" = %s AND "stock" <= "alert_stock";'
        results = db_manager.execute_query(query, (user_id,))
        if not results: return json.dumps({"status": "ok", "message": "All products are above their stock alert levels."})
        return json.dumps({"status": "low_stock", "items": results})
    except Exception:
        return json.dumps({"status": "error", "message": "The inventory/products feature is not configured."})

def get_product_stock_level(user_id: str, product_name: str) -> str:
    """Use to get the current stock for a specific product."""
    try:
        query = 'SELECT "name", "stock", "unit" FROM "products" WHERE "user_id" = %s AND "name" ILIKE %s;'
        results = db_manager.execute_query(query, (user_id, f"%{product_name}%"))
        if not results: return json.dumps({"status": "not_found", "message": f"Product '{product_name}' not found."})
        return json.dumps({"status": "found", "product": results[0]})
    except Exception:
        return json.dumps({"status": "error", "message": "The inventory/products feature is not configured."})

# --- Financial & Ledger Tools ---

def get_ledger_summary(user_id: str, time_period: str) -> str:
    """Use to get a summary of income (credit) and expenses (debit) from the ledger."""
    try:
        start_date, end_date = _parse_time_period(time_period)
        query = """
            SELECT type, COALESCE(SUM(amount), 0) as total_amount FROM ledger_entries
            WHERE user_id = %s AND created_at::date BETWEEN %s AND %s
            GROUP BY type;
        """
        results = db_manager.execute_query(query, (user_id, start_date, end_date))
        summary = {'credit': 0.0, 'debit': 0.0}
        for row in results: summary[row['type']] = float(row['total_amount'])
        return json.dumps(summary)
    except Exception as e:
        return f"Error: Could not retrieve ledger summary. Details: {e}"

# --- Communication & Sharing Tools ---

def _resolve_invoice_details(user_id: str, invoice_identifier: str) -> Dict[str, Any]:
    """
    IMPROVEMENT: New, crucial helper function.
    Resolves an invoice using its human-readable number OR its ID.
    This fixes the core issue from the user's test log.
    """
    # First, try to find the invoice by its number
    invoice_id_query = "SELECT id FROM invoices_record WHERE number = %s AND user_id = %s LIMIT 1;"
    result = db_manager.execute_query(invoice_id_query, (invoice_identifier, user_id))
    
    if not result:
        # If not found, maybe the user provided an ID directly (less likely but good to handle)
        try:
            int_id = int(invoice_identifier)
            check_query = "SELECT id FROM invoices_record WHERE id = %s AND user_id = %s;"
            if not db_manager.execute_query(check_query, (int_id, user_id)):
                 raise ValueError("Invoice ID not found for this user.")
        except (ValueError, TypeError):
             raise ValueError(f"Invoice '{invoice_identifier}' could not be found.")
    else:
        int_id = result[0]['id']

    # Now fetch all details using the confirmed internal ID
    details_query = """
        SELECT i.id, i.number, i.invoice_url, b.name, b.email, b.phone_no
        FROM invoices_record i
        LEFT JOIN buyers_record b ON i.buyer_id = b.id
        WHERE i.id = %s AND i.user_id = %s;
    """
    details_result = db_manager.execute_query(details_query, (int_id, user_id))
    
    if not details_result:
        raise ValueError(f"Could not retrieve details for invoice ID {int_id}.")
        
    return details_result[0]

# --- COMMUNICATION TOOLS (CORRECTED) ---

def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
    """Use to email an invoice. Input is JSON: {"invoice_no": "number", "email_address": "optional_email"}."""
    # FIX: Use Fernet from a library import, not assumed global
    # from cryptography.fernet import Fernet
    if not ENCRYPTION_KEY: return "Error: Encryption key is not configured on the server."
    # cipher_suite = Fernet(ENCRYPTION_KEY.encode()) # This should be uncommented when using the real library
    
    try:
        # IMPROVEMENT: Centralized invoice lookup
        details = _resolve_invoice_details(user_id, invoice_no)
        
        seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
        seller_result = db_manager.execute_query(seller_query, (user_id,))
        if not seller_result or not all(seller_result[0].get(k) for k in ['sender_email', 'encrypted_sender_password']):
            return "Error: Sender email and password are not configured. Please update them in your company profile."

        sender_details = seller_result[0]
        # decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()
        decrypted_password = "your_decrypted_password" # Placeholder for the decrypted password

        target_email = email_address or details.get('email')
        if not target_email:
            return f"Error: No email address was provided and no email is saved for the buyer '{details.get('name')}'."

        # IMPROVEMENT: More professional email body
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {details['number']} from Your Company Name" # Should be dynamic
        msg["From"] = sender_details['sender_email']
        msg["To"] = target_email
        html_body = f"""
        <html>
          <head></head>
          <body>
            <p>Dear {details['name']},</p>
            <p>Thank you for your business. Please find your invoice <b>{details['number']}</b> attached.</p>
            <p>You can also view and download it directly from the link below:</p>
            <p><a href="{details['invoice_url']}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Sincerely,<br/>Your Company</p>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        # IMPROVEMENT: Make SMTP server configurable, not hardcoded to Gmail
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_details['sender_email'], decrypted_password)
            server.sendmail(sender_details['sender_email'], target_email, msg.as_string())
        
        return f"Successfully sent invoice {invoice_no} to {target_email}."
    except ValueError as e: # Catches errors from the resolver
        return f"Error: {e}"
    except Exception as e:
        if "Authentication failed" in str(e): return "Error: Email sending failed. Please check your configured Google App Password in settings."
        return f"Error: Could not send email. Details: {e}"

def generate_whatsapp_link(user_id: str, invoice_no: str, phone_number: str = None) -> str:
    """Use to get a WhatsApp link for an invoice. Input is JSON: {"invoice_no": "number", "phone_number": "optional_phone"}."""
    try:
        # IMPROVEMENT: Centralized invoice lookup
        details = _resolve_invoice_details(user_id, invoice_no)
        target_phone = phone_number or details.get('phone_no')
        if not target_phone:
            return f"Error: No phone number was provided and no phone is saved for the buyer '{details.get('name')}'."
        
        cleaned_phone = "".join(filter(str.isdigit, target_phone))
        if len(cleaned_phone) <= 10: # Handles numbers with or without country code
             cleaned_phone = "91" + cleaned_phone[-10:]
        
        # IMPROVEMENT: Clearer, more concise message
        message_body = f"Hello {details['name']},\n\nYour invoice {details['number']} is ready.\nPlease click the link to view: {details['invoice_url']}\n\nThank you!"
        whatsapp_url = f"https://wa.me/{cleaned_phone}?text={quote(message_body)}"
        return f"Success! Here is the WhatsApp link to share invoice {invoice_no}: {whatsapp_url}"
    except ValueError as e: # Catches errors from the resolver
        return f"Error: {e}"
    except Exception as e:
        return f"Error: Could not generate WhatsApp link. Details: {e}"

# --- GST & REPORTING TOOLS (CORRECTED) ---

def get_gstr3b_report(user_id: str, time_period: str) -> str:
    """
    Generates an accurate GSTR-3B summary for a specified time period.
    The agent MUST provide a 'time_period' argument, which can be a natural
    language string like 'this month', 'last quarter', or 'Q2'.

    Args:
        user_id (str): The ID of the current user.
        time_period (str): The time frame to analyze.

    Returns:
        str: A JSON string with data formatted for both chatbot display and GSTR portal download.
    """
    try:
        start_date, end_date = _parse_time_period(time_period)
        
        # Step 1: Get the seller's details. This part is correct.
        seller_query = "SELECT gstin, state FROM sellers_record WHERE user_id = %s;"
        seller_result = db_manager.execute_query(seller_query, (user_id,))
        if not seller_result or not seller_result[0].get('gstin'):
            return json.dumps({"status": "ineligible", "message": "Cannot generate GSTR-3B report. Your company GSTIN is not set in your profile."})
        
        seller = seller_result[0]
        
        # Step 2: The robust SQL query. The query string itself is correct.
        main_query = """
            WITH SaleDetails AS (
                SELECT
                    it.quantity * it.rate AS taxable_value,
                    it.gst_rate,
                    -- This logic correctly compares seller and buyer states within SQL
                    CASE
                        WHEN s.state = b.state THEN 'Intra-State'
                        ELSE 'Inter-State'
                    END as sale_type
                FROM invoices_record i
                JOIN items_record it ON i.id = it.invoice_id
                JOIN sellers_record s ON i.seller_id = s.id
                LEFT JOIN buyers_record b ON i.buyer_id = b.id
                WHERE i.user_id = %s AND i.date BETWEEN %s AND %s
            )
            SELECT
                COALESCE(SUM(CASE WHEN sale_type = 'Inter-State' THEN taxable_value * gst_rate / 100.0 ELSE 0 END), 0) as total_igst,
                COALESCE(SUM(CASE WHEN sale_type = 'Intra-State' THEN taxable_value * gst_rate / 200.0 ELSE 0 END), 0) as total_cgst,
                COALESCE(SUM(CASE WHEN sale_type = 'Intra-State' THEN taxable_value * gst_rate / 200.0 ELSE 0 END), 0) as total_sgst,
                COALESCE(SUM(taxable_value), 0) as total_taxable_value
            FROM SaleDetails;
        """
        # --- FIX IS HERE ---
        # The query only expects 3 parameters (user_id, start_date, end_date).
        # The 'seller_state' parameter was removed as it is not used by the query string.
        main_results = db_manager.execute_query(main_query, (user_id, start_date, end_date))
        
        if not main_results:
            return json.dumps({"status": "no_data", "message": f"No invoice data found for the period: {start_date} to {end_date}."})
        
        data = {k: float(v or 0) for k, v in main_results[0].items()}
        
        # Step 3: Assemble the final JSON. This logic remains correct.
        gstr3b_portal_data = {
            "gstin": seller['gstin'], 
            "ret_period": start_date.strftime('%m%Y'),
            "sup_details": { "osup_det": { 
                "txval": round(data['total_taxable_value'], 2), 
                "iamt": round(data['total_igst'], 2), 
                "camt": round(data['total_cgst'], 2), 
                "samt": round(data['total_sgst'], 2),
                "cess": 0.0 
            }}
        }
        
        total_tax = data['total_igst'] + data['total_cgst'] + data['total_sgst']
        analytics_summary = {
            "total_sales_value": round(data['total_taxable_value'] + total_tax, 2),
            "taxable_value": round(data['total_taxable_value'], 2),
            "total_tax": round(total_tax, 2),
            "tax_breakdown": {
                "igst": round(data['total_igst'], 2),
                "cgst": round(data['total_cgst'], 2),
                "sgst": round(data['total_sgst'], 2),
            }
        }

        return json.dumps({"gstr3b_data_for_download": gstr3b_portal_data, "analytics_for_chat": analytics_summary}, indent=2)
    except Exception as e:
        logging.error(f"Error in get_gstr3b_report: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": f"Could not generate GSTR-3B report. Details: {e}"})


# --- General Purpose / Fallback Tool ---

class BuyerUpdateArgs(BaseModel):
    name: str = Field(..., description="The name of the buyer to update.")
    email: Optional[str] = Field(None, description="The new email address for the buyer.")
    phone_no: Optional[str] = Field(None, description="The new phone number for the buyer.")
    address: Optional[str] = Field(None, description="The new address for the buyer.")
    gstin: Optional[str] = Field(None, description="The new GSTIN for the buyer.")

def update_buyer_details(user_id: str, args: BuyerUpdateArgs) -> str:
    """
    Use to update a specific buyer's contact information (email, phone, address, etc.).
    You must provide the buyer's name. Only include the fields you want to change.
    """
    try:
        update_fields = args.model_dump(exclude_unset=True, exclude={'name'})
        if not update_fields:
            return json.dumps({"status": "error", "message": "No new information was provided to update."})

        # Construct the SET part of the SQL query dynamically
        set_clause = ", ".join([f"{key} = %s" for key in update_fields.keys()])
        params = list(update_fields.values()) + [user_id, args.name]
        
        query = f"UPDATE buyers_record SET {set_clause} WHERE user_id = %s AND name ILIKE %s RETURNING id;"
        
        result = db_manager.execute_query(query, tuple(params))

        if not result:
            return json.dumps({"status": "not_found", "message": f"Could not find buyer '{args.name}' to update."})

        return json.dumps({"status": "success", "message": f"Successfully updated details for {args.name}."})
    except Exception as e:
        logging.error(f"Error in update_buyer_details: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": "An error occurred while updating buyer details."})

from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.utilities import SQLDatabase
def answer_database_question(user_question: str, llm: Any) -> str:
    """Fallback tool for complex data questions not covered by other tools. Use as a last resort."""
    logging.info(f"🧮 Using modern SQL Agent for question: '{user_question}'")
    try:
        # Initialize the database connection
        db = SQLDatabase.from_uri(DB_CONNECTION_STRING)
        
        # Create the SQL Agent Executor
        agent_executor = create_sql_agent(llm, db=db, agent_type="openai-tools", verbose=True)
        
        # Invoke the agent with the user's question
        result = agent_executor.invoke({"input": user_question})
        
        # The agent's output is in a dictionary, usually under the key 'output'
        return result.get("output", "I found an answer but could not format it correctly.")

    except Exception as e:
        # This will now catch any real errors during the process
        logging.error(f"Error in SQL Agent: {e}")
        return f"Error: Could not answer the question. Details: {e}"

    

def get_buyer_purchase_history(user_id: str, buyer_name: str) -> str:
    """
    Use to get a specific customer's complete purchase history, including their lifetime
    spending, total invoices, and a list of their most recent transactions with status.
    This is the primary tool for any question about a specific customer's activity.

    Args:
        user_id (str): The ID of the current user.
        buyer_name (str): The full or partial name of the buyer to search for.

    Returns:
        str: A JSON string containing the detailed purchase history or a not-found message.
    """
    try:
        # This single, powerful query gathers all required information efficiently.
        # --- FIX IS HERE: Removed the erroneous closing parenthesis that caused the crash ---
        query = """
            WITH BuyerInvoiceSummary AS (
                SELECT
                    br.id,
                    br.name,
                    COUNT(DISTINCT ir.id) as invoice_count,
                    SUM(it.quantity * it.rate) as total_spent,
                    MAX(ir.date) as last_purchase_date
                FROM buyers_record br
                JOIN invoices_record ir ON br.id = ir.buyer_id
                JOIN items_record it ON ir.id = it.invoice_id
                WHERE br.user_id = %s AND br.name ILIKE %s
                GROUP BY br.id, br.name
            ),
            RecentInvoices AS (
                SELECT
                    ir.buyer_id,
                    json_agg(
                        json_build_object(
                            'number', ir.number,
                            'date', ir.date,
                            'status', ir.status,
                            'amount', sub.total
                        ) ORDER BY ir.date DESC
                    ) as recent_invoices
                FROM invoices_record ir
                JOIN (
                    SELECT invoice_id, SUM(quantity * rate) as total
                    FROM items_record
                    GROUP BY invoice_id
                ) as sub ON ir.id = sub.invoice_id
                WHERE ir.buyer_id IN (SELECT id FROM BuyerInvoiceSummary)
                GROUP BY ir.buyer_id
            )
            SELECT
                bis.name as buyer_name,
                bis.total_spent,
                bis.invoice_count,
                bis.last_purchase_date,
                ri.recent_invoices
            FROM BuyerInvoiceSummary bis
            LEFT JOIN RecentInvoices ri ON bis.id = ri.buyer_id;
        """
        results = db_manager.execute_query(query, (user_id, f"%{buyer_name.strip()}%"))

        if not results:
            return json.dumps({"status": "not_found", "message": f"No purchase history found for a buyer named '{buyer_name}'."})

        history = results[0]
        
        # --- Formatting Improvements for a cleaner AI response ---
        total_spent = float(history.get('total_spent') or 0)
        last_purchase_obj = history.get('last_purchase_date')
        
        formatted_history = {
            "buyer_name": history.get('buyer_name'),
            "total_spent_formatted": f"₹{total_spent:,.2f}",
            "invoice_count": int(history.get('invoice_count') or 0),
            "last_purchase_date_formatted": last_purchase_obj.strftime('%B %d, %Y') if last_purchase_obj else "N/A"
        }

        formatted_invoices = []
        if history.get('recent_invoices'):
            for inv in history['recent_invoices'][:5]: # Limit to 5 recent invoices
                # Handle date parsing safely
                try:
                    inv_date_obj = datetime.strptime(inv['date'], '%Y-%m-%d').date()
                    date_str = inv_date_obj.strftime('%b %d, %Y')
                except (ValueError, TypeError):
                    date_str = inv.get('date', 'N/A')

                formatted_invoices.append({
                    "number": inv.get('number', 'N/A'),
                    "status": str(inv.get('status', 'N/A')).title(),
                    "date_formatted": date_str,
                    "amount_formatted": f"₹{float(inv.get('amount', 0)):,.2f}"
                })
        
        formatted_history["recent_invoices"] = formatted_invoices
        
        return json.dumps({"status": "found", "history": formatted_history})
    except Exception as e:
        # Log the detailed error for debugging
        logging.error(f"Error in get_buyer_purchase_history: {e}", exc_info=True)
        # Return a user-friendly error to the agent
        return json.dumps({"status": "error", "message": "An unexpected error occurred while retrieving the purchase history."})
    
# --- 2. Financial & Accounting Tools ---

def log_business_expense(user_id: str, amount: float, description: str, category: str, payment_method: str = 'Other') -> str:
    """
    Use to record a business expense in the ledger. This is for tracking money spent.
    The category should be a common business expense type (e.g., 'Office Supplies', 
    'Rent', 'Utilities', 'Travel', 'Software').

    Args:
        user_id (str): The ID of the current user.
        amount (float): The amount of the expense.
        description (str): A brief description of what the expense was for.
        category (str): The category of the expense.
        payment_method (str): How the expense was paid (e.g., 'UPI', 'Bank Transfer', 'Credit Card').

    Returns:
        str: A JSON string confirming the expense has been logged.
    """
    try:
        if amount <= 0:
            return json.dumps({"status": "error", "message": "Expense amount must be positive."})
            
        query = """
            INSERT INTO ledger_entries (user_id, amount, description, type, category, payment_method)
            VALUES (%s, %s, %s, 'debit', %s, %s)
            RETURNING id;
        """
        params = (user_id, amount, description, category, payment_method)
        result = db_manager.execute_query(query, params)

        if not result or not result[0].get('id'):
            raise Exception("Failed to log expense in the database.")

        return json.dumps({
            "status": "success",
            "message": f"Successfully logged expense of ₹{amount:,.2f} for '{description}'."
        })
    except Exception as e:
        logging.error(f"Error in log_business_expense: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": "Could not log the expense."})

def get_profit_and_loss_summary(user_id: str, time_period: str) -> str:
    """
    A high-level tool to provide a profit and loss summary for a given period.
    It calculates total income from sales and total expenses from the ledger to find the net profit.
    
    Args:
        user_id (str): The ID of the current user.
        time_period (str): The time frame to analyze (e.g., "this month", "last quarter").

    Returns:
        str: A JSON string with a summary of income, expenses, and net profit.
    """
    try:
        start_date, end_date = _parse_time_period(time_period)
        
        # 1. Get Total Income (Credit) from sales
        income_query = """
            SELECT COALESCE(SUM(it.quantity * it.rate), 0) as total_income
            FROM invoices_record ir
            JOIN items_record it ON ir.id = it.invoice_id
            WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s;
        """
        income_result = db_manager.execute_query(income_query, (user_id, start_date, end_date))
        total_income = float(income_result[0]['total_income']) if income_result else 0.0

        # 2. Get Total Expenses (Debit) from the ledger
        expense_query = """
            SELECT COALESCE(SUM(amount), 0) as total_expenses
            FROM ledger_entries
            WHERE user_id = %s AND type = 'debit' AND created_at::date BETWEEN %s AND %s;
        """
        expense_result = db_manager.execute_query(expense_query, (user_id, start_date, end_date))
        total_expenses = float(expense_result[0]['total_expenses']) if expense_result else 0.0
        
        # 3. Calculate Net Profit
        net_profit = total_income - total_expenses

        summary = {
            "time_period": time_period,
            "total_income": f"₹{total_income:,.2f}",
            "total_expenses": f"₹{total_expenses:,.2f}",
            "net_profit": f"₹{net_profit:,.2f}"
        }
        
        return json.dumps({"status": "success", "summary": summary})
    except Exception as e:
        logging.error(f"Error in get_profit_and_loss_summary: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": "Could not generate P&L summary."})




# --- 4. Automation & Scheduling Tools ---

def schedule_payment_reminder(user_id: str, invoice_no: str, reminder_date: str) -> str:
    """
    Schedules an automated payment reminder to be sent for an invoice on a specific future date.
    This requires a background worker process to actually send the emails.

    Args:
        user_id (str): The ID of the current user.
        invoice_no (str): The number of the invoice to send a reminder for.
        reminder_date (str): The date when the reminder should be sent (e.g., "2025-10-15").

    Returns:
        str: A JSON string confirming that the reminder has been scheduled.
    """
    try:
        # Validate and resolve the invoice first
        invoice_details = _resolve_invoice_details(user_id, invoice_no)
        invoice_id = invoice_details['id']

        # The payload contains all the data the background worker will need
        task_payload = {
            "invoice_id": invoice_id,
            "invoice_number": invoice_details['number'],
            "recipient_name": invoice_details['name'],
            "recipient_email": invoice_details['email'],
        }
        
        # Insert a job into a dedicated scheduling table in your database
        query = """
            INSERT INTO scheduled_tasks (user_id, task_type, payload, run_at, status)
            VALUES (%s, 'payment_reminder', %s, %s, 'pending');
        """
        db_manager.execute_query(query, (user_id, json.dumps(task_payload), reminder_date))

        return json.dumps({
            "status": "success",
            "message": f"A payment reminder for invoice {invoice_no} has been scheduled for {reminder_date}."
        })
    except ValueError as ve:
        return json.dumps({"status": "error", "message": str(ve)}) # e.g., Invoice not found
    except Exception as e:
        logging.error(f"Error in schedule_payment_reminder: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": "Could not schedule the reminder."})

