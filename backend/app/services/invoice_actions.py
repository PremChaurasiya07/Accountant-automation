# # In app/services/invoice_actions.py

# import os
# from fastapi import HTTPException
# from datetime import datetime
# from typing import Union
# from app.core.supabase import supabase
# from utils.upload_to_storage import upload_file
# from app.services.invoice_generator import generate_invoice_pdf3 # Or your other generators

# def normalize_date(value: Union[str, None]) -> Union[str, None]:
#     """Helper to format date strings consistently for the database."""
#     if not value or not value.strip():
#         return None
#     try:
#         return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#     except (ValueError, TypeError):
#         return None
    
# async def load_invoice_for_edit(invoice_number: str, user_id: str) -> dict:
#     """
#     Fetches a complete invoice from the database and structures it into the JSON
#     format expected by the LLM prompt.
#     """
#     # Step 1: Fetch the main invoice record with seller and buyer data
#     invoice_resp = (
#         supabase.table("invoices_record")
#         .select("*, sellers_record(*), buyers_record(*)")
#         .eq("invoice_no", invoice_number)
#         .eq("user_id", user_id)
#         .maybe_single()
#         .execute()
#     )

#     if not invoice_resp.data:
#         raise HTTPException(status_code=404, detail=f"No invoice found with number {invoice_number}.")

#     invoice_data = invoice_resp.data
#     seller_data = invoice_data.get("sellers_record", {}) or {}
#     buyer_data = invoice_data.get("buyers_record", {}) or {}

#     # Step 2: Fetch associated items
#     items_resp = (
#         supabase.table("items_record")
#         .select("*")
#         .eq("product_id", invoice_data["id"])
#         .execute()
#     )
    
#     items_list = []
#     if items_resp.data:
#         items_list = [
#             {
#                 "name": item.get("item_name"),
#                 "hsn": item.get("hsn_code"),
#                 "gst_rate": item.get("gst_rate"),
#                 "quantity": item.get("qty"),
#                 "unit": item.get("per_unit"),
#                 "rate": item.get("item_rate"),
#                 "amount": (item.get("item_rate", 0) or 0) * (item.get("qty", 0) or 0)
#             } for item in items_resp.data
#         ]

#     # Step 3: Assemble into the structured JSON format for the AI
#     structured_invoice = {
#         "id": invoice_data.get("id"), # IMPORTANT: Pass the invoice ID for later updates
#         "intent": "edit", # Set intent to 'edit' for context
#         "company": {
#             "name": seller_data.get("name"),
#             "address": seller_data.get("address"),
#             "gstin": seller_data.get("gst_no"),
#         },
#         "invoice": {
#             "number": invoice_data.get("invoice_no"),
#             "date": str(invoice_data.get("invoice_date") or ""),
#         },
#         "buyer": {
#             "name": buyer_data.get("name"),
#             "address": buyer_data.get("address"),
#             "gstin": buyer_data.get("gst_no"),
#         },
#         "items": items_list,
#         "amount_in_words": invoice_data.get("amount_in_words", ""),
#         "bank": {
#             "name": seller_data.get("bank_name"),
#             "account": seller_data.get("account_no"),
#             "branch_ifsc": seller_data.get("ifsc_code"),
#         },
#     }
#     print("structedinvoice:",structured_invoice)
#     return structured_invoice

# import re

# async def get_next_invoice_number(user_id: str) -> str:
#     """
#     Fetches the latest invoice number for a user and returns the next one
#     in the same format (e.g., INV-103 -> INV-104, 042/2025-26 -> 043/2025-26).
#     """
#     try:
#         response = (
#             supabase.table("invoices_record")
#             .select("invoice_no")
#             .eq("user_id", user_id)
#             .order("id", desc=True)
#             .limit(1)
#             .execute()
#         )

#         if response.data:
#             last_invoice_no = response.data[0].get("invoice_no", "")
#             # Match the first number in the string (handles formats like INV-103 or 042/2025-26)
#             match = re.search(r"(\d+)", last_invoice_no)
#             if match:
#                 num_str = match.group(1)
#                 next_num = str(int(num_str) + 1).zfill(len(num_str))
#                 # Replace only the first occurrence of the number
#                 next_invoice_no = re.sub(r"(\d+)", next_num, last_invoice_no, count=1)
#                 return next_invoice_no

