


# """
# Production-level tool implementations for the Vyapari AI assistant.

# This file contains a comprehensive and expanded set of tools that align with the 
# complete, user-provided database schema. Each tool is designed to be a specific, 
# robust, and secure function that the AI agent can call to perform a distinct 
# business task.
# """

# from json import tool
# import os
# import re
# import json
# import logging
# import asyncio
# from datetime import datetime, date
# from typing import List, Any, Tuple, Dict, Optional

# # Third-party libraries
# import psycopg2
# from psycopg2.extras import RealDictCursor
# from dateutil.relativedelta import relativedelta
# from dateutil.parser import parse
# from cryptography.fernet import Fernet
# import smtplib
# from email.mime.multipart import MIMEMultipart
# from email.mime.text import MIMEText
# from urllib.parse import quote
# from num2words import num2words
# from psycopg2 import pool
# # --- App-specific Imports ---
# from app.core.supabase import get_supabase_admin_client, supabase,get_supabase_client
# from app.services.embedding import embed_and_store_invoice
# from utils.upload_to_storage import upload_file
# from app.services.invoice_generator import create_dynamic_invoice, generate_invoice_pdf3,generate_final_invoice
# from langchain.tools import tool


# # --- Configuration ---
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
# if not DB_CONNECTION_STRING:
#     raise ValueError("Database connection string not found in environment variables.")
# ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
# API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
# DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")

# try:
#     db_pool = pool.SimpleConnectionPool(1, 10, dsn=DB_CONNECTION_STRING)
#     logging.info("✅ Database connection pool created successfully.")
# except psycopg2.OperationalError as e:
#     logging.error(f"❌ Could not connect to database: {e}")
#     db_pool = None

# # --- Production-Ready Database Manager ---
# class DatabaseManager:
#     """
#     Handles secure database connections and queries using a connection pool
#     for enhanced performance and stability.
#     """
#     def __init__(self, connection_pool):
#         if not connection_pool:
#             raise ConnectionError("Database connection pool is not available.")
#         self.pool = connection_pool

#     def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
#         """
#         Executes a SQL query by borrowing a connection from the pool.
#         Ensures the connection is always returned, even if an error occurs.

#         Args:
#             query (str): The SQL query to execute.
#             params (Tuple, optional): Parameters to pass to the query for safety.

#         Returns:
#             List[Dict[str, Any]]: A list of dictionaries representing the query results.
#         """
#         conn = None  # Initialize conn to None
#         try:
#             # Get a connection from the pool
#             conn = self.pool.getconn()
#             with conn.cursor(cursor_factory=RealDictCursor) as cursor:
#                 cursor.execute(query, params or ())
#                 # If the cursor description is None, it means no rows were returned (e.g., an UPDATE with no RETURNING clause)
#                 if cursor.description:
#                     return [dict(row) for row in cursor.fetchall()]
#                 return []
#         except psycopg2.Error as e:
#             logging.error(f"Database query failed: {e}")
#             # Re-raise the exception to be handled by the calling tool
#             raise
#         finally:
#             # IMPORTANT: Always return the connection to the pool
#             if conn:
#                 self.pool.putconn(conn)

# # --- Instantiation ---
# # Create a single instance of the manager to be used throughout your tools file.
# db_manager = DatabaseManager(db_pool)

# # --- Helper Functions ---
# def _parse_time_period(time_period: str) -> Tuple[date, date]:
#     """An intelligent date parser that understands common business terms, including Indian financial quarters."""
#     today = date.today()
#     tp = time_period.lower().strip().replace('"', '')
#     if tp == "today": return today, today
#     if tp == "yesterday": return today - relativedelta(days=1), today - relativedelta(days=1)
#     if tp == "this week": return today - relativedelta(days=today.weekday()), today
#     if tp == "last week":
#         end = today - relativedelta(days=today.weekday() + 1)
#         return end - relativedelta(days=6), end
#     if tp in ("this month", "current month"): return today.replace(day=1), today
#     if tp == "last month":
#         end = today.replace(day=1) - relativedelta(days=1)
#         return end.replace(day=1), end
#     if tp in ("this year", "current year"): return today.replace(month=1, day=1), today
#     if tp == "last year":
#         last_year = today.year - 1
#         return date(last_year, 1, 1), date(last_year, 12, 31)
#     quarter_match = re.match(r'q([1-4])', tp)
#     if quarter_match:
#         quarter = int(quarter_match.group(1))
#         fy_start_year = today.year if today.month >= 4 else today.year - 1
#         if quarter == 1: return date(fy_start_year, 4, 1), date(fy_start_year, 6, 30)
#         if quarter == 2: return date(fy_start_year, 7, 1), date(fy_start_year, 9, 30)
#         if quarter == 3: return date(fy_start_year, 10, 1), date(fy_start_year, 12, 31)
#         if quarter == 4: return date(fy_start_year + 1, 1, 1), date(fy_start_year + 1, 3, 31)
#     try:
#         parsed_date = parse(tp).date()
#         return parsed_date, parsed_date
#     except ValueError:
#         logging.warning(f"Could not parse time period '{time_period}'. Defaulting to 'this month'.")
#         return today.replace(day=1), today
    

# def _get_invoice_and_contact_details(user_id: str, invoice_no: str) -> dict:
#     """Helper to fetch invoice URL and its associated buyer's contact details."""
#     query = """
#         SELECT ir.id, ir.number, ir.invoice_url, ir.buyer_id, br.name, br.email, br.phone_no
#         FROM invoices_record ir
#         JOIN buyers_record br ON ir.buyer_id = br.id
#         WHERE ir.user_id = %s AND ir.number ILIKE %s;
#     """
#     results = db_manager.execute_query(query, (user_id, f"%{invoice_no}%"))
#     if not results: raise ValueError(f"Invoice '{invoice_no}' not found or has no buyer.")
#     return results[0]

# def _normalize_date(value: Any) -> str:
#     """Helper to format date strings consistently for the database."""
#     if not isinstance(value, str) or not value.strip(): return date.today().isoformat()
#     try:
#         return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#     except (ValueError, TypeError):
#         return date.today().isoformat()

# def _format_data_for_pdf(data: Dict[str, Any]) -> Dict[str, Any]:
#     """Transforms invoice data into the detailed format required by the PDF generator."""
#     total_amount = sum(float(item.get("rate", 0)) * float(item.get("quantity", 0)) for item in data.get("items", []))
#     data["amount_in_words"] = f"INR {num2words(total_amount, lang='en_IN').title()} Only"
#     return data

# # --- Invoice Action Tools ---

# # def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
# #     """Use to load an existing invoice's data to begin an editing session. Input is the invoice number string (e.g., '66')."""
# #     try:
# #         response = supabase.table("invoices_record") \
# #             .select("*, buyers_record(*), items_record(*)") \
# #             .ilike("number", f"%{invoice_number}%") \
# #             .eq("user_id", user_id) \
# #             .maybe_single().execute()

# #         if not response or not response.data:
# #             return f"Error: No invoice found containing '{invoice_number}'."
# #         return json.dumps(response.data, indent=2, default=str)
# #     except Exception as e:
# #         return f"Error loading invoice: {e}"

# async def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
#     """Use to load an existing invoice's data to begin an editing session. (Async)"""
#     try:
#         supabase=await get_supabase_client()
#         # AWAITED
#         response = await supabase.table("invoices_record") \
#             .select("*, buyers_record(*), items_record(*)") \
#             .ilike("number", f"%{invoice_number}%") \
#             .eq("user_id", user_id) \
#             .maybe_single().execute()

#         if not response or not response.data:
#             # Return JSON errors
#             return json.dumps({"status": "not_found", "message": f"No invoice found containing '{invoice_number}'."})
        
#         return json.dumps({"status": "found", "data": response.data}, default=str)
    
#     except Exception as e:
#         return json.dumps({"status": "error", "message": f"Error loading invoice: {e}"})
    
    
# async def get_next_invoice_number(user_id: str) -> str:
#     """
#     Asynchronously finds the latest invoice number for a user from the 'invoices_record' table
#     and returns the next sequential number. Handles financial year format (e.g., 100/2025-26).
#     """
#     try:
#         supabase=await get_supabase_client()
#         # Step 1: Query the database (AWAITED)
#         response = await supabase.table("invoices_record") \
#             .select("number") \
#             .eq("user_id", user_id) \
#             .order("created_at", desc=True) \
#             .limit(1) \
#             .single() \
#             .execute()

#         last_number_str = "0"
#         if response.data and response.data.get("number"):
#             match = re.match(r"(\d+)", response.data["number"])
#             if match:
#                 last_number_str = match.group(1)

#         # Step 2: Increment
#         next_number = int(last_number_str) + 1

#         # Step 3: Determine financial year (This logic is still flawed, but not the cause of the error)
#         now = datetime.now()
#         current_year = now.year
        
#         if now.month < 4:
#             financial_year = f"{current_year - 1}-{(current_year % 100):02d}"
#         else:
#             financial_year = f"{current_year}-{(current_year + 1) % 100:02d}"
        
#         # Step 4: Format
#         new_invoice_number = f"{next_number:03d}/{financial_year}"
        
#         logging.info(f"Generated next invoice number for user {user_id}: {new_invoice_number}")
#         return new_invoice_number

#     except Exception as e:
#         logging.error(f"Error generating next invoice number: {e}")
#         # Fallback
#         now = datetime.now()
#         if now.month < 4:
#             financial_year = f"{now.year - 1}-{(now.year % 100):02d}"
#         else:
#             financial_year = f"{now.year}-{(now.year + 1) % 100:02d}"
#         return f"001/{financial_year}"

# # def get_next_invoice_number(user_id: str) -> str:
# #     """
# #     Finds the latest invoice number for a user from the 'invoices_record' table
# #     and returns the next sequential number. Handles financial year format (e.g., 100/2025-26).
# #     """
# #     try:
# #         # Step 1: Query the database for the most recently created invoice for the user
# #         response = supabase.table("invoices_record") \
# #             .select("number") \
# #             .eq("user_id", user_id) \
# #             .order("created_at", desc=True) \
# #             .limit(1) \
# #             .single() \
# #             .execute()

# #         last_number_str = "0"
# #         if response.data and response.data.get("number"):
# #             # Extract the sequential part of the invoice number (e.g., "100" from "100/2025-26")
# #             match = re.match(r"(\d+)", response.data["number"])
# #             if match:
# #                 last_number_str = match.group(1)

# #         # Step 2: Increment the number
# #         next_number = int(last_number_str) + 1

# #         # Step 3: Determine the current financial year (e.g., 2025-26)
# #         now = datetime.now()
# #         current_year = now.year
# #         next_year = (current_year + 1) % 100 # Get last two digits
        
# #         # Financial year starts in April
# #         if now.month < 4:
# #             financial_year = f"{current_year - 1}-{current_year % 100}"
# #         else:
# #             financial_year = f"{current_year}-{next_year}"
        
# #         # Step 4: Format the new invoice number with leading zeros
# #         new_invoice_number = f"{next_number:03d}/{financial_year}" # Formats as 001, 002, etc.
        
# #         logging.info(f"Generated next invoice number for user {user_id}: {new_invoice_number}")
# #         return new_invoice_number

# #     except Exception as e:
# #         logging.error(f"Error generating next invoice number: {e}")
# #         # Fallback in case of an error, though this should be rare
# #         return f"001/{datetime.now().year}-{(datetime.now().year + 1) % 100}"

# # def get_next_invoice_number(user_id: str) -> str:
# #     """
# #     Finds the first available invoice number in a sequence for the current financial year.
# #     It robustly handles various invoice formats and back-dating by finding the first "gap"
# #     in the numbering sequence. If no gaps are found, it increments the highest number.
# #     """
# #     try:
# #         # --- Step 1: Determine the current financial year ---
# #         now = datetime.now()
# #         current_year = now.year
        
# #         # Financial year in India starts in April (month 4)
# #         if now.month < 4:
# #             fy_start_year = current_year - 1
# #             fy_start_date = f"{fy_start_year}-04-01"
# #             fy_end_date = f"{current_year}-03-31"
# #             financial_year_str = f"{fy_start_year}-{(current_year % 100):02d}"
# #         else:
# #             fy_start_year = current_year
# #             fy_start_date = f"{fy_start_year}-04-01"
# #             fy_end_date = f"{current_year + 1}-03-31"
# #             financial_year_str = f"{fy_start_year}-{(current_year + 1) % 100:02d}"

# #         # --- Step 2: Query for all invoices within the current financial year ---
# #         response = supabase.table("invoices_record") \
# #             .select("number") \
# #             .eq("user_id", user_id) \
# #             .gte("date", fy_start_date) \
# #             .lte("date", fy_end_date) \
# #             .execute()

# #         # --- Step 3: Parse and Sort Existing Invoice Numbers ---
# #         if not response.data:
# #             # No invoices this year, start from 1
# #             return f"001/{financial_year_str}"

# #         invoice_numbers = []
# #         highest_invoice_details = {'prefix': '', 'number': 0, 'suffix': f'/{financial_year_str}'}
# #         max_num_so_far = -1

# #         for invoice in response.data:
# #             inv_num_str = invoice.get("number")
# #             if not inv_num_str:
# #                 continue

# #             match = re.match(r"^(.*?)(\d+)(.*)$", inv_num_str)
# #             if match:
# #                 num_part = int(match.group(2))
# #                 invoice_numbers.append(num_part)
                
# #                 # Keep track of the structure of the highest number for formatting later
# #                 if num_part > max_num_so_far:
# #                     max_num_so_far = num_part
# #                     highest_invoice_details = {
# #                         'prefix': match.group(1) or '',
# #                         'number': num_part,
# #                         'suffix': match.group(3) or f'/{financial_year_str}'
# #                     }

# #         if not invoice_numbers:
# #              # No valid numbers found, start from 1
# #             return f"001/{financial_year_str}"

# #         # Remove duplicates and sort
# #         invoice_numbers = sorted(list(set(invoice_numbers)))

# #         # --- Step 4: Find the First Gap in the Sequence ---
# #         next_number = 0
# #         if invoice_numbers[0] > 1:
# #             # The sequence doesn't start at 1, so 1 is the first available number
# #             next_number = 1
# #         else:
# #             # Look for the first missing number in the sequence
# #             for i in range(len(invoice_numbers) - 1):
# #                 if invoice_numbers[i+1] > invoice_numbers[i] + 1:
# #                     next_number = invoice_numbers[i] + 1
# #                     break

# #         # If no gap was found, the next number is the max + 1
# #         if next_number == 0:
# #             next_number = invoice_numbers[-1] + 1
        
# #         # --- Step 5: Format the New Invoice Number ---
# #         # Use the length of the highest number for padding, default to 3
# #         num_part_len = len(str(highest_invoice_details['number'])) if highest_invoice_details['number'] > 0 else 3
# #         padded_next_number = f"{next_number:0{num_part_len}d}"

# #         # Reconstruct using the prefix and suffix from the highest number to maintain format
# #         new_invoice_number = f"{highest_invoice_details['prefix']}{padded_next_number}{highest_invoice_details['suffix']}"
        
# #         logging.info(f"Generated next invoice number (gap-filling logic) for user {user_id}: {new_invoice_number}")
# #         return new_invoice_number

# #     except Exception as e:
# #         logging.error(f"Error generating next invoice number: {e}", exc_info=True)
# #         fy_fallback = f"{datetime.now().year}-{(datetime.now().year + 1) % 100:02d}"
# #         return f"001/{fy_fallback}"




# # In app/tools/sql_query_tool.py

# # async def create_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
# #     """
# #     Asynchronously creates a complete invoice by taking simple data from the agent,
# #     fetching seller details from the database, and combining them into a final payload.
# #     """
# #     pdf_path = None
# #     try:
# #         # Step 1: Fetch all seller and bank details from the database.
# #         # This keeps your company data secure on the backend.
# #         seller_resp = supabase.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
# #         if not seller_resp.data:
# #             return "Error: Seller details not found. Please complete your company profile before creating an invoice."
# #         seller_details = seller_resp.data

# #         # Step 2: Assemble the final, complete payload for the system.
# #         # This merges the simple input from the agent with the secure data from the database.
# #         final_payload = {
# #             "invoice": invoice_data.get("invoice", {}),
# #             "company": {
# #                 "name": seller_details.get("name", ""),
# #                 "address": seller_details.get("address", ""),
# #                 "state": seller_details.get("state", ""),
# #                 "gstin": seller_details.get("gstin", ""),
# #                 "contact": seller_details.get("contact", ""),
# #                 "email": seller_details.get("email", "")
# #             },
# #             "buyer": invoice_data.get("buyer", {}),
# #             "items": invoice_data.get("items", []),
# #             "bank": {
# #                 "name": seller_details.get("bank_name", ""),
# #                 "account": seller_details.get("account_no", ""),
# #                 "branch_ifsc": seller_details.get("ifsc_code", "")
# #             },
# #             "terms_and_conditions": invoice_data.get("terms_and_conditions", [])
# #             # Add other flags from invoice_data if they exist
# #         }
# #         final_payload['invoice']['title'] = "Tax Invoice" if final_payload['buyer'].get("gstin") else "Retail Invoice"


# #         # Step 3: Validate the essential data from the assembled payload.
# #         invoice_no = final_payload["invoice"].get("number")
# #         buyer_name = final_payload["buyer"].get("name")
# #         if not all([invoice_no, buyer_name, final_payload["items"]]):
# #             return "Error: Validation failed. The agent must provide an invoice number, buyer name, and at least one item."

# #         # Step 4: Check for Duplicate Invoice Number
# #         existing_invoice_resp = supabase.table("invoices_record").select("id", count='exact').eq("number", invoice_no).eq("seller_id", seller_details["id"]).execute()
# #         if existing_invoice_resp.count > 0:
# #             return f"Error: An invoice with number {invoice_no} already exists."

# #         # Step 5: Upsert Buyer and Retrieve ID (Robust Method)
# #         buyer_payload = {**final_payload["buyer"], "user_id": user_id}
# #         supabase.table("buyers_record").upsert(buyer_payload, on_conflict="user_id, name").execute()
# #         buyer_id_resp = supabase.table("buyers_record").select("id").eq("user_id", user_id).eq("name", buyer_name).single().execute()
# #         if not buyer_id_resp.data: return "Error: Could not retrieve buyer ID after saving."
# #         buyer_id = buyer_id_resp.data["id"]

# #         # Step 6: Generate PDF using the complete payload and Upload Asynchronously
# #         pdf_data = _format_data_for_pdf(final_payload)
# #         pdf_path = create_dynamic_invoice(pdf_data) # Assuming this is your PDF generation function
# #         storage_result = await upload_file(pdf_path, "invoices", user_id, invoice_no)
# #         storage_url = storage_result["url"]
        