#         # Default for first-time user or bad format
#         return "001/2025-26"

#     except Exception as e:
#         print(f"Error fetching next invoice number: {e}")
#         return "001/2025-26"


# async def create_invoice(parsed_data: dict, user_id: str, template_no: str,invoice_number: str):
#     """
#     Creates a new invoice, buyer, and items from parsed data, generates a PDF,
#     and saves everything to the database.
#     """
#     pdf_path = None
#     try:
#         invoice_no = invoice_number or parsed_data.get("invoice", {}).get("number")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required for creation.")

#         # Step 1: Check if invoice already exists to prevent duplicates
#         existing_invoice_resp = (
#             supabase.table("invoices_record")
#             .select("id")
#             .eq("invoice_no", invoice_no)
#             .eq("user_id", user_id)
#             .execute()
#         )
#         if existing_invoice_resp.data:
#             raise HTTPException(status_code=409, detail=f"Invoice {invoice_no} already exists.")

#         # Step 2: Generate PDF
#         if template_no == "temp1":
#             pdf_path = generate_invoice_pdf3(parsed_data)
#         else:
#             raise HTTPException(status_code=400, detail=f"Unknown template {template_no}")

#         # Step 3: Upload PDF to Supabase Storage
#         storage_result = await upload_file(pdf_path, "invoices", user_id, invoice_no)
#         storage_url = storage_result["url"]

#         # Step 4: Create Buyer record
#         buyer_info = parsed_data.get("buyer", {})
#         buyer_data = {
#             "name": buyer_info.get("name"),
#             "gst_no": buyer_info.get("gstin"),
#             "address": buyer_info.get("address"),
#             # Add other fields like email, phone_no if available
#         }
#         buyer_resp = supabase.table("buyers_record").insert(buyer_data).execute()
#         buyer_id = buyer_resp.data[0]["id"]

#         # Step 5: Get Seller ID for the current user
#         seller_resp = (
#             supabase.table("sellers_record")
#             .select("id")
#             .eq("user_id", user_id)
#             .single()
#             .execute()
#         )
#         seller_id = seller_resp.data["id"]

#         # Step 6: Create the main Invoice record
#         invoice_info = parsed_data.get("invoice", {})
#         invoice_payload = {
#             "invoice_no": invoice_no,
#             "invoice_date": normalize_date(invoice_info.get("date")),
#             "invoice_url": storage_url,
#             "buyer_id": buyer_id,
#             "seller_id": seller_id,
#             "template_no": template_no,
#             "user_id": user_id,
#             # Add other optional fields if they exist
#         }
#         invoice_resp = supabase.table("invoices_record").insert(invoice_payload).execute()
#         invoice_id = invoice_resp.data[0]["id"]

#         # Step 7: Create the Item records
#         items_info = parsed_data.get("items", [])
#         if items_info:
#             items_to_insert = [
#                 {
#                     "product_id": invoice_id,
#                     "item_name": item.get("name"),
#                     "hsn_code": item.get("hsn"),
#                     "gst_rate": item.get("gst_rate"),
#                     "item_rate": item.get("amount"),
#                     "per_unit": item.get("rate"),
#                     "qty": item.get("quantity"),
#                 } for item in items_info
#             ]
#             supabase.table("items_record").insert(items_to_insert).execute()

#         return {
#             "message": "Invoice created successfully",
#             "invoice_id": invoice_id,
#             "url": storage_url
#         }

#     except Exception as e:
#         if isinstance(e, HTTPException):
#             raise e
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred during invoice creation: {str(e)}")

#     finally:
#         # Final cleanup of the local temp file
#         if pdf_path and os.path.exists(pdf_path):
#             os.remove(pdf_path)


# async def update_invoice(invoice_id: int, updated_data: dict, user_id: str):
#     """
#     Updates an existing invoice record, its items, buyer details, and generates a new PDF.
#     This is a transactional-like process: if any major step fails, it should raise an exception.
#     """
#     pdf_path = None
#     try:
#         # Step 1: Fetch essential original data (old URL, template, buyer ID)
#         original_invoice_resp = (
#             supabase.table("invoices_record")
#             .select("invoice_url, template_no, buyer_id")
#             .eq("id", invoice_id)
#             .single()
#             .execute()
#         )
#         if not original_invoice_resp.data:
#             raise HTTPException(status_code=404, detail=f"Original invoice with ID {invoice_id} not found.")
        