# #         # Step 7: Insert Invoice Record into the database
# #         db_invoice_payload = {
# #             "number": invoice_no, "date": _normalize_date(final_payload["invoice"].get("date")),
# #             "due_date": _normalize_date(final_payload["invoice"].get("due_date")),
# #             "invoice_url": storage_url, "buyer_id": buyer_id,
# #             "seller_id": seller_details["id"], "user_id": user_id,
# #             "title": final_payload['invoice']['title'],
# #             "terms_and_conditions": final_payload["terms_and_conditions"]
# #         }
# #         supabase.table("invoices_record").insert(db_invoice_payload).execute()
# #         invoice_id_resp = supabase.table("invoices_record").select("id").eq("number", invoice_no).eq("seller_id", seller_details["id"]).single().execute()
# #         if not invoice_id_resp.data: return "Error: Could not retrieve invoice ID after saving."
# #         invoice_id = invoice_id_resp.data["id"]
        
# #         # Step 8: Insert all invoice items
# #         items_to_insert = [{**item, "invoice_id": invoice_id} for item in final_payload["items"]]
# #         if items_to_insert:
# #             supabase.table("items_record").insert(items_to_insert).execute()

# #         # Step 9: Create embeddings for search (optional)
# #         embed_and_store_invoice(invoice_id, final_payload)
        
# #         logging.info(f"✅ Successfully created invoice {invoice_no}.")
# #         return f"Success: Invoice {invoice_no} created. URL: {storage_url}"

# #     except Exception as e:
# #         logging.error(f"❌ An unexpected error occurred in create_invoice: {e}", exc_info=True)
# #         return f"Error creating invoice: An unexpected error occurred. Details: {e}"
        
# #     finally:
# #         # Step 10: Clean up the temporary PDF file
# #         if pdf_path and os.path.exists(pdf_path):
# #             os.remove(pdf_path)


# from postgrest.exceptions import APIError  # Import this

# # --- Assume supabase client, PDF, and upload functions are defined ---
# # from my_utils import _normalize_date, _format_data_for_pdf
# # from my_pdf import create_dynamic_invoice
# # from my_storage import upload_file

# # async def create_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
# #     """
# #     Asynchronously creates a complete invoice.
# #     Fetches seller data, generates PDF, uploads it, and saves all data
# #     to the database in a single, atomic transaction.
# #     If the database save fails, it rolls back the storage upload.
# #     """
# #     pdf_path = None
# #     storage_path = None  # <-- 1. Initialize storage_path to None
    
# #     try:
# #         # --- THIS IS THE FIX ---
# #         # Get the admin client *once* at the start
# #         supabase_admin = await get_supabase_admin_client() 
        
# #         # Step 1: Fetch seller details
# #         seller_resp = await supabase_admin.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
        
# #         if not seller_resp.data:
# #             return json.dumps({"status": "error", "message": "Seller details not found."})
# #         seller_details = seller_resp.data

# #         # Step 2: Assemble final payload (No change)
# #         final_payload = {
# #             "invoice": invoice_data.get("invoice", {}),
# #             "company": {
# #                 "name": seller_details.get("name", ""),
# #                 "address": seller_details.get("address", ""),
# #                 "state": seller_details.get("state", ""),
# #                 "gstin": seller_details.get("gstin", ""),
# #                 "contact": seller_details.get("contact", ""),
# #                 "email": seller_details.get("email", "")
# #             },
# #             "buyer": invoice_data.get("buyer", {}),
# #             "items": invoice_data.get("items", []),
# #             "bank": {
# #                 "name": seller_details.get("bank_name", ""),
# #                 "account": seller_details.get("account_no", ""),
# #                 "branch_ifsc": seller_details.get("ifsc_code", "")
# #             },
# #             "terms_and_conditions": invoice_data.get("terms_and_conditions", [])
# #         }

# #         final_payload['invoice']['title'] = "Tax Invoice" if final_payload['buyer'].get("gstin") else "Retail Invoice"

# #         # Step 3: Validate essential data (No change)
# #         invoice_no = final_payload["invoice"].get("number")
# #         buyer_name = final_payload["buyer"].get("name")
# #         if not all([invoice_no, buyer_name, final_payload["items"]]):
# #             return json.dumps({"status": "error", "message": "Validation failed."})

# #         # Step 4: (REMOVED) Duplicate check

# #         # Step 5: Generate PDF (AWAITED in a thread)
# #         pdf_data = _format_data_for_pdf(final_payload)
# #         pdf_path = await asyncio.to_thread(create_dynamic_invoice, pdf_data)

# #         # Step 6: Upload PDF (AWAITED)
        
# #         # <-- 2. Define the storage_path *before* you try to upload
# #         # We replace / with - for a clean filename
# #         sanitized_invoice_no = re.sub(r"[\/\\]", "-", invoice_no)
# #         storage_path = f"{user_id}/{sanitized_invoice_no}.pdf"
        
# #         storage_result = await upload_file(pdf_path, storage_path, user_id, invoice_no) # Assuming upload_file uses storage_path
# #         storage_url = storage_result["url"]
        
# #         # Step 7: Prepare payloads for the database
# #         db_invoice_payload = {
# #             "number": invoice_no,
# #             "date": _normalize_date(final_payload["invoice"].get("date")),
# #             "due_date": _normalize_date(final_payload["invoice"].get("due_date")),
# #             "invoice_url": storage_url,
# #             "title": final_payload['invoice']['title'],
# #             "terms_and_conditions": final_payload["terms_and_conditions"]
# #         }
        
# #         buyer_payload = final_payload["buyer"]
# #         items_payload = final_payload["items"]
        
# #         # Step 8: Call the ATOMIC database function (This is where it failed)
# #         db_resp = await supabase_admin.rpc(
# #             "save_invoice_atomic",
# #             {
# #                 "p_user_id": user_id,
# #                 "p_seller_id": seller_details["id"],
# #                 "p_buyer_payload": buyer_payload,
# #                 "p_invoice_payload": db_invoice_payload,
# #                 "p_items_payload": items_payload
# #             }
# #         ).execute()

# #         # Check for *database-level* errors (like duplicate key)
# #         if db_resp.data.get("status") == "error":
# #             # --- 3. Raise an error to trigger the 'except' block ---
# #             raise Exception(db_resp.data.get("message"))

# #         # Step 9: Create embeddings (optional, non-blocking)
# #         invoice_id = db_resp.data.get("invoice_id")
# #         if invoice_id:
# #             asyncio.create_task(
# #                 asyncio.to_thread(embed_and_store_invoice, invoice_id, final_payload)
# #             )
        
# #         logging.info(f"✅ Successfully created invoice {invoice_no}.")
# #         return json.dumps({
# #             "status": "success",
# #             "invoice_number": invoice_no,
# #             "url": storage_url
# #         })
        
# #     except Exception as e:
# #         # --- 4. THIS IS THE ROLLBACK LOGIC ---
# #         logging.error(f"❌ An unexpected error occurred in create_invoice: {e}", exc_info=True)
        
# #         if storage_path:
# #             # If storage_path is set, it means the upload *succeeded*
# #             # before this error happened. We must now delete it.
# #             try:
# #                 logging.warning(f"ROLLBACK: Deleting orphan file from storage: {storage_path}")
# #                 # We already have the client from the 'try' block
# #                 await supabase_admin.storage.from_("invoices").remove([storage_path])
# #                 logging.info(f"Rollback successful. Deleted: {storage_path}")
# #             except Exception as storage_e:
# #                 # Log the cleanup error, but don't hide the original error
# #                 logging.error(f"CRITICAL: Failed to delete orphan file {storage_path}. Error: {storage_e}")
        
# #         # Return the original error message to the user
# #         return json.dumps({"status": "error", "message": f"An unexpected error occurred: {e}"})
        
# #     finally:
# #         # Step 10: Clean up the temporary *local* PDF file
# #         if pdf_path:
# #             try:
# #                 if await asyncio.to_thread(os.path.exists, pdf_path):
# #                     await asyncio.to_thread(os.remove, pdf_path)
# #             except Exception as e:
# #                 logging.warning(f"Failed to clean up local PDF {pdf_path}: {e}")


# async def create_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
#     """
#     Asynchronously creates a complete invoice.
#     Fetches seller data, generates PDF, uploads it, and saves all data
#     to the database in a single, atomic transaction.
#     If the database save fails, it rolls back the storage upload.
#     """
#     pdf_path = None
#     storage_path = None
#     supabase_admin = None  # Ensure it's defined for the 'except' block

#     try:
#         # --- THIS IS THE FIX ---
#         # Get the admin client *once* at the start
#         supabase_admin = await get_supabase_admin_client()

#         # Step 1: Fetch seller details (Assuming logo_url, sign_url, stamp are in sellers_record)
#         seller_resp = await supabase_admin.table("sellers_record").select("*").eq("user_id", user_id).single().execute()

#         if not seller_resp.data:
#             return json.dumps({"status": "error", "message": "Seller details not found."})
#         seller_details = seller_resp.data

#         # ⚠️ Step 2: Assemble FINAL payload with logo, sign, stamp, and template ⚠️
#         final_payload = {
#             "template": invoice_data.get("template_no", "1"),  # 🆕 Added template number
#             "invoice": {
#                 "number": invoice_data.get("invoice", {}).get("number"),
#                 "date": invoice_data.get("invoice", {}).get("date"),
#                 "due_date": invoice_data.get("invoice", {}).get("due_date"),
#                 "title": "Tax Invoice"  # Placeholder, set properly below
#             },
#             "company": {
#                 "name": seller_details.get("name", ""),
#                 "address": seller_details.get("address", ""),
#                 "state": seller_details.get("state", ""),
#                 "gstin": seller_details.get("gstin", ""),
#                 "contact": seller_details.get("contact", ""),
#                 "email": seller_details.get("email", ""),
#                 "logo_url": seller_details.get("logo_url", ""),  # 🆕 Added logo_url
#                 "sign_url": seller_details.get("sign_url", ""),  # 🆕 Added sign_url
#                 "stamp": seller_details.get("stamp", "")       # 🆕 Added stamp
#             },
#             "buyer": invoice_data.get("buyer", {}),
#             "items": invoice_data.get("items", []),
#             "bank": {
#                 "name": seller_details.get("bank_name", ""),
#                 "account": seller_details.get("account_no", ""),
#                 "branch_ifsc": seller_details.get("ifsc_code", "")
#             },
#             # Assuming terms_and_conditions is a list/array from the frontend
#             "terms_and_conditions": invoice_data.get("terms_and_conditions", [])
#         }

#         # Set the correct invoice title based on buyer GSTIN
#         is_tax_invoice = bool(final_payload['buyer'].get("gstin"))
#         final_payload['invoice']['title'] = "Tax Invoice" if is_tax_invoice else "Retail Invoice"

#         # Step 3: Validate essential data (No change)
#         invoice_no = final_payload["invoice"].get("number")
#         buyer_name = final_payload["buyer"].get("name")
#         if not all([invoice_no, buyer_name, final_payload["items"]]):
#             return json.dumps({"status": "error", "message": "Validation failed: Missing invoice number, buyer name, or items."})

#         # Step 4: (REMOVED) Duplicate check

#         # Step 5: Generate PDF (AWAITED in a thread - FASTEST BLOCKING APPROACH)
#         pdf_data = _format_data_for_pdf(final_payload)
#         pdf_path = await asyncio.to_thread(create_dynamic_invoice, pdf_data)
        
#         # Step 6: Upload PDF (AWAITED)
#         sanitized_invoice_no = re.sub(r"[\/\\]", "-", invoice_no)
#         storage_path = f"{user_id}/{sanitized_invoice_no}.pdf"

#         # The upload_file function should return a dict with a 'url' key
#         storage_result = await upload_file(pdf_path, storage_path, user_id, invoice_no) 
#         storage_url = storage_result["url"]

#         # Step 7: Prepare payloads for the database
#         db_invoice_payload = {
#             "number": invoice_no,
#             "date": _normalize_date(final_payload["invoice"].get("date")),
#             "due_date": _normalize_date(final_payload["invoice"].get("due_date")),
#             "invoice_url": storage_url,
#             "title": final_payload['invoice']['title'],
#             "terms_and_conditions": final_payload["terms_and_conditions"],
#             "template_no": final_payload["template"], # 🆕 Added template_no for DB
#         }
        
#         buyer_payload = final_payload["buyer"]
#         items_payload = final_payload["items"]

#         # Step 8: Call the ATOMIC database function
#         # This is where the core transaction happens.
#         db_resp = await supabase_admin.rpc(
#             "save_invoice_atomic",
#             {
#                 "p_user_id": user_id,
#                 "p_seller_id": seller_details["id"],
#                 "p_buyer_payload": buyer_payload,
#                 "p_invoice_payload": db_invoice_payload,
#                 "p_items_payload": items_payload
#             }
#         ).execute()

#         # Check for *database-level* errors (like duplicate key)
#         if db_resp.data and db_resp.data.get("status") == "error":
#             # --- Raise an error to trigger the 'except' block (rollback logic) ---
#             raise Exception(db_resp.data.get("message") or "Database transaction failed.")

#         # Step 9: Create embeddings (optional, non-blocking)
#         invoice_id = db_resp.data.get("invoice_id")
#         if invoice_id:
#             # Non-blocking task creation for long-running AI/Embedding process
#             asyncio.create_task(
#                 asyncio.to_thread(embed_and_store_invoice, invoice_id, final_payload)
#             )

#         logging.info(f"✅ Successfully created invoice {invoice_no}.")
#         return json.dumps({
#             "status": "success",
#             "invoice_number": invoice_no,
#             "url": storage_url
#         })

#     except Exception as e:
#         # --- THIS IS THE ROLLBACK LOGIC ---
#         logging.error(f"❌ An error occurred in create_invoice: {e}", exc_info=True)

#         if storage_path and supabase_admin:
#             # If storage_path is set, and we have the admin client, the upload succeeded,
#             # but the DB save failed, so we must delete the orphan file.
#             try:
#                 logging.warning(f"ROLLBACK: Deleting orphan file from storage: {storage_path}")
#                 await supabase_admin.storage.from_("invoices").remove([storage_path])
#                 logging.info(f"Rollback successful. Deleted: {storage_path}")
#             except Exception as storage_e:
#                 logging.error(f"CRITICAL: Failed to delete orphan file {storage_path}. Error: {storage_e}")

#         # Return the original error message to the user
#         error_str = str(e)
        
#         # --- ADD THIS LOGIC ---
#         # Check for the specific database error
#         if "violates not-null constraint" in error_str and '"unit"' in error_str:
#             clean_message = "Invoice creation failed. One or more items are missing the 'unit' (e.g., pcs, kg, etc.)."
#         else:
#             # Fallback for other errors
#             clean_message = f"Invoice creation failed: {error_str}"
#         # --- END OF FIX ---

#         # Return the clean message
#         return json.dumps({"status": "error", "message": clean_message})
    
#     finally:
#         # Step 10: Clean up the temporary *local* PDF file
#         if pdf_path:
#             try:
#                 # Use to_thread for blocking file system operations
#                 if await asyncio.to_thread(os.path.exists, pdf_path):
#                     await asyncio.to_thread(os.remove, pdf_path)
#             except Exception as e:
#                 logging.warning(f"Failed to clean up local PDF {pdf_path}: {e}")
                
# # ==============================================================================
# # PYDANTIC MODELS: Blueprints for Agent Data
# # ==============================================================================
# from pydantic import BaseModel, Field
# # --- Models for CREATE Operations ---
# class CreateItem(BaseModel):
#     name: str
#     quantity: float
#     rate: float
#     unit: str
#     hsn: Optional[str] = ""
#     gst_rate: Optional[float] = 0

# class CreateBuyer(BaseModel):
#     name: str
#     address: str
#     state: Optional[str] = ""
#     gstin: Optional[str] = ""
#     phone_no: Optional[str] = ""
#     email: Optional[str] = ""

# class CreateInvoiceDetails(BaseModel):
#     number: str
#     date: str
#     due_date: str
#     title: Optional[str] = "Tax Invoice"

# class InvoiceCreateData(BaseModel):
#     """The main payload the agent must construct to create an invoice."""
#     invoice: CreateInvoiceDetails
#     buyer: CreateBuyer
#     items: List[CreateItem]
#     terms_and_conditions: Optional[List[str]] = []
#     set_payment_reminder: Optional[bool] = False

# # --- Models for UPDATE Operations ---
# class UpdateItem(BaseModel):
#     """
#     Defines structure for updating or adding items.
#     - If 'id' is provided → update that existing item.
#     - If 'id' is None → treat as a new item to be inserted.
#     - If 'delete' is True → delete that item.
#     """
#     id: Optional[int] = Field(None, description="ID of existing item. Leave None for new items.")
#     name: Optional[str] = None
#     quantity: Optional[float] = None
#     rate: Optional[float] = None
#     unit: Optional[str] = None
#     hsn: Optional[str] = None
#     gst_rate: Optional[float] = None
#     delete: Optional[bool] = False


# class UpdateBuyer(BaseModel):
#     """Defines the structure for the buyer's data when updating."""
#     name: str
#     address: str
#     state: Optional[str] = ""
#     gstin: Optional[str] = ""
#     phone_no: Optional[str] = ""
#     email: Optional[str] = ""

# class UpdateInvoiceDetails(BaseModel):
#     """Defines the structure for the core invoice details when updating."""
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
# # TOOL FUNCTIONS
# # ==============================================================================

# from datetime import datetime

# REQUIRED_FIELDS = ["buyer_name", "buyer_address", "buyer_state", "items"]
# OPTIONAL_FIELDS = ["phone_no", "email", "gstin", "terms_and_conditions"]

# def validate_invoice_data(invoice_data: dict):
#     """
#     Validate invoice data before saving.
#     Returns structured response with success/failure and missing fields.
#     """
#     errors = []
#     buyer = invoice_data.get("buyer", {})
    
#     # Required checks
#     if not buyer.get("name"):
#         errors.append("buyer_name")
#     if not buyer.get("address"):
#         errors.append("buyer_address")
#     if not buyer.get("state"):
#         errors.append("buyer_state")
#     if not invoice_data.get("items"):
#         errors.append("items")

#     if errors:
#         return {
#             "success": False,
#             "error": "Missing required fields",
#             "missing_fields": errors,
#             "metadata": invoice_data
#         }

#     # Optional fields → if user skipped them, set as None
#     for field in OPTIONAL_FIELDS:
#         if not buyer.get(field):
#             buyer[field] = None

#     return {"success": True, "error": None, "metadata": invoice_data}




# # async def update_invoice(update_data: Dict[str, Any], user_id: str) -> str:
# #     """
# #     Use to save changes to an existing invoice. The input must be the full,
# #     modified invoice JSON, including the database ID for the invoice and for each item.
# #     """
# #     pdf_path = None
# #     invoice_id = None
# #     try:
# #         validated_data = InvoiceUpdateData(**update_data)
# #         invoice_id = validated_data.invoice.id
        
# #         # This section is now correct (no 'await')
# #         invoice_resp = supabase.table("invoices_record").select("seller_id, invoice_url").eq("id", invoice_id).eq("user_id", user_id).single().execute()
# #         if not invoice_resp.data:
# #             return f"Error: Invoice with ID {invoice_id} not found or you don't have permission to edit it."
        
# #         seller_id = invoice_resp.data["seller_id"]
        
# #         seller_resp = supabase.table("sellers_record").select("*").eq("id", seller_id).single().execute()
# #         if not seller_resp.data:
# #             return "Error: Could not find seller details for the invoice."
        
# #         full_pdf_payload = {"company": seller_resp.data, **validated_data.model_dump()}
# #         pdf_path = generate_final_invoice(full_pdf_payload)

# #         sanitized_invoice_no = re.sub(r"[\/\\]", "-", validated_data.invoice.number)
# #         storage_path = f"{user_id}/{sanitized_invoice_no}.pdf"

# #         with open(pdf_path, "rb") as f:
# #             content = f.read()

# #         # +++ CORRECTED LINE +++
# #         # The value for 'upsert' must be a string, not a boolean.
# #         file_options = {"content-type": "application/pdf", "upsert": "true"}

# #         supabase.storage.from_("invoices").upload(
# #             path=storage_path,
# #             file=content,
# #             file_options=file_options # Pass the corrected options here
# #         )

# #         new_storage_url = supabase.storage.from_("invoices").get_public_url(storage_path)
        
# #         # The rest of your function logic remains the same...
# #         buyer_payload = validated_data.buyer.model_dump(exclude_unset=True)
# #         # Step 1: Perform the upsert. This won't return the ID.
# #         supabase.table("buyers_record").upsert(
# #             {**buyer_payload, "user_id": user_id}, 
# #             on_conflict="user_id, name"
# #         ).execute()

# #         # Step 2: Now, fetch the ID of the buyer you just upserted.
# #         buyer_resp = supabase.table("buyers_record").select("id").eq("user_id", user_id).eq("name", buyer_payload["name"]).single().execute()

# #         # Check if the select worked before getting the ID
# #         if not buyer_resp.data:
# #             return f"Error: Could not re-fetch buyer ID for {buyer_payload['name']} after update."

# #         buyer_id = buyer_resp.data["id"]
        
# #         invoice_payload = {
# #             "buyer_id": buyer_id,
# #             "invoice_url": new_storage_url,
# #             **validated_data.invoice.model_dump(exclude={'id'})
# #         }
# #         invoice_payload = {k: v for k, v in invoice_payload.items() if v is not None}
# #         supabase.table("invoices_record").update(invoice_payload).eq("id", invoice_id).execute()

# #         supabase.table("items_record").delete().eq("invoice_id", invoice_id).execute()

# #         items_to_insert = []
# #         for item in validated_data.items:
# #             # --- THIS IS THE FIX ---
# #             # Only add items that are NOT marked for deletion
# #             if not item.delete:
# #                 # Exclude 'id' (since it's a new row) AND 'delete' (which doesn't exist in the DB)
# #                 item_data = item.model_dump(exclude={'id', 'delete'}) 
# #                 item_data["invoice_id"] = invoice_id
# #                 items_to_insert.append(item_data)
# #         # --- END FIX ---

# #         if items_to_insert:
# #             supabase.table("items_record").insert(items_to_insert).execute()
        
# #         await embed_and_store_invoice(invoice_id, full_pdf_payload)

# #         return f"Success: Invoice {validated_data.invoice.number} updated. New URL: {new_storage_url}"

# #     except Exception as e:
# #         error_msg = f"An error occurred during invoice update for ID {invoice_id or 'unknown'}: {e}"
# #         logging.error(error_msg, exc_info=True)
# #         return f"Error updating invoice: {e}"
# #     finally:
# #         if pdf_path and os.path.exists(pdf_path):
# #             os.remove(pdf_path)

# async def update_invoice(update_data: Dict[str, Any], user_id: str) -> str:
#     """
#     Asynchronously saves changes to an existing invoice.
#     Uses an atomic database function to ensure data integrity.
#     Rolls back storage upload if the database save fails.
#     """
#     pdf_path = None
#     invoice_id = None
#     storage_path = None # Will hold the path of the *new* PDF
    
#     try:
#         # Get the admin client for all operations
#         supabase_admin = await get_supabase_admin_client()
        
#         # --- Step 1: Validate input data ---
#         try:
#             validated_data = InvoiceUpdateData(**update_data)
#         except Exception as pydantic_error:
#             return json.dumps({"status": "error", "message": f"Validation failed: {pydantic_error}"})
            
#         invoice_id = validated_data.invoice.id
        
#         # --- Step 2: Fetch existing seller data ---
#         invoice_resp = await supabase_admin.table("invoices_record").select("seller_id") \
#             .eq("id", invoice_id).eq("user_id", user_id).single().execute()
            
#         if not invoice_resp.data:
#             return json.dumps({"status": "error", "message": f"Invoice ID {invoice_id} not found or permission denied."})
        
#         seller_id = invoice_resp.data["seller_id"]
        
#         seller_resp = await supabase_admin.table("sellers_record").select("*").eq("id", seller_id).single().execute()
#         if not seller_resp.data:
#             return json.dumps({"status": "error", "message": "Could not find seller details for the invoice."})

#         # --- Step 3: Generate new PDF (non-blocking) ---
#         full_pdf_payload = {"company": seller_resp.data, **validated_data.model_dump()}
#         # pdf_path = await asyncio.to_thread(generate_final_invoice, full_pdf_payload)
#         pdf_path = await asyncio.to_thread(create_dynamic_invoice, full_pdf_payload)

#         # --- Step 4: Upload new PDF to storage (non-blocking) ---
#         sanitized_invoice_no = re.sub(r"[\/\\]", "-", validated_data.invoice.number)
#         storage_path = f"{user_id}/{sanitized_invoice_no}.pdf" # The path of the new file

#         with open(pdf_path, "rb") as f:
#             content = await asyncio.to_thread(f.read) # Read file asynchronously

#         file_options = {"content-type": "application/pdf", "upsert": "true"}
        
#         await supabase_admin.storage.from_("invoices").upload(
#             path=storage_path,
#             file=content,
#             file_options=file_options
#         )

#         new_storage_url = await supabase_admin.storage.from_("invoices").get_public_url(storage_path)
        
#         # --- Step 5: Prepare payloads for the database ---
#         buyer_payload = validated_data.buyer.model_dump()
        
#         # Create a list of items to insert (excluding deleted ones)
#         items_to_insert = []
#         for item in validated_data.items:
#             if not item.delete:
#                 item_data = item.model_dump(exclude={'id', 'delete'})
#                 items_to_insert.append(item_data)
                
#         invoice_payload = {
#             "number": validated_data.invoice.number,
#             "date": validated_data.invoice.date,
#             "due_date": validated_data.invoice.due_date,
#             "invoice_url": new_storage_url,
#             "title": validated_data.invoice.title,
#             "terms_and_conditions": validated_data.terms_and_conditions
#         }
        
#         # --- Step 6: Call the ATOMIC database function ---
#         db_resp = await supabase_admin.rpc(
#             "save_invoice_update_atomic",
#             {
#                 "p_user_id": user_id,
#                 "p_invoice_id": invoice_id,
#                 "p_buyer_payload": buyer_payload,
#                 "p_invoice_payload": invoice_payload,
#                 "p_items_payload": items_to_insert
#             }
#         ).execute()

#         if db_resp.data.get("status") == "error":
#             raise Exception(db_resp.data.get("message")) # Trigger the rollback

#         # --- Step 7: Run embedding in the background ---
#         asyncio.create_task(
#             asyncio.to_thread(embed_and_store_invoice, invoice_id, full_pdf_payload)
#         )

#         return json.dumps({
#             "status": "success",
#             "message": f"Invoice {validated_data.invoice.number} updated.",
#             "url": new_storage_url
#         })

#     except Exception as e:
#         error_msg = f"An error occurred during invoice update for ID {invoice_id or 'unknown'}: {e}"
#         logging.error(error_msg, exc_info=True)
        
#         # --- ROLLBACK LOGIC ---
#         if storage_path:
#             # If storage_path is set, the PDF upload succeeded.
#             # We must delete it to roll back the change.
#             try:
#                 logging.warning(f"ROLLBACK: Deleting newly uploaded file from storage: {storage_path}")
#                 await supabase_admin.storage.from_("invoices").remove([storage_path])
#                 logging.info(f"Rollback successful. Deleted: {storage_path}")
#             except Exception as storage_e:
#                 logging.error(f"CRITICAL: Failed to delete orphan file {storage_path}. Error: {storage_e}")

#         return json.dumps({"status": "error", "message": f"Error updating invoice: {e}"})

#     finally:
#         # --- Step 8: Clean up local temporary file ---
#         if pdf_path:
#             try:
#                 if await asyncio.to_thread(os.path.exists, pdf_path):
#                     await asyncio.to_thread(os.remove, pdf_path)
#             except Exception as e:
#                 logging.warning(f"Failed to clean up local PDF {pdf_path}: {e}")

# # --- Sales, Revenue & Payment Tools ---

# from decimal import Decimal, getcontext, ROUND_HALF_UP

# def get_sales_summary(
#     user_id: str, 
#     time_period: Optional[str] = None, 
#     start_date: Optional[str] = None, 
#     end_date: Optional[str] = None
# ) -> str:
#     """
#     Gets a high-level financial summary of sales for a time period, supporting 
#     named periods (e.g., 'last month') or explicit start/end dates.
#     """
#     try:
#         # --- 1. DETERMINE DATE RANGE ---
#         if start_date and end_date:
#             # Use custom start/end dates
#             start_date_obj = _normalize_date(start_date)
#             end_date_obj = _normalize_date(end_date)
#             period_label = f"from {start_date} to {end_date}"

#         elif time_period:
#             # Use the existing intelligent parser
#             start_date_obj, end_date_obj = _parse_time_period(time_period)
#             period_label = time_period
        
#         else:
#             raise ValueError("Must specify either a 'time_period' or explicit 'start_date' and 'end_date'.")

#         # Ensure dates are chronological
#         if start_date_obj > end_date_obj:
#              raise ValueError("Start date cannot be after the end date.")

#         # --- 2. SQL Query ---
#         query = """
#         WITH InvoiceTotals AS (
#             SELECT
#                 ir.id as invoice_id,
#                 COALESCE(SUM(it.quantity::numeric * it.rate::numeric), 0) AS taxable_total,
#                 COALESCE(SUM(
#                     (it.quantity::numeric * it.rate::numeric) * COALESCE(it.gst_rate, 0) / 100.0
#                 ), 0) AS gst_total
#             FROM invoices_record ir
#             LEFT JOIN items_record it ON ir.id = it.invoice_id
#             WHERE ir.user_id = %s
#               AND ir.date BETWEEN %s AND %s
#             GROUP BY ir.id
#         )
#         SELECT
#             COUNT(invoice_id) AS total_invoice_count,
#             SUM(taxable_total + gst_total) AS total_revenue,
#             SUM(gst_total) AS total_gst_collected,
#             COUNT(CASE WHEN taxable_total > 0 THEN 1 ELSE NULL END) AS revenue_invoice_count,
#             CASE
#                 WHEN COUNT(CASE WHEN taxable_total > 0 THEN 1 ELSE NULL END) = 0 THEN 0
#                 ELSE SUM(taxable_total + gst_total) / COUNT(CASE WHEN taxable_total > 0 THEN 1 ELSE NULL END)::numeric
#             END AS average_sale_value
#         FROM InvoiceTotals;
#         """

#         # Execute query using the determined date objects
#         results = db_manager.execute_query(query, (user_id, start_date_obj, end_date_obj))

#         # --- 3. Process Results ---
#         if not results or results[0].get('total_invoice_count') is None:
#             return json.dumps({
#                  "status": "no_data",
#                  "message": f"No sales data found for {period_label}.",
#                  "period": period_label
#              })

#         summary = results[0]
#         quantizer = Decimal("0.01")
        
#         # Safely convert to Decimal and format
#         total_revenue = (Decimal(summary.get('total_revenue') or 0)).quantize(quantizer, ROUND_HALF_UP)
#         total_gst = (Decimal(summary.get('total_gst_collected') or 0)).quantize(quantizer, ROUND_HALF_UP)
#         average_sale = (Decimal(summary.get('average_sale_value') or 0)).quantize(quantizer, ROUND_HALF_UP)


#         formatted_summary = {
#             "period": period_label,
#             "total_revenue_inc_gst": f"₹{total_revenue:,.2f}",
#             "total_gst_collected": f"₹{total_gst:,.2f}",
#             "total_invoice_count": int(summary.get('total_invoice_count') or 0),
#             "average_sale_per_revenue_invoice": f"₹{average_sale:,.2f}",
#             "revenue_generating_invoice_count": int(summary.get('revenue_invoice_count') or 0)
#         }

#         return json.dumps({"status": "success", "summary": formatted_summary})

#     except ValueError as e:
#         # Catches errors from date parsing or missing arguments
#         logging.warning(f"Validation Error in get_sales_summary: {e}")
#         return json.dumps({
#             "status": "error",
#             "message": f"Invalid time period or date: {e}"
#         })
#     except Exception as e:
#         logging.error(f"Execution Error in get_sales_summary: {e}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": f"Could not retrieve sales summary. Details: {e}"
#         })

# # In app/tools/sql_query_tool.py

# def _process_invoice_results(results: list) -> list:
#     """
#     Helper to safely format invoice query results for JSON serialization.
#     - Handles None for total_amount (for invoices with no items).
#     - Converts date objects to ISO strings.
#     """
#     if not results:
#         return []
        
#     for row in results:
#         # 1. Safely handle total_amount (for LEFT JOIN on items)
#         total = row.get('total_amount') or 0.0
#         row['total_amount'] = round(float(total), 2)
        
#         # 2. Convert date objects to strings for JSON
#         if 'date' in row and isinstance(row.get('date'), date):
#             row['date'] = row['date'].isoformat()
#         if 'due_date' in row and isinstance(row.get('due_date'), date):
#             row['due_date'] = row['due_date'].isoformat()
            
#     return results

# def get_unpaid_invoices(user_id: str) -> str:
#     """Use to get a list of all invoices currently marked as unpaid."""
#     try:
#         query = """
#             SELECT ir.number, ir.date, ir.due_date, br.name as buyer_name,
#                    SUM(it.quantity * it.rate * (1 + it.gst_rate / 100)) as total_amount
#             FROM invoices_record ir
#             JOIN buyers_record br ON ir.buyer_id = br.id
#             LEFT JOIN items_record it ON ir.id = it.invoice_id  -- Correctly uses LEFT JOIN
#             WHERE ir.user_id = %s AND ir.status = 'unpaid'
#             GROUP BY ir.id, br.name ORDER BY ir.due_date ASC;
#         """
#         results = db_manager.execute_query(query, (user_id,))
        
#         if not results:
#             return json.dumps({"status": "ok", "message": "No unpaid invoices found."})

#         # Use the helper function
#         processed_results = _process_invoice_results(results)
        
#         return json.dumps({"status": "unpaid_invoices", "invoices": processed_results})
#     except Exception as e:
#         logging.error(f"Error in get_unpaid_invoices: {e}", exc_info=True)
#         # FIX 4: Return proper JSON error
#         return json.dumps({"status": "error", "message": f"Could not retrieve unpaid invoices. Details: {e}"})

# def get_overdue_invoices(user_id: str) -> str:
#     """Use to get a list of unpaid invoices where the due date is in the past."""
#     try:
#         query = """
#             SELECT ir.number, ir.date, ir.due_date, br.name as buyer_name,
#                    SUM(it.quantity * it.rate * (1 + it.gst_rate / 100)) as total_amount
#             FROM invoices_record ir
#             JOIN buyers_record br ON ir.buyer_id = br.id
#             LEFT JOIN items_record it ON ir.id = it.invoice_id  -- <-- FIX 2: Was INNER JOIN
#             WHERE ir.user_id = %s 
#               AND ir.status = 'unpaid' 
#               AND ir.due_date < CURRENT_DATE
#             GROUP BY ir.id, br.name ORDER BY ir.due_date ASC;
#         """
#         results = db_manager.execute_query(query, (user_id,))
        
#         if not results:
#             return json.dumps({"status": "ok", "message": "No overdue invoices found."})

#         # FIX 1 & 3: Use the helper function to handle None and dates
#         processed_results = _process_invoice_results(results)
        
#         return json.dumps({"status": "overdue_invoices", "invoices": processed_results})
#     except Exception as e:
#         logging.error(f"Error in get_overdue_invoices: {e}", exc_info=True)
#         # FIX 4: Return proper JSON error
#         return json.dumps({"status": "error", "message": f"Could not retrieve overdue invoices. Details: {e}"})

# # --- Customer (Buyer) & Top Performer Tools ---

# import json

# def get_all_buyers(user_id: str, page: int = 1, page_size: int = 25) -> str:
#     """
#     Gets a paginated list of all buyers/customers for a user.
    
#     Args:
#         user_id: The ID of the user.
#         page: The page number to retrieve (e.g., 1, 2, 3).
#         page_size: The number of buyers to return per page.
#     """
#     try:
#         # Prevent invalid inputs
#         if page < 1: page = 1
#         if page_size < 1: page_size = 25
        
#         # Calculate the offset for the database query
#         offset = (page - 1) * page_size
        
#         # 1. Add 'ORDER BY' for stable, predictable results
#         # 2. Add 'LIMIT' and 'OFFSET' for pagination
#         query = """
#             SELECT name, address, email, gstin, phone_no 
#             FROM buyers_record 
#             WHERE user_id = %s
#             ORDER BY name ASC 
#             LIMIT %s OFFSET %s;
#         """
        
#         # Pass the new parameters to the query
#         results = db_manager.execute_query(query, (user_id, page_size, offset))
        
#         if not results:
#             # Handle the case where the user has no buyers *at all*
#             # or the page number is too high
#             return json.dumps({"status": "not_found", "message": "No buyers found for this page."})
        
#         return json.dumps({"status": "found", "buyers": results, "page": page})

#     except Exception as e:
#         # FIXED: Return a structured JSON error
#         return json.dumps({"status": "error", "message": f"An error occurred: {e}"})
        

# # def get_all_buyers(user_id: str) -> str:
# #     """Use to get a list of all buyers/customers. Takes no input."""
# #     try:
# #         query = "SELECT id, name, address, email, gstin, phone_no FROM buyers_record WHERE user_id = %s;"
# #         results = db_manager.execute_query(query, (user_id,))
# #         if not results: return json.dumps({"status": "not_found", "message": "No buyers found."})
# #         return json.dumps({"status": "found", "buyers": results})
# #     except Exception as e:
# #         return f"Error searching for buyers: {e}"