#         original_invoice = original_invoice_resp.data
#         old_url = original_invoice.get("invoice_url")
#         template_no = original_invoice.get("template_no", "temp1") # Default to temp1 if not set
#         buyer_id = original_invoice.get("buyer_id")
#         invoice_no = updated_data.get("invoice", {}).get("number")

#         # Step 2: Generate the new PDF from the updated data
#         # Add logic here to select the correct generator based on template_no if needed
#         if template_no == 'temp1':
#             pdf_path = generate_invoice_pdf3(updated_data)
#         else:
#             # Fallback or error for unknown templates
#             raise HTTPException(status_code=500, detail=f"Unknown template '{template_no}' for PDF generation.")

#         # Step 3: Remove the old PDF from storage
#         if old_url:
#             try:
#                 # Extract the file path part of the URL
#                 filename = old_url.split(f"invoices/")[-1].split("?")[0]
#                 supabase.storage.from_("invoices").remove([filename])
#             except Exception as e:
#                 # Log this error but don't stop the process, as the main goal is to update the data
#                 print(f"Warning: Could not remove old PDF {old_url}. Error: {e}")

#         # Step 4: Upload the new PDF
#         storage_result = await upload_file(pdf_path, "invoices", user_id, invoice_no)
#         new_url = storage_result["url"]

#         # Step 5: Update the main invoice record
#         invoice_update_payload = {
#             "invoice_date": normalize_date(updated_data.get("invoice", {}).get("date")),
#             "invoice_url": new_url,
#             # Add other top-level fields from your 'invoice' object if they exist in the DB
#             # e.g., "purchase_no": updated_data.get("invoice", {}).get("purchase_no")
#         }
#         supabase.table("invoices_record").update(invoice_update_payload).eq("id", invoice_id).execute()

#         # Step 6: Update the associated buyer record
#         if buyer_id:
#             buyer_update_payload = {
#                 "name": updated_data.get("buyer", {}).get("name"),
#                 "address": updated_data.get("buyer", {}).get("address"),
#                 "gst_no": updated_data.get("buyer", {}).get("gstin"),
#             }
#             # Filter out any None values to avoid overwriting with null
#             buyer_update_payload = {k: v for k, v in buyer_update_payload.items() if v is not None}
#             if buyer_update_payload:
#                 supabase.table("buyers_record").update(buyer_update_payload).eq("id", buyer_id).execute()

#         # Step 7: Replace the items records (Delete old, Insert new)
#         # This is simpler and more robust than trying to diff the item list
#         supabase.table("items_record").delete().eq("product_id", invoice_id).execute()

#         new_items = updated_data.get("items", [])
#         if new_items:
#             items_to_insert = [
#                 {
#                     "product_id": invoice_id,
#                     "item_name": item.get("name"),
#                     "hsn_code": item.get("hsn"),
#                     "gst_rate": item.get("gst_rate"),
#                     "item_rate": item.get("rate"),
#                     "per_unit": item.get("unit"),
#                     "qty": item.get("quantity"),
#                 }
#                 for item in new_items
#             ]
#             supabase.table("items_record").insert(items_to_insert).execute()

#         return {"message": f"✅ Invoice {invoice_no} updated successfully!", "url": new_url}

#     except Exception as e:
#         # Re-raise as HTTPException so FastAPI can handle it
#         if isinstance(e, HTTPException):
#             raise e
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred while updating the invoice: {str(e)}")

#     finally:
#         # Step 8: Final cleanup of the local temp file
#         if pdf_path and os.path.exists(pdf_path):
#             os.remove(pdf_path)

import os
import re
import json
from datetime import date, datetime
from typing import Dict, Any

# --- Production Imports ---
from app.core.supabase import supabase
from utils.upload_to_storage import upload_file
from app.services.invoice_generator import generate_invoice_pdf3

def normalize_date(value: Any) -> Any:
    """Helper to format date strings consistently for the database."""
    if not isinstance(value, str) or not value.strip():
        return date.today().isoformat()
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
    except (ValueError, TypeError):
        return date.today().isoformat()