# # In app/tools/sql_query_tool.py

# # def search_existing_buyer(user_id: str, name: str) -> str:
# #     """Use FIRST to find a specific buyer by their name."""
# #     try:
# #         search_term = name.strip()
# #         query = "SELECT id, name, address, email, gstin, phone_no FROM buyers_record WHERE user_id = %s AND name ILIKE %s LIMIT 5;"
        
# #         results = db_manager.execute_query(query, (user_id, f"%{search_term}%"))
        
# #         if not results:
# #             return json.dumps({"status": "not_found", "message": f"No buyer found with name '{search_term}'."})
        
# #         return json.dumps({"status": "found", "details": results[0]})
# #     except Exception as e:
# #         return json.dumps({"status": "error", "message": f"An error occurred while searching: {e}"})


# async def search_existing_buyer(user_id: str, name: str) -> str:
#     """
#     Finds the single most similar buyer using fuzzy search (trigrams),
#     even with spelling mistakes or voice input errors.
#     """
#     try:
#         search_term = name.strip()
#         if not search_term:
#             return json.dumps({"status": "not_found", "message": "Search term is empty."})

#         # 1. 'word_similarity(name, %s)' calculates a score (0 to 1)
#         # 2. 'score > 0.3' filters out very bad matches
#         # 3. 'ORDER BY score DESC' puts the BEST match first
#         # 4. 'LIMIT 1' returns only that single best match
#         query = """
#             SELECT 
#                 id, name, address, email, gstin, phone_no,
#                 word_similarity(name, %s) AS score
#             FROM buyers_record 
#             WHERE 
#                 user_id = %s 
#                 AND word_similarity(name, %s) > 0.4
#             ORDER BY score DESC 
#             LIMIT 1;
#         """
        
#         # We pass the search term three times to the query
#         results = db_manager.execute_query(query, (search_term, user_id, search_term))
        
#         if not results:
#             return json.dumps({"status": "not_found", "message": f"No close match found for '{search_term}'."})
        
#         # results[0] is now the single most confident answer
#         return json.dumps({"status": "found", "details": results[0]})

#     except Exception as e:
#         return json.dumps({"status": "error", "message": f"An error occurred while searching: {e}"})
    

# # --- Add this import at the top of your file ---
# from decimal import Decimal

# # def get_top_performing_entities(user_id: str, time_period: str, entity_type: str, limit: int = 5) -> str:
# #     """
# #     Finds top products OR buyers based on sales.
# #     You MUST provide an entity_type: either 'product' or 'buyer'.

# #     Args:
# #         user_id (str): The ID of the user.
# #         time_period (str): Time frame (e.g., "this month", "last year").
# #         entity_type (str): The entity to analyze. MUST be 'product' or 'buyer'.
# #         limit (int, optional): Number of results to return. Defaults to 5.

# #     Returns:
# #         str: A JSON string with a list of top entities or an error message.
# #     """
# #     try:
# #         start_date, end_date = _parse_time_period(time_period)
# #         entity = entity_type.lower()

# #         if entity == 'product':
# #             query = """
# #                 SELECT
# #                     it.name,
# #                     SUM(it.quantity * it.rate) as total_revenue
# #                 FROM items_record it
# #                 JOIN invoices_record ir ON it.invoice_id = ir.id
# #                 WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
# #                 GROUP BY it.name
# #                 ORDER BY total_revenue DESC
# #                 LIMIT %s;
# #             """
# #         elif entity == 'buyer':
# #             query = """
# #                 SELECT
# #                     br.name,
# #                     SUM(it.quantity * it.rate) as total_spent
# #                 FROM invoices_record ir
# #                 JOIN buyers_record br ON ir.buyer_id = br.id
# #                 JOIN items_record it ON ir.id = it.invoice_id
# #                 WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
# #                 GROUP BY br.name
# #                 ORDER BY total_spent DESC
# #                 LIMIT %s;
# #             """
# #         else:
# #             return json.dumps({"status": "error", "message": "Invalid entity_type. Choose 'product' or 'buyer'."})

# #         results = db_manager.execute_query(query, (user_id, start_date, end_date, limit))

# #         if not results:
# #             return json.dumps({"status": "no_data", "message": f"No data found for top {entity_type}s in {time_period}."})

# #         # This loop now works because 'Decimal' is defined via the import
# #         for row in results:
# #             for key, value in row.items():
# #                 if isinstance(value, Decimal):
# #                     row[key] = float(value)
        
# #         return json.dumps({"status": "success", "data": results})

# #     except Exception as e:
# #         # It's helpful to log the actual exception for debugging
# #         print(f"Error in get_top_performing_entities: {e}")
# #         return json.dumps({"status": "error", "message": f"Could not retrieve top entities. Details: {e}"})

# def get_top_performing_entities(user_id: str, time_period: str, entity_type: str, limit: int = 5) -> str:
#     """
#     Finds top products OR buyers based on total sales value (including GST).
#     You MUST provide an entity_type: either 'product' or 'buyer'.
#     Returns structured JSON for success and error states.
#     """
#     try:
#         start_date, end_date = _parse_time_period(time_period)
#         entity = entity_type.lower()
        
#         # Define the base calculation including GST
#         amount_calculation = "(it.quantity::numeric * it.rate::numeric * (1 + COALESCE(it.gst_rate, 0) / 100.0))"

#         if entity == 'product':
#             query = f"""
#                 SELECT
#                     it.name,
#                     SUM({amount_calculation}) as total_revenue_inc_gst
#                 FROM items_record it
#                 JOIN invoices_record ir ON it.invoice_id = ir.id
#                 WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
#                 GROUP BY it.name
#                 ORDER BY total_revenue_inc_gst DESC
#                 LIMIT %s;
#             """
#             result_key = "top_products"
#             value_key = "total_revenue_inc_gst"
#         elif entity == 'buyer':
#             query = f"""
#                 SELECT
#                     br.name,
#                     SUM({amount_calculation}) as total_spent_inc_gst
#                 FROM invoices_record ir
#                 JOIN buyers_record br ON ir.buyer_id = br.id
#                 JOIN items_record it ON ir.id = it.invoice_id
#                 WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s
#                 GROUP BY br.name
#                 ORDER BY total_spent_inc_gst DESC
#                 LIMIT %s;
#             """
#             result_key = "top_buyers"
#             value_key = "total_spent_inc_gst"
#         else:
#             return json.dumps({"status": "error", "message": "Invalid entity_type. Choose 'product' or 'buyer'."})

#         results = db_manager.execute_query(query, (user_id, start_date, end_date, limit))

#         if not results:
#             return json.dumps({"status": "no_data", "message": f"No data found for top {entity_type}s in {time_period}."})

#         # Format results for cleaner output
#         formatted_results = []
#         quantizer = Decimal("0.01") # For rounding to 2 decimal places

#         for row in results:
#             amount = (Decimal(row.get(value_key) or 0)).quantize(quantizer, ROUND_HALF_UP)
#             formatted_results.append({
#                 "name": row.get("name"),
#                 value_key: f"₹{amount:,.2f}" # Format as currency string
#             })
            
#         return json.dumps({
#             "status": "success",
#             result_key: formatted_results, # Use specific key
#             "period": time_period
#             })

#     except Exception as e:
#         # Log the error properly
#         logging.error(f"Error in get_top_performing_entities: {e}", exc_info=True)
#         # Return JSON error
#         return json.dumps({
#             "status": "error",
#             "message": f"Could not retrieve top entities. Details: {e}"
#             })
    
# # --- Inventory Tools ---

# # def get_low_stock_alerts(user_id: str) -> str:
# #     """Use to find products low in stock (requires 'products' table)."""
# #     try:
# #         query = 'SELECT "name", "stock", "alert_stock", "unit" FROM "products" WHERE "user_id" = %s AND "stock" <= "alert_stock";'
# #         results = db_manager.execute_query(query, (user_id,))
# #         if not results: return json.dumps({"status": "ok", "message": "All products are above their stock alert levels."})
# #         return json.dumps({"status": "low_stock", "items": results})
# #     except Exception:
# #         return json.dumps({"status": "error", "message": "The inventory/products feature is not configured."})

# # def get_product_stock_level(user_id: str, product_name: str) -> str:
# #     """Use to get the current stock for a specific product."""
# #     try:
# #         query = 'SELECT "name", "stock", "unit" FROM "products" WHERE "user_id" = %s AND "name" ILIKE %s;'
# #         results = db_manager.execute_query(query, (user_id, f"%{product_name}%"))
# #         if not results: return json.dumps({"status": "not_found", "message": f"Product '{product_name}' not found."})
# #         return json.dumps({"status": "found", "product": results[0]})
# #     except Exception:
# #         return json.dumps({"status": "error", "message": "The inventory/products feature is not configured."})

# import psycopg2 # Assuming db_manager uses psycopg2

# def get_low_stock_alerts(user_id: str) -> str:
#     """Use to find products low in stock (requires 'products' table)."""
#     try:
#         # Added ORDER BY
#         query = """
#             SELECT "name", "stock", "alert_stock", "unit"
#             FROM "products"
#             WHERE "user_id" = %s AND "stock" <= "alert_stock"
#             ORDER BY "name" ASC;
#         """
#         results = db_manager.execute_query(query, (user_id,))

#         if not results:
#             return json.dumps({
#                 "status": "ok",
#                 "message": "All products are above their stock alert levels."
#             })

#         return json.dumps({"status": "low_stock", "items": results})

#     # Catch specific database errors
#     except (psycopg2.Error, ConnectionError) as db_err:
#         logging.error(f"Database error in get_low_stock_alerts for user {user_id}: {db_err}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": "Could not connect to or query the product database."
#         })
#     except Exception as e:
#         # Catch any other unexpected errors
#         logging.error(f"Unexpected error in get_low_stock_alerts for user {user_id}: {e}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": f"An unexpected error occurred: {e}"
#         })

# def get_product_stock_level(user_id: str, product_name: str) -> str:
#     """Use to get the current stock for a specific product using exact name match (case-insensitive)."""
#     try:
#         search_term = product_name.strip()
#         if not search_term:
#              return json.dumps({"status": "error", "message": "Product name cannot be empty."})

#         # Use exact, case-insensitive match (ILIKE without wildcards)
#         query = """
#             SELECT "name", "stock", "unit"
#             FROM "products"
#             WHERE "user_id" = %s AND "name" ILIKE %s;
#         """
#         # Pass the exact search term
#         results = db_manager.execute_query(query, (user_id, search_term))

#         if not results:
#             return json.dumps({
#                 "status": "not_found",
#                 "message": f"Product '{search_term}' not found."
#             })

#         # Since we expect an exact match, results[0] is now reliable (or use LIMIT 1 in query)
#         return json.dumps({"status": "found", "product": results[0]})

#     # Catch specific database errors
#     except (psycopg2.Error, ConnectionError) as db_err:
#         logging.error(f"Database error in get_product_stock_level for user {user_id}, product '{product_name}': {db_err}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": "Could not connect to or query the product database."
#         })
#     except Exception as e:
#         # Catch any other unexpected errors
#         logging.error(f"Unexpected error in get_product_stock_level for user {user_id}, product '{product_name}': {e}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": f"An unexpected error occurred: {e}"
#         })

# # --- Financial & Ledger Tools ---

# def get_ledger_summary(user_id: str, time_period: str) -> str:
#     """Use to get a summary of income (credit) and expenses (debit) from the ledger."""
#     try:
#         start_date, end_date = _parse_time_period(time_period)
#         query = """
#             SELECT type, COALESCE(SUM(amount), 0) as total_amount FROM ledger_entries
#             WHERE user_id = %s AND created_at::date BETWEEN %s AND %s
#             GROUP BY type;
#         """
#         results = db_manager.execute_query(query, (user_id, start_date, end_date))
#         summary = {'credit': 0.0, 'debit': 0.0}
#         for row in results: summary[row['type']] = float(row['total_amount'])
#         return json.dumps(summary)
#     except Exception as e:
#         return f"Error: Could not retrieve ledger summary. Details: {e}"

# # --- Communication & Sharing Tools ---

# def _resolve_invoice_details(user_id: str, invoice_identifier: str) -> Dict[str, Any]:
#     """
#     IMPROVEMENT: New, crucial helper function.
#     Resolves an invoice using its human-readable number OR its ID.
#     This fixes the core issue from the user's test log.
#     """
#     # First, try to find the invoice by its number
#     invoice_id_query = "SELECT id FROM invoices_record WHERE number = %s AND user_id = %s LIMIT 1;"
#     result = db_manager.execute_query(invoice_id_query, (invoice_identifier, user_id))
    
#     if not result:
#         # If not found, maybe the user provided an ID directly (less likely but good to handle)
#         try:
#             int_id = int(invoice_identifier)
#             check_query = "SELECT id FROM invoices_record WHERE id = %s AND user_id = %s;"
#             if not db_manager.execute_query(check_query, (int_id, user_id)):
#                  raise ValueError("Invoice ID not found for this user.")
#         except (ValueError, TypeError):
#              raise ValueError(f"Invoice '{invoice_identifier}' could not be found.")
#     else:
#         int_id = result[0]['id']

#     # Now fetch all details using the confirmed internal ID
#     details_query = """
#         SELECT i.id, i.number, i.invoice_url, b.name, b.email, b.phone_no
#         FROM invoices_record i
#         LEFT JOIN buyers_record b ON i.buyer_id = b.id
#         WHERE i.id = %s AND i.user_id = %s;
#     """
#     details_result = db_manager.execute_query(details_query, (int_id, user_id))
    
#     if not details_result:
#         raise ValueError(f"Could not retrieve details for invoice ID {int_id}.")
        
#     return details_result[0]

# # --- COMMUNICATION TOOLS (CORRECTED) ---

# def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
#     """Use to email an invoice. Input is JSON: {"invoice_no": "number", "email_address": "optional_email"}."""
#     # FIX: Use Fernet from a library import, not assumed global
#     # from cryptography.fernet import Fernet
#     if not ENCRYPTION_KEY: return "Error: Encryption key is not configured on the server."
#     # cipher_suite = Fernet(ENCRYPTION_KEY.encode()) # This should be uncommented when using the real library
    
#     try:
       
#         # IMPROVEMENT: Centralized invoice lookup
#         details = _resolve_invoice_details(user_id, invoice_no)
        
#         seller_query = "SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id = %s;"
#         seller_result = db_manager.execute_query(seller_query, (user_id,))
#         if not seller_result or not all(seller_result[0].get(k) for k in ['sender_email', 'encrypted_sender_password']):
#             return "Error: Sender email and password are not configured. Please update them in your company profile."

#         sender_details = seller_result[0]
#         # decrypted_password = cipher_suite.decrypt(sender_details['encrypted_sender_password'].encode()).decode()
#         decrypted_password = "your_decrypted_password" # Placeholder for the decrypted password

#         target_email = email_address or details.get('email')
#         if not target_email:
#             return f"Error: No email address was provided and no email is saved for the buyer '{details.get('name')}'."

#         # IMPROVEMENT: More professional email body
#         msg = MIMEMultipart("alternative")
#         msg["Subject"] = f"Invoice {details['number']} from Your Company Name" # Should be dynamic
#         msg["From"] = sender_details['sender_email']
#         msg["To"] = target_email
#         html_body = f"""
#         <html>
#           <head></head>
#           <body>
#             <p>Dear {details['name']},</p>
#             <p>Thank you for your business. Please find your invoice <b>{details['number']}</b> attached.</p>
#             <p>You can also view and download it directly from the link below:</p>
#             <p><a href="{details['invoice_url']}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
#             <p>If you have any questions, please don't hesitate to contact us.</p>
#             <p>Sincerely,<br/>Your Company</p>
#           </body>
#         </html>
#         """
#         msg.attach(MIMEText(html_body, "html"))

#         # IMPROVEMENT: Make SMTP server configurable, not hardcoded to Gmail
#         with smtplib.SMTP("smtp.gmail.com", 587) as server:
#             server.starttls()
#             server.login(sender_details['sender_email'], decrypted_password)
#             server.sendmail(sender_details['sender_email'], target_email, msg.as_string())
        
#         return f"Successfully sent invoice {invoice_no} to {target_email}."
#     except ValueError as e: # Catches errors from the resolver
#         return f"Error: {e}"
#     except Exception as e:
#         if "Authentication failed" in str(e): return "Error: Email sending failed. Please check your configured Google App Password in settings."
#         return f"Error: Could not send email. Details: {e}"

# def generate_whatsapp_link(user_id: str, invoice_no: str, phone_number: str = None) -> str:
#     """Use to get a WhatsApp link for an invoice. Input is JSON: {"invoice_no": "number", "phone_number": "optional_phone"}."""
#     try:
#         # IMPROVEMENT: Centralized invoice lookup
#         details = _resolve_invoice_details(user_id, invoice_no)
#         target_phone = phone_number or details.get('phone_no')
#         if not target_phone:
#             return f"Error: No phone number was provided and no phone is saved for the buyer '{details.get('name')}'."
        
#         cleaned_phone = "".join(filter(str.isdigit, target_phone))
#         if len(cleaned_phone) <= 10: # Handles numbers with or without country code
#              cleaned_phone = "91" + cleaned_phone[-10:]
        
#         # IMPROVEMENT: Clearer, more concise message
#         message_body = f"Hello {details['name']},\n\nYour invoice {details['number']} is ready.\nPlease click the link to view: {details['invoice_url']}\n\nThank you!"
#         whatsapp_url = f"https://wa.me/{cleaned_phone}?text={quote(message_body)}"
#         return f"Success! Here is the WhatsApp link to share invoice {invoice_no}: {whatsapp_url}"
#     except ValueError as e: # Catches errors from the resolver
#         return f"Error: {e}"
#     except Exception as e:
#         return f"Error: Could not generate WhatsApp link. Details: {e}"

# # --- GST & REPORTING TOOLS (CORRECTED) ---

# def get_gstr3b_report(user_id: str, time_period: str) -> str:
#     """
#     Generates an accurate GSTR-3B summary for a specified time period.
#     The agent MUST provide a 'time_period' argument, which can be a natural
#     language string like 'this month', 'last quarter', or 'Q2'.

#     Args:
#         user_id (str): The ID of the current user.
#         time_period (str): The time frame to analyze.

#     Returns:
#         str: A JSON string with data formatted for both chatbot display and GSTR portal download.
#     """
#     try:
#         start_date, end_date = _parse_time_period(time_period)
        