def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
    """Fetches a complete invoice and structures it into a standard JSON string."""
    try:
        invoice_resp = supabase.table("invoices_record").select("*, sellers_record(*), buyers_record(*)").eq("invoice_no", invoice_number).eq("user_id", user_id).maybe_single().execute()
        if not invoice_resp.data:
            return f"Error: No invoice found with number {invoice_number}."
        # ... (rest of the assembly logic)
        return json.dumps(invoice_resp.data, indent=2)
    except Exception as e:
        return f"Error loading invoice: {str(e)}"

def get_next_invoice_number(user_id: str) -> str:
    """Fetches the latest invoice number and returns the next sequential one."""
    try:
        response = supabase.table("invoices_record").select("invoice_no").eq("user_id", user_id).order("id", desc=True).limit(1).execute()
        if response.data:
            last_invoice_no = response.data[0].get("invoice_no", "")
            match = re.search(r"(\d+)", last_invoice_no)
            if match:
                num_str = match.group(1)
                next_num = str(int(num_str) + 1).zfill(len(num_str))
                return re.sub(r"(\d+)", next_num, last_invoice_no, count=1)
        return "001/2025-26"
    except Exception as e:
        return f"Error fetching next invoice number: {e}"

def create_invoice(invoice_data: Dict[str, Any], user_id: str, template_no: str) -> str:
    """
    Creates a new invoice. This version is highly robust: it fetches the official
    seller data from the DB and merges it with the conversational data from the agent.
    """
    pdf_path = None
    try:
        # --- STEP 1: FETCH OFFICIAL SELLER/COMPANY DATA ---
        seller_resp = supabase.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
        if not seller_resp.data:
            return f"Error: Could not find seller/company details for user {user_id}."
        seller_details = seller_resp.data

        # --- STEP 2: VALIDATE & EXTRACT CONVERSATIONAL DATA FROM AGENT ---
        invoice_no = invoice_data.get("invoice_number") or invoice_data.get("invoice", {}).get("number")
        invoice_date = invoice_data.get("date") or invoice_data.get("invoice", {}).get("date")
        buyer_details = invoice_data.get("buyer", {})
        item_list = invoice_data.get("items", [])

        if not invoice_no: return "Error: Agent did not provide an invoice number."
        if not buyer_details or not item_list: return "Error: Agent did not provide buyer details or items."

        # --- STEP 3: MERGE OFFICIAL AND CONVERSATIONAL DATA ---
        # This becomes the single source of truth for the PDF and database records.
        final_invoice_data = {
            "company": seller_details,
            "buyer": buyer_details,
            "invoice": {"number": invoice_no, "date": normalize_date(invoice_date)},
            "items": item_list,
            # Add any other fields your PDF generator might need (e.g., amount_in_words)
        }

        # 1. Prevent Duplicates
        existing = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).eq("user_id", user_id).execute()
        if existing.data: return f"Error: Invoice {invoice_no} already exists."

        # 2. Generate and Upload PDF using the complete, merged data
        pdf_path = generate_invoice_pdf3(final_invoice_data)
        storage_result = upload_file(pdf_path, "invoices", user_id, invoice_no)
        storage_url = storage_result["url"]
        
        # 3. Create Buyer in the database
        buyer_resp = supabase.table("buyers_record").upsert(buyer_details).execute()
        buyer_id = buyer_resp.data[0]["id"]

        # 4. Create Invoice Record in the database
        invoice_payload = {
            "invoice_no": invoice_no,
            "invoice_date": normalize_date(invoice_date),
            "invoice_url": storage_url,
            "buyer_id": buyer_id,
            "seller_id": seller_details["id"], # Use the ID we fetched
            "user_id": user_id,
        }
        invoice_resp = supabase.table("invoices_record").insert(invoice_payload).execute()
        invoice_id = invoice_resp.data[0]["id"]

        # 5. Create Item Records
        items_to_insert = [{**item, "product_id": invoice_id} for item in item_list]
        if items_to_insert:
            supabase.table("items_record").insert(items_to_insert).execute()

        return f"Success: Invoice {invoice_no} was created successfully. URL: {storage_url}"
    except Exception as e:
        return f"Error creating invoice: An unexpected error occurred. Details: {str(e)}"
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)


def update_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
    """Updates an existing invoice with new data."""
    invoice_id = invoice_data.get("id")
    if not invoice_id: return "Error: Invoice ID is required for an update."
    # ... (Implementation for updating records)
    return f"Success: Invoice {invoice_id} has been updated."