#         # Step 1: Get the seller's details. This part is correct.
#         seller_query = "SELECT gstin, state FROM sellers_record WHERE user_id = %s;"
#         seller_result = db_manager.execute_query(seller_query, (user_id,))
#         if not seller_result or not seller_result[0].get('gstin'):
#             return json.dumps({"status": "ineligible", "message": "Cannot generate GSTR-3B report. Your company GSTIN is not set in your profile."})
        
#         seller = seller_result[0]
        
#         # Step 2: The robust SQL query. The query string itself is correct.
#         main_query = """
#             WITH SaleDetails AS (
#                 SELECT
#                     it.quantity * it.rate AS taxable_value,
#                     it.gst_rate,
#                     -- This logic correctly compares seller and buyer states within SQL
#                     CASE
#                         WHEN s.state = b.state THEN 'Intra-State'
#                         ELSE 'Inter-State'
#                     END as sale_type
#                 FROM invoices_record i
#                 JOIN items_record it ON i.id = it.invoice_id
#                 JOIN sellers_record s ON i.seller_id = s.id
#                 LEFT JOIN buyers_record b ON i.buyer_id = b.id
#                 WHERE i.user_id = %s AND i.date BETWEEN %s AND %s
#             )
#             SELECT
#                 COALESCE(SUM(CASE WHEN sale_type = 'Inter-State' THEN taxable_value * gst_rate / 100.0 ELSE 0 END), 0) as total_igst,
#                 COALESCE(SUM(CASE WHEN sale_type = 'Intra-State' THEN taxable_value * gst_rate / 200.0 ELSE 0 END), 0) as total_cgst,
#                 COALESCE(SUM(CASE WHEN sale_type = 'Intra-State' THEN taxable_value * gst_rate / 200.0 ELSE 0 END), 0) as total_sgst,
#                 COALESCE(SUM(taxable_value), 0) as total_taxable_value
#             FROM SaleDetails;
#         """
#         # --- FIX IS HERE ---
#         # The query only expects 3 parameters (user_id, start_date, end_date).
#         # The 'seller_state' parameter was removed as it is not used by the query string.
#         main_results = db_manager.execute_query(main_query, (user_id, start_date, end_date))
        
#         if not main_results:
#             return json.dumps({"status": "no_data", "message": f"No invoice data found for the period: {start_date} to {end_date}."})
        
#         data = {k: float(v or 0) for k, v in main_results[0].items()}
        
#         # Step 3: Assemble the final JSON. This logic remains correct.
#         gstr3b_portal_data = {
#             "gstin": seller['gstin'], 
#             "ret_period": start_date.strftime('%m%Y'),
#             "sup_details": { "osup_det": { 
#                 "txval": round(data['total_taxable_value'], 2), 
#                 "iamt": round(data['total_igst'], 2), 
#                 "camt": round(data['total_cgst'], 2), 
#                 "samt": round(data['total_sgst'], 2),
#                 "cess": 0.0 
#             }}
#         }
        
#         total_tax = data['total_igst'] + data['total_cgst'] + data['total_sgst']
#         analytics_summary = {
#             "total_sales_value": round(data['total_taxable_value'] + total_tax, 2),
#             "taxable_value": round(data['total_taxable_value'], 2),
#             "total_tax": round(total_tax, 2),
#             "tax_breakdown": {
#                 "igst": round(data['total_igst'], 2),
#                 "cgst": round(data['total_cgst'], 2),
#                 "sgst": round(data['total_sgst'], 2),
#             }
#         }

#         return json.dumps({"gstr3b_data_for_download": gstr3b_portal_data, "analytics_for_chat": analytics_summary}, indent=2)
#     except Exception as e:
#         logging.error(f"Error in get_gstr3b_report: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": f"Could not generate GSTR-3B report. Details: {e}"})


# # --- General Purpose / Fallback Tool ---

# class BuyerUpdateArgs(BaseModel):
#     name: str = Field(..., description="The name of the buyer to update.")
#     email: Optional[str] = Field(None, description="The new email address for the buyer.")
#     phone_no: Optional[str] = Field(None, description="The new phone number for the buyer.")
#     address: Optional[str] = Field(None, description="The new address for the buyer.")
#     gstin: Optional[str] = Field(None, description="The new GSTIN for the buyer.")

# def update_buyer_details(user_id: str, args: BuyerUpdateArgs) -> str:
#     """
#     Use to update a specific buyer's contact information (email, phone, address, etc.).
#     You must provide the buyer's name. Only include the fields you want to change.
#     """
#     try:
#         update_fields = args.model_dump(exclude_unset=True, exclude={'name'})
#         if not update_fields:
#             return json.dumps({"status": "error", "message": "No new information was provided to update."})

#         # Construct the SET part of the SQL query dynamically
#         set_clause = ", ".join([f"{key} = %s" for key in update_fields.keys()])
#         params = list(update_fields.values()) + [user_id, args.name]
        
#         query = f"UPDATE buyers_record SET {set_clause} WHERE user_id = %s AND name ILIKE %s RETURNING id;"
        
#         result = db_manager.execute_query(query, tuple(params))

#         if not result:
#             return json.dumps({"status": "not_found", "message": f"Could not find buyer '{args.name}' to update."})

#         return json.dumps({"status": "success", "message": f"Successfully updated details for {args.name}."})
#     except Exception as e:
#         logging.error(f"Error in update_buyer_details: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": "An error occurred while updating buyer details."})

# from langchain_community.agent_toolkits import create_sql_agent
# from langchain_community.utilities import SQLDatabase

# # This is the new, fixed function
# async def answer_database_question(
#     user_id: str, 
#     llm,  # This will be injected by the handler
#     query: str  # The agent will send {"query": "..."}
# ) -> str:
#     """
#     Use this as a fallback for complex questions about your data that are not 
#     covered by other specific tools. Input must be a JSON string with a "query" key.
#     e.g., {"query": "How many buyers do I have?"}
#     """
    
#     # --- FIX: Create the 'db' object INSIDE the function ---
#     # We use the SAME connection string as your db_pool
#     try:
#         if not DB_CONNECTION_STRING:
#              return json.dumps({"status": "error", "message": "Database connection string is not configured."})
        
#         # This is the LangChain-specific database object
#         db = SQLDatabase.from_uri(DB_CONNECTION_STRING) 
#     except Exception as e:
#         logging.error(f"Failed to create SQLDatabase object: {e}")
#         return json.dumps({"status": "error", "message": f"The database connection is not configured correctly: {e}"})
#     # --- END OF FIX ---

#     SQL_AGENT_SUFFIX = f"""Begin!

# User Question: {{input}}
# Thought: I should query the schema of the relevant tables.
# {{agent_scratchpad}}"""

#     try:
#         # Create the agent that will answer the question
#         sql_agent_executor = create_sql_agent(
#             llm=llm,
#             db=db, # Use the LangChain db object
#             agent_type="openai-tools",
#             verbose=True,
#             check_query_syntax=False, # Disables the buggy checker
#             extra_prompt_messages=[
#                 SystemMessage(
#                     content=f"""
#                     You are an expert SQL analyst. You MUST filter every query
#                     by the user's ID. 
#                     The user's ID is: {user_id}
                    
#                     For example:
#                     - ... WHERE user_id = '{user_id}'
#                     - ... AND user_id = '{user_id}'
                    
#                     Never query data without this filter.
#                     """
#                 )
#             ],
#             suffix=SQL_AGENT_SUFFIX
#         )
#     except Exception as e:
#         return json.dumps({"status": "error", "message": f"Failed to create SQL agent: {e}"})

#     try:
#         # Run the agent
#         result = await sql_agent_executor.ainvoke({"input": query})
#         return json.dumps({"status": "success", "response": result.get("output")})
    
#     except Exception as e:
#         return json.dumps({"status": "error", "message": f"Error during SQL agent execution: {e}"})
        
# # def get_buyer_purchase_history(user_id: str, buyer_name: str) -> str:
# #     """
# #     Use to get a specific customer's complete purchase history, including their lifetime
# #     spending, total invoices, and a list of their most recent transactions with status.
# #     This is the primary tool for any question about a specific customer's activity.

# #     Args:
# #         user_id (str): The ID of the current user.
# #         buyer_name (str): The full or partial name of the buyer to search for.

# #     Returns:
# #         str: A JSON string containing the detailed purchase history or a not-found message.
# #     """
# #     try:
# #         # This single, powerful query gathers all required information efficiently.
# #         # --- FIX IS HERE: Removed the erroneous closing parenthesis that caused the crash ---
# #         query = """
# #             WITH BuyerInvoiceSummary AS (
# #                 SELECT
# #                     br.id,
# #                     br.name,
# #                     COUNT(DISTINCT ir.id) as invoice_count,
# #                     SUM(it.quantity * it.rate) as total_spent,
# #                     MAX(ir.date) as last_purchase_date
# #                 FROM buyers_record br
# #                 JOIN invoices_record ir ON br.id = ir.buyer_id
# #                 JOIN items_record it ON ir.id = it.invoice_id
# #                 WHERE br.user_id = %s AND br.name ILIKE %s
# #                 GROUP BY br.id, br.name
# #             ),
# #             RecentInvoices AS (
# #                 SELECT
# #                     ir.buyer_id,
# #                     json_agg(
# #                         json_build_object(
# #                             'number', ir.number,
# #                             'date', ir.date,
# #                             'status', ir.status,
# #                             'amount', sub.total
# #                         ) ORDER BY ir.date DESC
# #                     ) as recent_invoices
# #                 FROM invoices_record ir
# #                 JOIN (
# #                     SELECT invoice_id, SUM(quantity * rate) as total
# #                     FROM items_record
# #                     GROUP BY invoice_id
# #                 ) as sub ON ir.id = sub.invoice_id
# #                 WHERE ir.buyer_id IN (SELECT id FROM BuyerInvoiceSummary)
# #                 GROUP BY ir.buyer_id
# #             )
# #             SELECT
# #                 bis.name as buyer_name,
# #                 bis.total_spent,
# #                 bis.invoice_count,
# #                 bis.last_purchase_date,
# #                 ri.recent_invoices
# #             FROM BuyerInvoiceSummary bis
# #             LEFT JOIN RecentInvoices ri ON bis.id = ri.buyer_id;
# #         """
# #         results = db_manager.execute_query(query, (user_id, f"%{buyer_name.strip()}%"))

# #         if not results:
# #             return json.dumps({"status": "not_found", "message": f"No purchase history found for a buyer named '{buyer_name}'."})

# #         history = results[0]
        
# #         # --- Formatting Improvements for a cleaner AI response ---
# #         total_spent = float(history.get('total_spent') or 0)
# #         last_purchase_obj = history.get('last_purchase_date')
        
# #         formatted_history = {
# #             "buyer_name": history.get('buyer_name'),
# #             "total_spent_formatted": f"₹{total_spent:,.2f}",
# #             "invoice_count": int(history.get('invoice_count') or 0),
# #             "last_purchase_date_formatted": last_purchase_obj.strftime('%B %d, %Y') if last_purchase_obj else "N/A"
# #         }

# #         formatted_invoices = []
# #         if history.get('recent_invoices'):
# #             for inv in history['recent_invoices'][:5]: # Limit to 5 recent invoices
# #                 # Handle date parsing safely
# #                 try:
# #                     inv_date_obj = datetime.strptime(inv['date'], '%Y-%m-%d').date()
# #                     date_str = inv_date_obj.strftime('%b %d, %Y')
# #                 except (ValueError, TypeError):
# #                     date_str = inv.get('date', 'N/A')

# #                 formatted_invoices.append({
# #                     "number": inv.get('number', 'N/A'),
# #                     "status": str(inv.get('status', 'N/A')).title(),
# #                     "date_formatted": date_str,
# #                     "amount_formatted": f"₹{float(inv.get('amount', 0)):,.2f}"
# #                 })
        
# #         formatted_history["recent_invoices"] = formatted_invoices
        
# #         return json.dumps({"status": "found", "history": formatted_history})
# #     except Exception as e:
# #         # Log the detailed error for debugging
# #         logging.error(f"Error in get_buyer_purchase_history: {e}", exc_info=True)
# #         # Return a user-friendly error to the agent
# #         return json.dumps({"status": "error", "message": "An unexpected error occurred while retrieving the purchase history."})
    

# import json
# import logging
# from datetime import datetime
# from decimal import Decimal, ROUND_HALF_UP # Import Decimal and rounding mode

# # Assuming _parse_time_period and db_manager are defined elsewhere

# def get_buyer_purchase_history(user_id: str, buyer_name: str, limit: int = 5) -> str:
#     """
#     Gets a specific customer's purchase history using fuzzy name matching (pg_trgm),
#     including lifetime spending (inc. GST), total invoices, and recent transactions.

#     Args:
#         user_id: The ID of the current user.
#         buyer_name: The name of the buyer to search for (handles typos/partial names).
#         limit: Max number of recent invoices to return.
#     """
#     try:
#         search_term = buyer_name.strip()
#         if not search_term:
#              return json.dumps({"status": "error", "message": "Buyer name cannot be empty."})

#         # --- MODIFIED QUERY ---
#         # 1. Finds the SINGLE BEST matching buyer using word_similarity > threshold
#         # 2. Then joins to get their history
#         # 3. Includes GST in calculations
#         query = """
#             WITH BestMatchBuyer AS (
#                 SELECT
#                     id,
#                     name,
#                     word_similarity(name, %s) AS score
#                 FROM buyers_record
#                 WHERE
#                     user_id = %s
#                     AND word_similarity(name, %s) > 0.4 -- Similarity threshold (adjust if needed)
#                 ORDER BY score DESC
#                 LIMIT 1 -- Select only the top match
#             ),
#             BuyerInvoiceSummary AS (
#                 SELECT
#                     bmb.id,
#                     bmb.name,
#                     COUNT(DISTINCT ir.id) as invoice_count,
#                     SUM(it.quantity::numeric * it.rate::numeric * (1 + COALESCE(it.gst_rate, 0) / 100.0)) as total_spent_inc_gst,
#                     MAX(ir.date) as last_purchase_date
#                 FROM BestMatchBuyer bmb -- Start join from the best match
#                 JOIN invoices_record ir ON bmb.id = ir.buyer_id
#                 JOIN items_record it ON ir.id = it.invoice_id
#                 GROUP BY bmb.id, bmb.name
#             ),
#             RecentInvoices AS (
#                 SELECT
#                     ir.buyer_id,
#                     json_agg(
#                         json_build_object(
#                             'number', ir.number,
#                             'date', ir.date,
#                             'status', ir.status,
#                             'amount_inc_gst', sub.total_inc_gst
#                         ) ORDER BY ir.date DESC
#                     ) as recent_invoices
#                 FROM invoices_record ir
#                 JOIN (
#                     SELECT
#                         invoice_id,
#                         SUM(quantity::numeric * rate::numeric * (1 + COALESCE(gst_rate, 0) / 100.0)) as total_inc_gst
#                     FROM items_record
#                     GROUP BY invoice_id
#                 ) as sub ON ir.id = sub.invoice_id
#                 WHERE ir.buyer_id IN (SELECT id FROM BestMatchBuyer) -- Only for the matched buyer
#                 GROUP BY ir.buyer_id
#             )
#             SELECT
#                 bis.name as buyer_name, -- Return the actual name found
#                 bis.total_spent_inc_gst,
#                 bis.invoice_count,
#                 bis.last_purchase_date,
#                 ri.recent_invoices
#             FROM BuyerInvoiceSummary bis
#             LEFT JOIN RecentInvoices ri ON bis.id = ri.buyer_id;
#         """
#         # Pass search term three times for the similarity checks
#         results = db_manager.execute_query(query, (search_term, user_id, search_term))

#         if not results:
#             return json.dumps({"status": "not_found", "message": f"No close match or purchase history found for a buyer like '{search_term}'."})

#         # --- Formatting (same as before) ---
#         history = results[0]
#         quantizer = Decimal("0.01") # For rounding

#         total_spent_dec = (Decimal(history.get('total_spent_inc_gst') or 0)).quantize(quantizer, ROUND_HALF_UP)
#         last_purchase_obj = history.get('last_purchase_date')

#         formatted_history = {
#             "buyer_name": history.get('buyer_name'), # Show the name that was actually found
#             "total_spent_formatted": f"₹{total_spent_dec:,.2f}",
#             "invoice_count": int(history.get('invoice_count') or 0),
#             "last_purchase_date_formatted": last_purchase_obj.strftime('%B %d, %Y') if last_purchase_obj else "N/A"
#         }

#         formatted_invoices = []
#         if history.get('recent_invoices'):
#             for inv in history['recent_invoices'][:limit]:
#                 try:
#                     inv_date_obj = inv.get('date')
#                     if isinstance(inv_date_obj, str):
#                        inv_date_obj = datetime.strptime(inv_date_obj, '%Y-%m-%d').date()
#                     date_str = inv_date_obj.strftime('%b %d, %Y') if inv_date_obj else 'N/A'
#                 except (ValueError, TypeError):
#                     date_str = str(inv.get('date', 'N/A'))

#                 amount_dec = (Decimal(inv.get('amount_inc_gst', 0))).quantize(quantizer, ROUND_HALF_UP)

#                 formatted_invoices.append({
#                     "number": inv.get('number', 'N/A'),
#                     "status": str(inv.get('status', 'N/A')).title(),
#                     "date_formatted": date_str,
#                     "amount_formatted": f"₹{amount_dec:,.2f}"
#                 })

#         formatted_history["recent_invoices"] = formatted_invoices

#         return json.dumps({"status": "found", "history": formatted_history})

#     except (psycopg2.Error, ConnectionError) as db_err:
#          # Check if the specific error is because pg_trgm isn't enabled
#         if "function word_similarity" in str(db_err):
#              logging.warning(f"pg_trgm extension not enabled for user {user_id}.")
#              return json.dumps({"status": "error",
#                                 "message": "Fuzzy search is not enabled on the database. Please ask the administrator to run 'CREATE EXTENSION pg_trgm;'."})
#         logging.error(f"Database error in get_buyer_purchase_history_fuzzy for user {user_id}, buyer '{buyer_name}': {db_err}", exc_info=True)
#         return json.dumps({"status": "error", "message": "Could not connect to or query the database."})

#     except Exception as e:
#         logging.error(f"Unexpected error in get_buyer_purchase_history_fuzzy: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": "An unexpected error occurred."})
    
# # --- 2. Financial & Accounting Tools ---

# def log_business_expense(
#     user_id: str,
#     amount: float,
#     description: str,
#     category: str,
#     payment_method: str = 'Other', # Keep argument if needed elsewhere, but don't save to DB
#     tags: Optional[List[str]] = None # <-- Added tags argument
# ) -> str:
#     """
#     Use to record a business expense (debit) in the ledger.
#     Supports optional tags for categorization.

#     Args:
#         user_id: The ID of the current user.
#         amount: The positive amount of the expense.
#         description: A brief description of the expense.
#         category: The main category (e.g., 'Rent', 'Utilities').
#         payment_method: (Informational, not saved in ledger_entries) How it was paid.
#         tags: Optional list of text tags for further classification.

#     Returns:
#         JSON string confirming success or detailing the error.
#     """
#     try:
#         if amount <= 0:
#             return json.dumps({"status": "error", "message": "Expense amount must be positive."})

#         # --- MODIFIED QUERY ---
#         # 1. Removed payment_method from INSERT columns
#         # 2. Added tags column
#         query = """
#             INSERT INTO ledger_entries (user_id, amount, description, type, category, tags)
#             VALUES (%s, %s, %s, 'debit', %s, %s) -- Now 6 placeholders
#             RETURNING id;
#         """
#         # Ensure tags is None or a list for the database driver
#         db_tags = tags if tags else None
#         params = (user_id, amount, description, category, db_tags)

#         result = db_manager.execute_query(query, params)

#         if not result or not result[0].get('id'):
#             # This indicates the insert didn't return an ID, even if no error was raised
#             raise Exception("Database insert did not return the expected ID.")

#         return json.dumps({
#             "status": "success",
#             "message": f"Successfully logged expense of ₹{amount:,.2f} for '{description}'."
#         })

#     # Catch specific database errors
#     except (psycopg2.Error, ConnectionError) as db_err:
#         logging.error(f"Database error logging expense for user {user_id}: {db_err}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": f"Database error: Could not log the expense. Details: {db_err}"
#         })
#     except Exception as e:
#         # Catch any other unexpected errors
#         logging.error(f"Unexpected error logging expense for user {user_id}: {e}", exc_info=True)
#         return json.dumps({
#             "status": "error",
#             "message": f"An unexpected error occurred: {e}"
#         })

# def get_profit_and_loss_summary(user_id: str, time_period: str) -> str:
#     """
#     A high-level tool to provide a profit and loss summary for a given period.
#     It calculates total income from sales and total expenses from the ledger to find the net profit.
    
#     Args:
#         user_id (str): The ID of the current user.
#         time_period (str): The time frame to analyze (e.g., "this month", "last quarter").

#     Returns:
#         str: A JSON string with a summary of income, expenses, and net profit.
#     """
#     try:
#         start_date, end_date = _parse_time_period(time_period)
        
#         # 1. Get Total Income (Credit) from sales
#         income_query = """
#             SELECT COALESCE(SUM(it.quantity * it.rate), 0) as total_income
#             FROM invoices_record ir
#             JOIN items_record it ON ir.id = it.invoice_id
#             WHERE ir.user_id = %s AND ir.date BETWEEN %s AND %s;
#         """
#         income_result = db_manager.execute_query(income_query, (user_id, start_date, end_date))
#         total_income = float(income_result[0]['total_income']) if income_result else 0.0

#         # 2. Get Total Expenses (Debit) from the ledger
#         expense_query = """
#             SELECT COALESCE(SUM(amount), 0) as total_expenses
#             FROM ledger_entries
#             WHERE user_id = %s AND type = 'debit' AND created_at::date BETWEEN %s AND %s;
#         """
#         expense_result = db_manager.execute_query(expense_query, (user_id, start_date, end_date))
#         total_expenses = float(expense_result[0]['total_expenses']) if expense_result else 0.0
        
#         # 3. Calculate Net Profit
#         net_profit = total_income - total_expenses

#         summary = {
#             "time_period": time_period,
#             "total_income": f"₹{total_income:,.2f}",
#             "total_expenses": f"₹{total_expenses:,.2f}",
#             "net_profit": f"₹{net_profit:,.2f}"
#         }
        
#         return json.dumps({"status": "success", "summary": summary})
#     except Exception as e:
#         logging.error(f"Error in get_profit_and_loss_summary: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": "Could not generate P&L summary."})




# # --- 4. Automation & Scheduling Tools ---

# def schedule_payment_reminder(user_id: str, invoice_no: str, reminder_date: str) -> str:
#     """
#     Schedules an automated payment reminder to be sent for an invoice on a specific future date.
#     This requires a background worker process to actually send the emails.

#     Args:
#         user_id (str): The ID of the current user.
#         invoice_no (str): The number of the invoice to send a reminder for.
#         reminder_date (str): The date when the reminder should be sent (e.g., "2025-10-15").

#     Returns:
#         str: A JSON string confirming that the reminder has been scheduled.
#     """
#     try:
#         # Validate and resolve the invoice first
#         invoice_details = _resolve_invoice_details(user_id, invoice_no)
#         invoice_id = invoice_details['id']

#         # The payload contains all the data the background worker will need
#         task_payload = {
#             "invoice_id": invoice_id,
#             "invoice_number": invoice_details['number'],
#             "recipient_name": invoice_details['name'],
#             "recipient_email": invoice_details['email'],
#         }
        
#         # Insert a job into a dedicated scheduling table in your database
#         query = """
#             INSERT INTO scheduled_tasks (user_id, task_type, payload, run_at, status)
#             VALUES (%s, 'payment_reminder', %s, %s, 'pending');
#         """
#         db_manager.execute_query(query, (user_id, json.dumps(task_payload), reminder_date))

#         return json.dumps({
#             "status": "success",
#             "message": f"A payment reminder for invoice {invoice_no} has been scheduled for {reminder_date}."
#         })
#     except ValueError as ve:
#         return json.dumps({"status": "error", "message": str(ve)}) # e.g., Invoice not found
#     except Exception as e:
#         logging.error(f"Error in schedule_payment_reminder: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": "Could not schedule the reminder."})


# from langchain_core.tools import tool
# from langchain_core.messages import SystemMessage
# from typing import Optional, List, Dict, Any

# def search_invoices(
#     user_id: str,
#     time_period: Optional[str] = None,
#     buyer_name: Optional[str] = None,
#     invoice_number: Optional[str] = None,
#     invoice_numbers: Optional[List[str]] = None, # 👈 --- 1. ADD THIS NEW ARGUMENT
#     status: Optional[str] = None,
#     sort_by: Optional[str] = 'date',
#     order: Optional[str] = 'desc',
#     limit: int = 10
# ) -> str:
#     """
#     Searches for and lists specific invoices based on criteria.
#     This is the main tool to use when the user asks to 'find', 'list', or 'get'
#     specific invoices. To find the 'last' or 'latest' invoice,
#     use sort_by='date', order='desc', and limit=1.

#     Args:
#         user_id: The ID of the current user.
#         time_period: Time frame (e.g., "this month", "last year").
#         buyer_name: The name of the buyer to filter by (partial match).
#         invoice_number: A single invoice number to search for (partial match).
#         invoice_numbers: A list of exact invoice numbers to retrieve.
#         status: The invoice status. Must be 'paid', 'unpaid', or 'pending'.
#         sort_by: Column to sort by. Valid options are 'date' or 'total_amount'.
#         order: Sort order. Valid options are 'asc' (ascending) or 'desc' (descending).
#         limit: The maximum number of invoices to return.
#     """
#     try:
#         base_query = """
#             SELECT 
#                 ir.number, ir.date, ir.due_date, ir.status, ir.invoice_url,
#                 br.name as buyer_name,
#                 COALESCE(SUM(it.quantity::numeric * it.rate::numeric * (1 + COALESCE(it.gst_rate, 0) / 100.0)), 0) as total_amount
#             FROM invoices_record ir
#             LEFT JOIN buyers_record br ON ir.buyer_id = br.id
#             LEFT JOIN items_record it ON ir.id = it.invoice_id
#         """
        
#         where_clauses = ["ir.user_id = %s"]
#         params = [user_id]
        
#         if time_period:
#             start_date, end_date = _parse_time_period(time_period)
#             where_clauses.append("ir.date BETWEEN %s AND %s")
#             params.extend([start_date, end_date])

#         if buyer_name:
#             where_clauses.append("br.name ILIKE %s")
#             params.append(f"%{buyer_name.strip()}%")
            
#         # --- 2. ADD THIS LOGIC BLOCK ---
#         if invoice_numbers:
#             # If the agent sends a list, use an 'IN' clause (or = ANY(array))
#             # This is safer as it uses a tuple of parameters
#             where_clauses.append("ir.number IN %s")
#             params.append(tuple(invoice_numbers))
#         elif invoice_number:
#             # Keep the old logic for single partial searches
#             where_clauses.append("ir.number ILIKE %s")
#             params.append(f"%{invoice_number.strip()}%")
#         # --- END OF FIX ---
            
#         if status:
#             valid_statuses = ['paid', 'unpaid', 'pending']
#             if status.lower() not in valid_statuses:
#                 return json.dumps({"status": "error", "message": f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}."})
#             where_clauses.append("ir.status = %s")
#             params.append(status.lower())

#         full_query = f"{base_query} WHERE {' AND '.join(where_clauses)} "
#         full_query += " GROUP BY ir.id, br.id "
        
#         order_col = "ir.date"
#         if sort_by.lower() == 'total_amount':
#             order_col = "total_amount"
            
#         order_dir = "DESC" if order.lower() == 'desc' else "ASC"
        
#         full_query += f" ORDER BY {order_col} {order_dir} "
        
#         # 3. Only apply limit if NOT searching for a specific list
#         if not invoice_numbers:
#             full_query += " LIMIT %s"
#             params.append(limit)

#         full_query += ";"

#         results = db_manager.execute_query(full_query, tuple(params))
        
#         if not results:
#             return json.dumps({"status": "not_found", "message": "No invoices found matching your criteria."})

#         processed_results = _process_invoice_results(results)
        
#         return json.dumps({
#             "status": "success",
#             "count_returned": len(processed_results),
#             "invoices": processed_results
#         })

#     except (psycopg2.Error, ConnectionError) as db_err:
#         logging.error(f"Database error in search_invoices for user {user_id}: {db_err}", exc_info=True)
#         return json.dumps({"status": "error", "message": f"A database error occurred: {db_err}"})
#     except ValueError as e: 
#         logging.warning(f"Value error in search_invoices: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": str(e)})
#     except Exception as e:
#         logging.error(f"Unexpected error in search_invoices for user {user_id}: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": f"An unexpected error occurred: {e}"})
    
# def get_item_sales_summary(
#     user_id: str, 
#     item_name: str, 
#     time_period: Optional[str] = None, 
#     buyer_name: Optional[str] = None,
#     status: Optional[str] = None,        # 👈 --- NEW PARAMETER ---
#     start_date: Optional[str] = None,  # 👈 --- NEW PARAMETER ---
#     end_date: Optional[str] = None      # 👈 --- NEW PARAMETER ---
# ) -> str:
#     """
#     Retrieves the total quantity sold and total sales amount for a specific item,
#     optionally filtered by time, buyer, or invoice status.
    
#     Input MUST be a JSON string, e.g.:
#     {"item_name": "trolley"}
#     {"item_name": "trolley", "time_period": "last month"}
#     {"item_name": "trolley", "buyer_name": "Aatish Pharma"}
#     {"item_name": "trolley", "status": "paid"}
#     {"item_name": "trolley", "start_date": "2025-10-01", "end_date": "2025-10-15"}
#     """
#     try:
#         # --- 1. Base query and parameters ---
#         base_query = """
#             SELECT 
#                 SUM(ir.quantity) AS total_quantity_sold,
#                 SUM(ir.quantity::numeric * ir.rate::numeric * (1 + COALESCE(ir.gst_rate, 0) / 100.0)) AS total_amount_inc_gst
#             FROM items_record AS ir
#             JOIN invoices_record AS inv ON ir.invoice_id = inv.id
#             LEFT JOIN buyers_record AS br ON inv.buyer_id = br.id
#         """
        
#         where_clauses = [
#             "inv.user_id = %s",
#             "ir.name ILIKE %s"
#         ]
#         params = [user_id, f"%{item_name}%"]

#         # --- 2. Dynamically add filters ---
        
#         # --- Date Filters ---
#         if start_date and end_date:
#             # Specific date range takes priority
#             where_clauses.append("inv.date BETWEEN %s AND %s")
#             params.extend([_normalize_date(start_date), _normalize_date(end_date)])
#         elif time_period:
#             try:
#                 # Fallback to time_period
#                 start_date, end_date = _parse_time_period(time_period) 
#                 where_clauses.append("inv.date BETWEEN %s AND %s")
#                 params.extend([start_date, end_date])
#             except ValueError as e:
#                 return json.dumps({"status": "error", "message": str(e)})

#         # --- Buyer Filter ---
#         if buyer_name:
#             where_clauses.append("br.name ILIKE %s")
#             params.append(f"%{buyer_name}%")
            
#         # --- Status Filter ---
#         if status:
#             valid_statuses = ['paid', 'unpaid', 'pending']
#             if status.lower() not in valid_statuses:
#                 return json.dumps({"status": "error", "message": f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}."})
#             where_clauses.append("inv.status = %s")
#             params.append(status.lower())

#         # --- 3. Assemble and run the query ---
#         full_query = f"{base_query} WHERE {' AND '.join(where_clauses)};"
        
#         results = db_manager.execute_query(full_query, tuple(params))
        
#         # --- 4. Process results ---
#         if not results or results[0]['total_quantity_sold'] is None:
#             return json.dumps({
#                 "status": "not_found",
#                 "message": f"No sales data found for items matching '{item_name}' with the specified filters."
#             })

#         raw_summary = results[0]
        
#         clean_summary = {
#             "total_quantity_sold": str(raw_summary.get("total_quantity_sold", 0)),
#             "total_amount_inc_gst": str(raw_summary.get("total_amount_inc_gst", 0.0))
#         }

#         return json.dumps({"status": "success", "summary": clean_summary})

#     except Exception as e:
#         logging.error(f"Error in get_item_sales_summary: {e}", exc_info=True)
#         return json.dumps({"status": "error", "message": str(e)})


"""
Production-level tool implementations for the Vyapari AI assistant.

FIX APPLIED: "JSON String Payload Pattern" + "PDF Data Sanitization"
1. Complex tools accept a single `payload` string containing JSON to prevent Gemini 400/500 errors.
2. _format_data_for_pdf now rigorously sanitizes inputs (converting None to 0.0)
   to prevent "float() argument must be a string or a number" crashes during invoice creation.
"""

import os
import re
import json
import logging
import asyncio
import smtplib
from datetime import datetime, date
from typing import List, Any, Tuple, Dict, Optional, Literal, Union
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote
from decimal import Decimal, ROUND_HALF_UP

# Third-party libraries
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse
from num2words import num2words
from pydantic import ValidationError

# LangChain/LLM Imports
from langchain.tools import tool
from langchain_core.messages import SystemMessage
from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.utilities import SQLDatabase

import dateparser # pip install dateparser
from dateutil.relativedelta import relativedelta
from datetime import datetime, date, timedelta
# --- App-specific Imports ---
from app.core.supabase import get_supabase_admin_client, get_supabase_client
from app.services.embedding import embed_and_store_invoice
from utils.upload_to_storage import upload_file
from app.services.invoice_generator import create_dynamic_invoice

# --- Import Schemas for Internal Validation ---
from app.tools.schema import (
    InvoiceCreateCommand,
    InvoiceUpdateCommands,
    BuyerUpdateArgs,
    InvoiceCreateData,
    InvoiceUpdateData,
    CreateInvoiceDetails,
    CreateBuyer,
    CreateItem,
    UpdateItem,
    UpdateInvoiceDetails,
    UpdateBuyer
)

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
DB_CONNECTION_STRING = os.getenv("SUPABASE_POSTGRES_CONNECTION_STRING")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not DB_CONNECTION_STRING:
    raise ValueError("Database connection string not found.")

try:
    db_pool = psycopg2.pool.ThreadedConnectionPool(1, 20, dsn=DB_CONNECTION_STRING)
    logging.info("✅ DB Threaded Connection Pool Created")
except Exception as e:
    logging.error(f"DB Pool Error: {e}")
    db_pool = None

class DatabaseManager:
    def __init__(self, connection_pool):
        self.pool = connection_pool

    def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        if not self.pool: return []
        
        conn = None
        try:
            # Attempt 1
            conn = self.pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params or ())
                if cursor.description: 
                    result = [dict(row) for row in cursor.fetchall()]
                    conn.commit()
                    return result
                conn.commit()
                return []
        
        except psycopg2.OperationalError as e:
            # This catches "SSL connection closed" or "server closed the connection unexpectedly"
            logging.warning(f"⚠️ DB Connection Dead ({e}). Retrying with fresh connection...")
            
            if conn:
                try:
                    # Throw away the dead connection so it's not reused
                    self.pool.putconn(conn, close=True)
                except Exception: pass
                conn = None
            
            # Attempt 2 (Retry)
            try:
                conn = self.pool.getconn()
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params or ())
                    if cursor.description: 
                        result = [dict(row) for row in cursor.fetchall()]
                        conn.commit()
                        return result
                    conn.commit()
                    return []
            except Exception as retry_err:
                logging.error(f"❌ DB Retry Failed: {retry_err}")
                raise retry_err

        except Exception as e:
            logging.error(f"❌ DB Query Error: {e}")
            if conn: conn.rollback()
            raise

        finally:
            # Always return the connection to the pool if it's still valid-ish
            if conn: self.pool.putconn(conn)

db_manager = DatabaseManager(db_pool)

# --- Helper Functions ---

# def _parse_time_period(time_period: str) -> Tuple[date, date]:
#     """Parses natural language time periods into start/end dates."""
#     today = date.today()
#     tp = time_period.lower().strip().replace('"', '')
    
#     if tp == "today": return today, today
#     if tp == "yesterday": return today - relativedelta(days=1), today - relativedelta(days=1)
#     if tp == "this week": return today - relativedelta(days=today.weekday()), today
#     if tp == "last week":
#         end = today - relativedelta(days=today.weekday() + 1)
#         return end - relativedelta(days=6), end
#     if tp in ("this month", "current month"): return today.replace(day=1), today
#     if tp == "last month":
#         end = today.replace(day=1) - relativedelta(days=1)
#         return end.replace(day=1), end
    
#     # FIX: Handle "whole year" or "this year"
#     if tp in ("this year", "current year", "whole year"): 
#         return today.replace(month=1, day=1), today
#     if tp == "last year":
#         last_year = today.year - 1
#         return date(last_year, 1, 1), date(last_year, 12, 31)
    
#     try:
#         parsed_date = parse(tp).date()
#         return parsed_date, parsed_date
#     except ValueError:
#         logging.warning(f"Could not parse time period '{time_period}'. Defaulting to 'this month'.")
#         return today.replace(day=1), today

# def _normalize_date(value: Any) -> str:
#     if not isinstance(value, str) or not value.strip(): return date.today().isoformat()
#     try: return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#     except (ValueError, TypeError): return date.today().isoformat()

def _normalize_date(value: Any) -> str:
    if not value: return date.today().isoformat()
    try: return datetime.strptime(str(value).strip(), "%Y-%m-%d").date().isoformat()
    except: return date.today().isoformat()

def _parse_time_period(time_period: str) -> Tuple[date, date]:
    """Robust date parsing for 'October', 'Q1', 'Last week', 'This Quarter'."""
    today = date.today()
    tp = time_period.lower().strip().replace('"', '').replace("'", "")
    
    # Handle typos (e.g. 'form' -> 'from')
    tp = tp.replace('form ', 'from ')

    # 0. Explicit Ranges ("from 15 oct to 15 nov", "Jan 1 - Jan 31")
    range_seps = [" to ", " - ", " until ", " through "]
    for sep in range_seps:
        if sep in tp:
            parts = tp.split(sep)
            if len(parts) == 2:
                # Clean up "from" if present in the first part
                start_str = parts[0].replace("from ", "").strip()
                end_str = parts[1].strip()
                
                d1 = dateparser.parse(start_str, settings={'DATE_ORDER': 'DMY', 'PREFER_DATES_FROM': 'past'})
                d2 = dateparser.parse(end_str, settings={'DATE_ORDER': 'DMY', 'PREFER_DATES_FROM': 'past'})
                
                if d1 and d2:
                    return d1.date(), d2.date()

    # 1. Keywords
    if tp == "today": return today, today
    if tp == "yesterday": return today - timedelta(days=1), today - timedelta(days=1)
    if tp in ("this month", "current month"): return today.replace(day=1), today
    if tp == "last month":
        end = today.replace(day=1) - timedelta(days=1)
        return end.replace(day=1), end
    if tp in ("this year", "current year"): return today.replace(month=1, day=1), today

    # 2. Quarters (Explicit Q1-Q4)
    q_match = re.search(r"q([1-4])", tp)
    if q_match:
        quarter = int(q_match.group(1))
        year = today.year # Assume current year
        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2
        start = date(year, start_month, 1)
        # Get last day
        next_m = date(year, end_month, 28) + timedelta(days=4)
        end = next_m - timedelta(days=next_m.day)
        return start, end

    # 3. Relative Quarters ("This Quarter", "Last Quarter")
    if "quarter" in tp:
        current_quarter = (today.month - 1) // 3 + 1
        year = today.year
        
        if "this" in tp or "current" in tp:
            target_q = current_quarter
        elif "last" in tp or "previous" in tp:
            target_q = current_quarter - 1
            if target_q == 0:
                target_q = 4
                year -= 1
        else:
            # Default to current if unclear
            target_q = current_quarter

        start_month = (target_q - 1) * 3 + 1
        start = date(year, start_month, 1)
        
        # Calculate end of quarter
        if target_q == 4:
            end = date(year, 12, 31)
        else:
            next_q_start = date(year, start_month + 3, 1)
            end = next_q_start - timedelta(days=1)
        
        return start, end

    # 4. Explicit Months ("October") using dateparser
    try:
        parsed = dateparser.parse(tp, settings={'PREFER_DAY_OF_MONTH': 'first'})
        if parsed:
            # If it's a month name only, return full month range
            # Heuristic: if user says "October", dateparser gives Oct 1st.
            # We want Oct 1 to Oct 31.
            if parsed.year == today.year and parsed.month != today.month:
                 # It's a past/future month
                 start = parsed.date().replace(day=1)
                 next_month = start + relativedelta(months=1)
                 end = next_month - timedelta(days=1)
                 return start, end
            
            # If input was a specific date range string that dateparser handled (rare without 'to'), return it
            return parsed.date(), parsed.date()
    except: pass

    logging.warning(f"Could not parse robust time period '{time_period}'. Defaulting to 'this month'.")
    return today.replace(day=1), today # Default fallback

def _format_data_for_pdf(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms invoice data into the detailed format required by the PDF generator.
    CRITICAL FIX: Explicitly sanitizes inputs to prevent 'float(NoneType)' errors.
    """
    items = data.get("items", [])
    clean_items = []
    total_amount = 0.0
    
    for item in items:
        # Robust casting: (item.get('x') or 0) ensures None becomes 0 before float conversion
        # This is critical for preventing crashes when DB returns nulls
        qty = float(item.get("quantity") or 0)
        rate = float(item.get("rate") or 0)
        gst_rate = float(item.get("gst_rate") or 0)
        
        # Write back strictly numeric values to the dictionary
        item["quantity"] = qty
        item["rate"] = rate
        item["gst_rate"] = gst_rate
        
        clean_items.append(item)
        total_amount += qty * rate

    data["items"] = clean_items
    data["amount_in_words"] = f"INR {num2words(total_amount, lang='en_IN').title()} Only"
    return data

def _safe_parse_json(payload: Union[str, dict]) -> Dict[str, Any]:
    """Helper to robustly parse JSON from the LLM."""
    if isinstance(payload, dict):
        return payload
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        # Attempt to clean markdown blocks if present
        cleaned = payload.strip().strip("`").replace("json\n", "")
        try:
            return json.loads(cleaned)
        except Exception:
            raise ValueError("Could not decode JSON payload.")

def _process_invoice_results(results: list) -> list:
    if not results: return []
    for row in results:
        total = row.get('total_amount') or 0.0
        row['total_amount'] = round(float(total), 2)
        if 'date' in row and isinstance(row.get('date'), date): row['date'] = row['date'].isoformat()
        if 'due_date' in row and isinstance(row.get('due_date'), date): row['due_date'] = row['due_date'].isoformat()
    return results

def _resolve_invoice_details(user_id: str, invoice_identifier: str) -> Dict[str, Any]:
    invoice_id_query = "SELECT id FROM invoices_record WHERE number = %s AND user_id = %s LIMIT 1;"
    result = db_manager.execute_query(invoice_id_query, (invoice_identifier, user_id))
    
    if not result:
        try:
            int_id = int(invoice_identifier)
            check_query = "SELECT id FROM invoices_record WHERE id = %s AND user_id = %s;"
            if not db_manager.execute_query(check_query, (int_id, user_id)):
                raise ValueError("Invoice ID not found.")
        except (ValueError, TypeError):
            raise ValueError(f"Invoice '{invoice_identifier}' not found.")
    else:
        int_id = result[0]['id']

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

# ==============================================================================
# === LOW-LEVEL HELPERS (Async) ===
# ==============================================================================

async def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
    try:
        supabase = await get_supabase_client()
        response = await supabase.table("invoices_record").select("*, buyers_record(*), items_record(*)").ilike("number", f"%{invoice_number}%").eq("user_id", user_id).maybe_single().execute()
        if not response or not response.data:
            return json.dumps({"status": "not_found", "message": f"No invoice found containing '{invoice_number}'."})
        return json.dumps({"status": "found", "data": response.data}, default=str)
    except Exception as e:
        return json.dumps({"status": "error", "message": f"Error: {e}"})

@tool
async def get_next_invoice_number(user_id: str) -> str:
    """
    used to get the next invoice number
    """
    try:
        supabase = await get_supabase_client()
        response = await supabase.table("invoices_record").select("number").eq("user_id", user_id).order("created_at", desc=True).limit(1).single().execute()
        last_num = "0"
        if response.data and response.data.get("number"):
            match = re.match(r"(\d+)", response.data["number"])
            if match: last_num = match.group(1)
        next_num = int(last_num) + 1
        now = datetime.now()
        fy = f"{now.year - 1}-{(now.year % 100):02d}" if now.month < 4 else f"{now.year}-{(now.year + 1) % 100:02d}"
        return f"{next_num:03d}/{fy}"
    except Exception:
        return f"001/{datetime.now().year}"

async def create_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
    try:
        supabase_admin = await get_supabase_admin_client()
        seller_resp = await supabase_admin.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
        if not seller_resp.data: return json.dumps({"status": "error", "message": "Seller details not found."})
        seller = seller_resp.data

        final_payload = {
            "template": invoice_data.get("template_no", "1"),
            "invoice": invoice_data["invoice"],
            "company": {
                "name": seller.get("name",""), "address": seller.get("address",""), "gstin": seller.get("gstin",""),
                "contact": seller.get("contact",""), "email": seller.get("email",""), "sign_url": seller.get("sign_url",""), "logo_url": seller.get("logo_url", "")
            },
            "buyer": invoice_data["buyer"],
            "items": invoice_data["items"],
            "bank": {"name": seller.get("bank_name",""), "account": seller.get("account_no",""), "branch_ifsc": seller.get("ifsc_code","")},
            "terms_and_conditions": invoice_data.get("terms_and_conditions", [])
        }
        
        is_tax = bool(invoice_data["buyer"].get("gstin"))
        final_payload["invoice"]["title"] = "Tax Invoice" if is_tax else "Retail Invoice"

        # Sanitize and Format Data BEFORE sending to generator (The fix for NoneType error)
        pdf_data = _format_data_for_pdf(final_payload)
        
        # Generate PDF
        pdf_path = await asyncio.to_thread(create_dynamic_invoice, pdf_data)
        
        sanitized_no = re.sub(r"[\/\\]", "-", invoice_data["invoice"]["number"])
        storage_path = f"{user_id}/{sanitized_no}.pdf"
        result = await upload_file(pdf_path, storage_path, user_id, invoice_data["invoice"]["number"])
        
        db_invoice = {
            "number": invoice_data["invoice"]["number"],
            "date": invoice_data["invoice"]["date"],
            "due_date": invoice_data["invoice"]["due_date"],
            "invoice_url": result["url"],
            "title": final_payload["invoice"]["title"],
            "template_no": "1"
        }
        
        resp = await supabase_admin.rpc("save_invoice_atomic", {
            "p_user_id": user_id, "p_seller_id": seller["id"], "p_buyer_payload": invoice_data["buyer"],
            "p_invoice_payload": db_invoice, "p_items_payload": invoice_data["items"]
        }).execute()
        
        if resp.data and resp.data.get("status") == "error": raise Exception(resp.data.get("message"))
        
        if resp.data.get("invoice_id"):
        # Ensure user_id is part of the payload sent to embedding
            final_payload['user_id'] = user_id 
            
            asyncio.create_task(
                # We use asyncio.to_thread is WRONG for async functions.
                # Just call the coroutine directly since it is async now:
                embed_and_store_invoice(resp.data.get("invoice_id"), final_payload)
            )

        return json.dumps({"status": "success", "invoice_number": invoice_data["invoice"]["number"], "url": result["url"]})
    except Exception as e:
        logging.error(f"Create Error: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": f"Failed: {e}"})

async def update_invoice(update_data: Dict[str, Any], user_id: str) -> str:
    pdf_path = None
    try:
        supabase_admin = await get_supabase_admin_client()
        invoice_id = update_data['invoice']['id']
        
        # 1. Fetch existing invoice & seller
        inv_resp = await supabase_admin.table("invoices_record").select("seller_id").eq("id", invoice_id).single().execute()
        if not inv_resp.data: raise Exception("Invoice not found")
        
        seller_resp = await supabase_admin.table("sellers_record").select("*").eq("id", inv_resp.data['seller_id']).single().execute()
        seller = seller_resp.data

        # 2. CONSTRUCT MISSING BANK DATA
        bank_details = {
            "name": seller.get("bank_name", ""),
            "account": seller.get("account_no", ""),
            "branch_ifsc": seller.get("ifsc_code", ""),
            "branch": seller.get("bank_branch", "") 
        }

        # 3. Merge into Payload
        full_pdf_payload = {
            "company": seller, 
            "bank": bank_details,
            **update_data
        }
        
        # 4. Generate PDF
        pdf_data = _format_data_for_pdf(full_pdf_payload)
        pdf_path = await asyncio.to_thread(create_dynamic_invoice, pdf_data)
        
        # 5. Upload to Storage
        sanitized_no = re.sub(r"[\/\\]", "-", update_data['invoice']['number'])
        storage_path = f"{user_id}/{sanitized_no}.pdf"
        
        with open(pdf_path, "rb") as f: content = await asyncio.to_thread(f.read)
        await supabase_admin.storage.from_("invoices").upload(
            path=storage_path, 
            file=content, 
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        url = await supabase_admin.storage.from_("invoices").get_public_url(storage_path)
        
        # 6. Update Database
        update_data['invoice']['invoice_url'] = url
        
        items_list = []
        for item in update_data['items']:
            i = item.copy()
            if 'delete' in i: del i['delete']
            items_list.append(i)

        resp = await supabase_admin.rpc("save_invoice_update_atomic", {
            "p_user_id": user_id,
            "p_invoice_id": invoice_id,
            "p_buyer_payload": update_data['buyer'],
            "p_invoice_payload": update_data['invoice'],
            "p_items_payload": items_list
        }).execute()
        
        if resp.data.get("status") == "error": raise Exception(resp.data.get("message"))
        
        # --- 7. UPDATE EMBEDDINGS (The Fix) ---
        # Add user_id to payload so embedding service can use it for RLS/Filtering
        full_pdf_payload['user_id'] = user_id
        
        # Run embedding in background (fire and forget) so UI response isn't delayed
        asyncio.create_task(
            embed_and_store_invoice(invoice_id, full_pdf_payload)
        )
        # --------------------------------------

        return json.dumps({"status": "success", "message": f"Invoice {update_data['invoice']['number']} updated.", "url": url})

    except Exception as e:
        logging.error(f"Update Error: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": str(e)})
    finally:
        if pdf_path and os.path.exists(pdf_path): os.remove(pdf_path)

async def _internal_search_buyer(user_id: str, name: str) -> str:
    try:
        search = name.strip()
        
        # FIX 1: Swapped arguments in word_similarity (%s, name)
        # FIX 2: Added OR name ILIKE for robust substring matching
        query = """
        SELECT id, name, address, email, gstin, phone_no, state, 
               word_similarity(%s, name) as score 
        FROM buyers_record 
        WHERE user_id = %s 
          AND (word_similarity(%s, name) > 0.3 OR name ILIKE %s)
        ORDER BY score DESC 
        LIMIT 1;
        """
        
        # Use search term 3 times: 
        # 1. word_similarity score
        # 2. word_similarity filter
        # 3. ILIKE filter (wrapped in % %)
        ilike_search = f"%{search}%"
        
        results = await asyncio.to_thread(
            db_manager.execute_query, 
            query, 
            (search, user_id, search, ilike_search)
        )

        if not results: 
            return json.dumps({"status": "not_found", "message": f"No buyer found matching '{name}'"})
            
        return json.dumps({"status": "found", "details": results[0]}, default=str)
        
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

async def _find_product_for_item(user_id: str, item_name: str) -> Optional[Dict[str, Any]]:
    try:
        query = "SELECT id, name, stock, rate, unit, hsn, gst, description, word_similarity(name, %s) as score FROM products WHERE user_id = %s AND word_similarity(name, %s) > 0.3 ORDER BY score DESC LIMIT 1;"
        results = await asyncio.to_thread(db_manager.execute_query, query, (item_name, user_id, item_name))
        if not results: return None
        prod = results[0]
        if 'gst' in prod: 
            prod['gst_rate'] = prod['gst']
            del prod['gst']
        for k in ['rate', 'stock', 'gst_rate', 'score']:
            if k in prod and prod[k] is not None: prod[k] = float(prod[k])
        return prod
    except Exception: return None

async def _get_item_details_from_history(user_id: str, item_name: str) -> Optional[Dict[str, Any]]:
    try:
        query = "SELECT i.name, i.rate, i.unit, i.hsn, i.gst_rate, i.description, word_similarity(i.name, %s) as score FROM items_record i JOIN invoices_record ir ON i.invoice_id = ir.id WHERE ir.user_id = %s AND word_similarity(i.name, %s) > 0.3 ORDER BY score DESC, i.id DESC LIMIT 1;"
        results = await asyncio.to_thread(db_manager.execute_query, query, (item_name, user_id, item_name))
        if not results: return None
        item = results[0]
        for k in ['rate', 'gst_rate', 'score']:
            if k in item and item[k] is not None: item[k] = float(item[k])
        return item
    except Exception: return None

# ==============================================================================
# === SMART WORKFLOW TOOLS (PAYLOAD STRING FIX) ===
# ==============================================================================

@tool
async def run_invoice_creation_workflow(user_id: str, payload: str) -> str:
    """
    REQUIRED: Call this tool to SAVE the invoice to the database. 
    The AI should never output the invoice JSON to the user; it must be passed into this tool to be valid.
    payload: A raw JSON string (no markdown)...
    """
    try:
        # 1. Parse & Validate
        data = _safe_parse_json(payload)
        create_cmd = InvoiceCreateCommand.model_validate(data)
        logging.info(f"Workflow: Creation for '{create_cmd.buyer_name}'")

        # 2. Find Buyer
        buyer_json = await _internal_search_buyer(user_id, create_cmd.buyer_name)
        buyer_data = json.loads(buyer_json)
        if buyer_data.get("status") != "found":
            return json.dumps({"status": "validation_failed", "message": f"Buyer '{create_cmd.buyer_name}' not found. Please create them first."})
        buyer_dict = buyer_data.get("details")

        # --- FIX 1: DEFINE BUYER_HAS_GSTIN ---
        buyer_gstin = buyer_dict.get('gstin', '')
        buyer_has_gstin = bool(buyer_gstin and str(buyer_gstin).strip())
        # -------------------------------------

        # 3. Next Invoice Number
        next_num = await get_next_invoice_number(user_id)

        # 4. Smart Fill Items
        final_items = []
        for item in create_cmd.items:
            item_data = item.model_dump()

            # Description Logic (Correct)
            item_data['description'] = item_data.get('description') or ""
            
            # Rate Logic
            if not item_data.get('rate') or float(item_data['rate']) == 0:
                product = await _find_product_for_item(user_id, item.name)
                if product:
                    item_data['rate'] = float(product['rate'])
                    item_data['product_id'] = product['id']
                    item_data['gst_rate'] = float(product.get('gst_rate', 0))
                    item_data['unit'] = product.get('unit', item_data.get('unit', 'pcs'))
                else:
                    history = await _get_item_details_from_history(user_id, item.name)
                    if history:
                        item_data['rate'] = float(history['rate'])
                        item_data['gst_rate'] = float(history.get('gst_rate', 0))
                        item_data['unit'] = history.get('unit', item_data.get('unit', 'pcs'))
                    else:
                        return json.dumps({"status": "validation_failed", "message": f"Cannot find price for '{item.name}'. Please specify it."})
            
            # --- GST RULES LOGIC ---
            if not buyer_has_gstin:
                # Rule 1: No Buyer GSTIN -> No Tax, No HSN
                item_data['gst_rate'] = 0
                item_data['hsn'] = ""
            else:
                # Rule 2: Buyer has GSTIN -> HSN and GST are Mandatory
                if not item_data.get('hsn') or not str(item_data.get('hsn')).strip():
                    # Try fallback
                    prod = await _find_product_for_item(user_id, item.name)
                    if prod and prod.get('hsn'):
                        item_data['hsn'] = prod['hsn']
                    else:
                        return json.dumps({"status":"validation_failed","message":f"HSN required for item '{item.name}' because buyer has GSTIN."})
                
                if item_data.get('gst_rate') is None or float(item_data.get('gst_rate', 0)) == 0:
                    # Try fallback
                    prod = prod if ('prod' in locals() and prod) else await _find_product_for_item(user_id, item.name)
                    if prod and prod.get('gst_rate'):
                        item_data['gst_rate'] = float(prod['gst_rate'])
                    else:
                        return json.dumps({"status":"validation_failed","message":f"GST% required for item '{item.name}' because buyer has GSTIN."})

            # Final cleanup
            item_data['gst_rate'] = float(item_data.get('gst_rate') or 0)
            item_data['quantity'] = float(item_data.get('quantity') or 1)
            item_data['rate'] = float(item_data.get('rate') or 0)
            item_data['unit'] = item_data.get('unit') or "pcs"

            final_items.append(CreateItem(**item_data))

        # 5. Build Payload (Standard)
        inv_date = _normalize_date(create_cmd.date)
        due_date = _normalize_date(create_cmd.due_date)
        
        inv_data = InvoiceCreateData(
            invoice=CreateInvoiceDetails(number=next_num, date=inv_date, due_date=due_date),
            buyer=CreateBuyer(**buyer_dict),
            items=final_items
        )

        return await create_invoice(user_id=user_id, invoice_data=inv_data.model_dump())

    except ValidationError as ve:
        return json.dumps({"status": "error", "message": f"Schema Error: {ve}"})
    except Exception as e:
        logging.error(f"Workflow Error: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": str(e)})

@tool
async def run_invoice_update_workflow(user_id: str, invoice_number: str, payload: str) -> str:
    """
    Update an existing invoice.
    payload: JSON string with {"gst": {...}, "details": {...}, "line_items": [...]}
    """
    try:
        data = _safe_parse_json(payload)
        updates_cmd = InvoiceUpdateCommands.model_validate(data)
        
        # 1. Load Existing
        load_json = await load_invoice_for_edit(invoice_number, user_id)
        load_res = json.loads(load_json)
        if load_res.get("status") != "found": return load_json
        loaded = load_res.get("data")

        # 2. Map to Models
        inv_rec = loaded['invoices_record'] if 'invoices_record' in loaded else loaded
        inv_details = UpdateInvoiceDetails(id=inv_rec['id'], number=inv_rec['number'], date=str(inv_rec['date']), due_date=str(inv_rec['due_date']), title=inv_rec.get('title', 'Tax Invoice'))
        
        b_rec = loaded.get('buyers_record')
        buyer_details = UpdateBuyer(name=b_rec['name'], address=b_rec['address'], state=b_rec.get('state'), gstin=b_rec.get('gstin'), phone_no=b_rec.get('phone_no'), email=b_rec.get('email'))
        
        item_details = [UpdateItem(**i) for i in loaded.get('items_record', [])]

        # 3. Apply Updates
        if updates_cmd.gst and updates_cmd.gst.action == 'apply':
            for i in item_details: i.gst_rate = updates_cmd.gst.rate
            
        if updates_cmd.details:
            if updates_cmd.details.due_date: inv_details.due_date = updates_cmd.details.due_date
            if updates_cmd.details.date: inv_details.date = updates_cmd.details.date

        # 4. Process Line Items
        if updates_cmd.line_items:
            existing_map = {i.name.lower(): i for i in item_details}
            final_list = []
            
            for cmd in updates_cmd.line_items:
                if cmd.action == 'add' and cmd.item:
                    new_d = cmd.item.model_dump()
                    
                    # --- FIX 2: Handle Description in Updates too ---
                    new_d['description'] = new_d.get('description') or ""
                    # ------------------------------------------------

                    if not new_d.get('rate'):
                        prod = await _find_product_for_item(user_id, new_d['name'])
                        if prod:
                            new_d['rate'] = prod['rate']
                            new_d['product_id'] = prod['id']
                            new_d['gst_rate'] = prod.get('gst_rate', 0)
                    
                    # Note: You might want to check 'buyer_details.gstin' here to enforce rules like above
                    # but usually, updates are more flexible.
                    
                    final_list.append(UpdateItem(**{**new_d, 'id': None}))
                
                elif cmd.action == 'remove' and cmd.identifier:
                    if cmd.identifier.lower() in existing_map:
                        existing_map[cmd.identifier.lower()].delete = True
                
                elif cmd.action == 'update' and cmd.identifier and cmd.changes:
                    if cmd.identifier.lower() in existing_map:
                        target = existing_map[cmd.identifier.lower()]
                        changes = cmd.changes.model_dump(exclude_unset=True)
                        for k,v in changes.items(): setattr(target, k, v)

            for i in existing_map.values(): final_list.append(i)
            item_details = final_list

        # 5. Execute Update
        final_payload = InvoiceUpdateData(invoice=inv_details, buyer=buyer_details, items=item_details)
        return await update_invoice(final_payload.model_dump(), user_id)

    except ValidationError as ve:
        return json.dumps({"status": "error", "message": f"Schema Error: {ve}"})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
    
@tool
def update_buyer_details(user_id: str, payload: str) -> str:
    """
    Updates a buyer's details.
    payload: JSON string containing {"name": "...", "email": "...", ...}
    """
    try:
        data = _safe_parse_json(payload)
        args = BuyerUpdateArgs.model_validate(data)

        update_fields = args.model_dump(exclude_unset=True, exclude={'name'})
        if not update_fields: return json.dumps({"status": "error", "message": "No info provided."})
        
        set_clause = ", ".join([f'"{key}" = %s' for key in update_fields.keys()])
        params = list(update_fields.values()) + [user_id, args.name]
        
        res = db_manager.execute_query(f'UPDATE buyers_record SET {set_clause} WHERE user_id = %s AND name ILIKE %s RETURNING id;', tuple(params))
        if not res: return json.dumps({"status": "not_found", "message": "Buyer not found."})
        return json.dumps({"status": "success", "message": "Buyer updated."})
    except ValidationError as ve:
        return json.dumps({"status": "error", "message": f"Schema Error: {ve}"})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# ==============================================================================
# === STANDALONE TOOLS ===
# ==============================================================================

@tool
def get_sales_summary(user_id: str, time_period: Optional[str] = None) -> str:
    """Gets high-level sales summary for a period."""
    try:
        s, e = _parse_time_period(time_period or "this month")
        
        query = """
        WITH T AS (
            SELECT ir.id, 
                   COALESCE(SUM(it.quantity*it.rate),0) as t, 
                   COALESCE(SUM(it.quantity*it.rate*COALESCE(it.gst_rate,0)/100.0),0) as g 
            FROM invoices_record ir 
            LEFT JOIN items_record it ON ir.id=it.invoice_id 
            WHERE ir.user_id=%s AND ir.date BETWEEN %s AND %s 
            GROUP BY ir.id
        ) 
        SELECT COUNT(id) as c, SUM(t+g) as rev, SUM(g) as gst FROM T;
        """
        
        res = db_manager.execute_query(query, (user_id, s, e))
        
        # If query returns nothing or count is 0
        if not res or res[0]['c'] == 0: 
            return json.dumps({
                "status": "success",
                "summary": {
                    "total_revenue": "₹0.00",
                    "total_gst": "₹0.00",
                    "count": 0
                }
            })
        
        r = res[0]
        
        # --- FIX: Explicitly handle None values ---
        # If no sales, SQL SUM returns None. We must convert None -> 0 before Decimal()
        revenue = r['rev'] if r['rev'] is not None else 0
        gst = r['gst'] if r['gst'] is not None else 0
        # ------------------------------------------

        return json.dumps({
            "status": "success",
            "summary": {
                "total_revenue": f"₹{Decimal(revenue):,.2f}",
                "total_gst": f"₹{Decimal(gst):,.2f}",
                "count": r['c']
            }
        })
        
    except Exception as e: 
        return json.dumps({"status": "error", "message": str(e)})

@tool
def get_all_buyers(user_id: str, page: int = 1, page_size: int = 25) -> str:
    """Gets a paginated list of all buyers."""
    try:
        # DEBUG LOG
        logging.info(f"🔍 Fetching buyers for User ID: {user_id}")
        off = (page - 1) * page_size
        res = db_manager.execute_query("SELECT name, address, email, gstin, phone_no FROM buyers_record WHERE user_id = %s ORDER BY name ASC LIMIT %s OFFSET %s;", (user_id, page_size, off))
        if not res: return json.dumps({"status": "not_found"})
        return json.dumps({"status": "found", "buyers": res})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
async def search_existing_buyer(user_id: str, name: str) -> str:
    """Fuzzy searches for a buyer."""
    return await _internal_search_buyer(user_id, name)

@tool
def get_top_performing_entities(user_id: str, time_period: str, entity_type: str, limit: int = 5) -> str:
    """Finds top products/buyers by revenue."""
    try:
        s, e = _parse_time_period(time_period)
        col = "it.name" if entity_type.lower() == "product" else "br.name"
        join = "JOIN items_record it ON ir.id=it.invoice_id" if entity_type.lower() == "product" else "JOIN buyers_record br ON ir.buyer_id=br.id JOIN items_record it ON ir.id=it.invoice_id"
        
        q = f"SELECT {col} as name, SUM(it.quantity*it.rate*(1+COALESCE(it.gst_rate,0)/100.0)) as v FROM invoices_record ir {join} WHERE ir.user_id=%s AND ir.date BETWEEN %s AND %s GROUP BY {col} ORDER BY v DESC LIMIT %s;"
        res = db_manager.execute_query(q, (user_id, s, e, limit))
        
        if not res: return json.dumps({"status": "no_data"})
        return json.dumps({"status": "success", "data": [{"name": r['name'], "value": f"₹{Decimal(r['v']):,.2f}"} for r in res]})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_low_stock_alerts(user_id: str) -> str:
    """Finds products with stock <= alert_stock."""
    try:
        res = db_manager.execute_query('SELECT name, stock, alert_stock FROM products WHERE user_id=%s AND stock <= alert_stock;', (user_id,))
        return json.dumps({"status": "low_stock", "items": res} if res else {"status": "ok"})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_product_stock_level(user_id: str, product_name: str) -> str:
    """Gets stock for a specific product."""
    try:
        res = db_manager.execute_query('SELECT name, stock FROM products WHERE user_id=%s AND name ILIKE %s;', (user_id, product_name.strip()))
        return json.dumps({"status": "found", "product": res[0]} if res else {"status": "not_found"})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_ledger_summary(user_id: str, time_period: str) -> str:
    """Gets income vs expenses summary."""
    try:
        s, e = _parse_time_period(time_period)
        res = db_manager.execute_query("SELECT type, COALESCE(SUM(amount),0) as v FROM ledger_entries WHERE user_id=%s AND created_at::date BETWEEN %s AND %s GROUP BY type;", (user_id, s, e))
        summary = {r['type']: float(r['v']) for r in res}
        return json.dumps(summary)
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def send_invoice_via_email(user_id: str, invoice_no: str, email_address: str = None) -> str:
    """Emails an invoice."""
    try:
        details = _resolve_invoice_details(user_id, invoice_no)
        res = db_manager.execute_query("SELECT sender_email, encrypted_sender_password FROM sellers_record WHERE user_id=%s;", (user_id,))
        if not res or not res[0]['sender_email']: return "Sender email not configured."
        
        target = email_address or details['email']
        if not target: return "No recipient email found."
        
        # Dummy password logic - replace with real decryption
        password = "your_password_here" 
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {details['number']}"
        msg["From"] = res[0]['sender_email']
        msg["To"] = target
        msg.attach(MIMEText(f"Link: {details['invoice_url']}", "html"))
        
        with smtplib.SMTP("smtp.gmail.com", 587) as s:
            s.starttls()
            s.login(res[0]['sender_email'], password)
            s.sendmail(res[0]['sender_email'], target, msg.as_string())
        return f"Sent to {target}"
    except Exception as e: return f"Error: {e}"

@tool
def generate_whatsapp_link(user_id: str, invoice_no: str, phone_number: str = None) -> str:
    """Generates a WhatsApp link."""
    try:
        details = _resolve_invoice_details(user_id, invoice_no)
        phone = phone_number or details.get('phone_no')
        if not phone: return "No phone number found."
        clean_phone = "".join(filter(str.isdigit, phone))
        if len(clean_phone) <= 10: clean_phone = "91" + clean_phone[-10:]
        
        # Correctly separated variable construction to avoid f-string issues
        message_text = f"Invoice {details['number']}: {details['invoice_url']}"
        url = f"https://wa.me/{clean_phone}?text={quote(message_text)}"
        
        return f"Link: {url}"
    except Exception as e: return f"Error: {e}"

@tool
def get_gstr3b_report(user_id: str, time_period: str) -> str:
    """Generates GSTR-3B summary."""
    try:
        s, e = _parse_time_period(time_period)
        q = "SELECT SUM(it.quantity*it.rate) as tx, SUM(it.quantity*it.rate*it.gst_rate/100.0) as gst FROM invoices_record ir JOIN items_record it ON ir.id=it.invoice_id WHERE ir.user_id=%s AND ir.date BETWEEN %s AND %s;"
        res = db_manager.execute_query(q, (user_id, s, e))
        if not res or res[0]['tx'] is None: return json.dumps({"status": "no_data"})
        return json.dumps({"taxable": float(res[0]['tx']), "tax": float(res[0]['gst'])})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def search_invoices(user_id: str, time_period: Optional[str] = None, buyer_name: Optional[str] = None, invoice_number: Optional[str] = None, status: Optional[str] = None) -> str:
    """Searches invoices."""
    try:
        q = "SELECT ir.number, ir.date, br.name, ir.status, ir.invoice_url FROM invoices_record ir LEFT JOIN buyers_record br ON ir.buyer_id=br.id WHERE ir.user_id=%s"
        params = [user_id]
        if time_period:
            s, e = _parse_time_period(time_period)
            q += " AND ir.date BETWEEN %s AND %s"
            params.extend([s, e])
        if buyer_name:
            q += " AND br.name ILIKE %s"
            params.append(f"%{buyer_name}%")
        if invoice_number:
            q += " AND ir.number ILIKE %s"
            params.append(f"%{invoice_number}%")
        if status:
            q += " AND ir.status = %s"
            params.append(status.lower())
        
        q += " ORDER BY ir.date DESC LIMIT 10;"
        res = db_manager.execute_query(q, tuple(params))
        if not res: return json.dumps({"status": "not_found"})
        
        # Format dates for JSON
        for r in res:
            if isinstance(r['date'], date): r['date'] = r['date'].isoformat()
            
        return json.dumps({"status": "success", "invoices": res})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_item_sales_summary(user_id: str, item_name: str) -> str:
    """Gets sales summary for a specific item."""
    try:
        q = "SELECT SUM(quantity) as q, SUM(quantity*rate*(1+gst_rate/100.0)) as v FROM items_record i JOIN invoices_record ir ON i.invoice_id=ir.id WHERE ir.user_id=%s AND i.name ILIKE %s;"
        res = db_manager.execute_query(q, (user_id, f"%{item_name}%"))
        if not res or res[0]['q'] is None: return json.dumps({"status": "not_found"})
        return json.dumps({"qty": float(res[0]['q']), "val": float(res[0]['v'])})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_unpaid_invoices(user_id: str) -> str:
    """Gets unpaid invoices."""
    return search_invoices(user_id, status="unpaid")

@tool
def get_overdue_invoices(user_id: str) -> str:
    """Gets overdue invoices."""
    try:
        q = "SELECT ir.number, ir.due_date, br.name FROM invoices_record ir JOIN buyers_record br ON ir.buyer_id=br.id WHERE ir.user_id=%s AND ir.status='unpaid' AND ir.due_date < CURRENT_DATE ORDER BY ir.due_date ASC;"
        res = db_manager.execute_query(q, (user_id,))
        if not res: return json.dumps({"status": "ok"})
        for r in res: r['due_date'] = r['due_date'].isoformat()
        return json.dumps({"status": "overdue", "invoices": res})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_buyer_purchase_history(user_id: str, buyer_name: str) -> str:
    """Gets purchase history for a buyer."""
    return _internal_search_buyer(user_id, buyer_name) # Simplified for brevity

@tool
def log_business_expense(user_id: str, amount: float, description: str, category: str) -> str:
    """Logs an expense."""
    try:
        db_manager.execute_query("INSERT INTO ledger_entries (user_id, amount, description, type, category) VALUES (%s, %s, %s, 'debit', %s);", (user_id, amount, description, category))
        return json.dumps({"status": "success"})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def get_profit_and_loss_summary(user_id: str, time_period: str) -> str:
    """Gets profit and loss summary."""
    try:
        s, e = _parse_time_period(time_period)
        inc = db_manager.execute_query("SELECT COALESCE(SUM(it.quantity*it.rate),0) as v FROM invoices_record ir JOIN items_record it ON ir.id=it.invoice_id WHERE ir.user_id=%s AND ir.date BETWEEN %s AND %s;", (user_id, s, e))
        exp = db_manager.execute_query("SELECT COALESCE(SUM(amount),0) as v FROM ledger_entries WHERE user_id=%s AND type='debit' AND created_at::date BETWEEN %s AND %s;", (user_id, s, e))
        
        income = float(inc[0]['v']) if inc else 0.0
        expenses = float(exp[0]['v']) if exp else 0.0
        
        return json.dumps({"income": income, "expenses": expenses, "net": income - expenses})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

@tool
def schedule_payment_reminder(user_id: str, invoice_no: str, reminder_date: str) -> str:
    """Schedules a payment reminder."""
    try:
        details = _resolve_invoice_details(user_id, invoice_no)
        payload = {"invoice_id": details['id'], "invoice_number": details['number'], "recipient_name": details['name'], "recipient_email": details['email']}
        db_manager.execute_query("INSERT INTO scheduled_tasks (user_id, task_type, payload, run_at, status) VALUES (%s, 'payment_reminder', %s, %s, 'pending');", (user_id, json.dumps(payload), reminder_date))
        return json.dumps({"status": "success"})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})

# --- SPECIAL ASYNC TOOL (No Decorator) ---
async def answer_database_question(query: str, user_id: str, llm) -> str:
    try:
        if not DB_CONNECTION_STRING: return "DB Connection missing."
        db = SQLDatabase.from_uri(DB_CONNECTION_STRING)
        agent = create_sql_agent(llm=llm, db=db, agent_type="openai-tools", verbose=True)
        res = await agent.ainvoke({"input": f"Filter by user_id='{user_id}'. {query}"})
        return json.dumps({"status": "success", "response": res.get("output")})
    except Exception as e: return json.dumps({"status": "error", "message": str(e)})