

import logging
import os
import re
import json
import asyncio
from datetime import date, datetime
from typing import Dict, Any

# Ensure you have this library installed: pip install num2words
from num2words import num2words

# --- Production Imports ---
# Make sure these imports correctly point to your files and functions
from app.core.supabase import supabase
from app.services.embedding import embed_and_store_invoice
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

import json

def load_invoice_for_edit(invoice_number: str, user_id: str) -> str:
    """
    Fetches a complete invoice using a flexible search and structures it into
    a standard JSON string.
    """
    try:
        invoice_resp = supabase.table("invoices_record") \
                            .select("*, sellers_record(*), buyers_record(*), items_record(*)") \
                            .ilike("invoice_no", f"%{invoice_number}%") \
                            .eq("user_id", user_id) \
                            .maybe_single() \
                            .execute()

        # FIX 1: Check for a completely failed API call.
        if not invoice_resp:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": "The database query failed to execute. No response was received."
            })

        # FIX 2: Check for no data found.
        if not invoice_resp.data:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": f"No invoice found containing the number '{invoice_number}'."
            })

        # --- MODIFIED: Return JSON success ---
        # Use default=str to handle date/datetime objects
        return json.dumps({
            "status": "success",
            "data": invoice_resp.data
        }, default=str)
    
    except Exception as e:
        # --- MODIFIED: Return JSON exception ---
        return json.dumps({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        })
    
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
        return f"Error fetching next invoice number: {str(e)}"

def format_data_for_pdf(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms the basic invoice data into the detailed, robust format
    required by the PDF generation function.
    """
    company_in = data.get("company", {})
    buyer_in = data.get("buyer", {})
    invoice_in = data.get("invoice", {})
    items_in = data.get("items", [])

    total_amount = 0
    formatted_items = []
    for item in items_in:
        rate = item.get("price_per_unit", 0) or item.get("rate", 0)
        quantity = item.get("quantity", 0)
        amount = float(rate) * float(quantity)
        total_amount += amount
        
        formatted_items.append({
            "name": item.get("name", "") or item.get("description", ""),
            "description": item.get("description", ""), "hsn": item.get("hsn", ""),
            "gst_rate": item.get("gst_rate", 18), "quantity": quantity,
            "unit": item.get("unit", "pcs"), "rate": rate, "amount": amount
        })

    # This is the final, detailed structure for the PDF
    formatted_data = {
        "intent": "create",
        "company": {
            "name": company_in.get("name", ""), "address": company_in.get("address", ""),
            "district": company_in.get("district", ""), "mobile": company_in.get("mobile", ""),
            "phone": company_in.get("phone", ""), "gstin": company_in.get("gst_no", ""),
            "state": company_in.get("state", ""), "contact": company_in.get("contact", ""),
            "email": company_in.get("email", "")
        },
        "invoice": {
            "number": invoice_in.get("number", ""), "date": invoice_in.get("date", date.today().isoformat()),
            "delivery_note": invoice_in.get("delivery_note", ""), "payment_terms": invoice_in.get("payment_terms", ""),
            "reference": invoice_in.get("reference", ""), "other_references": invoice_in.get("other_references", ""),
            "buyer_order": invoice_in.get("buyer_order", ""), "buyer_order_date": invoice_in.get("buyer_order_date", ""),
            "dispatch_doc": invoice_in.get("dispatch_doc", ""), "delivery_date": invoice_in.get("delivery_date", ""),
            "dispatch_through": invoice_in.get("dispatch_through", ""), "destination": invoice_in.get("destination", ""),
            "terms_delivery": invoice_in.get("terms_delivery", "")
        },
        "buyer": {
            "name": buyer_in.get("name", ""), "address": buyer_in.get("address", ""),
            "gstin": buyer_in.get("gstin", ""), "state": buyer_in.get("state", "")
        },
        "items": formatted_items,
        "amount_in_words": f"INR {num2words(total_amount, lang='en_IN').replace('-', ' ').title()} Only",
        "bank": {
            "name": company_in.get("bank_name", ""), "account": company_in.get("account_no", ""),
            "branch_ifsc": company_in.get("ifsc_code", "")
        }
    }
    return formatted_data


def create_invoice(invoice_data: Dict[str, Any], user_id: str, template_no: str) -> str:
    """
    Creates a new invoice, fetching seller data, formatting for the PDF,
    and correctly handling asynchronous file uploads and database schema mapping.
    """
    pdf_path = None
    try:
        # Step 1: Fetch official seller/company data
        seller_resp = supabase.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
        if not seller_resp.data:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": f"Could not find seller details for user {user_id}."
            })
        seller_details = seller_resp.data

        # Step 2: Validate conversational data from agent
        invoice_details = invoice_data.get("invoice", {})
        buyer_details = invoice_data.get("buyer", {})
        item_list = invoice_data.get("items", [])
        invoice_no = invoice_details.get("number")
        invoice_date = invoice_details.get("date")

        if not invoice_no:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": "Agent did not provide an invoice number."
            })
        if not buyer_details or not item_list:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": "Agent did not provide buyer details or items."
            })

        # Steps 3 & 4: Merge and Format data for PDF
        merged_data = { "company": seller_details, "buyer": buyer_details, "invoice": invoice_details, "items": item_list }
        formatted_pdf_data = format_data_for_pdf(merged_data)
        
        # Step 5: Generate and Upload PDF
        pdf_path = generate_invoice_pdf3(formatted_pdf_data)
        storage_result = asyncio.run(upload_file(pdf_path, "invoices", user_id, invoice_no))
        storage_url = storage_result["url"]
        
        # Step 6: Save Parent Records to Database
        # ... (your database logic is fine) ...
        buyer_resp = supabase.table("buyers_record").upsert(buyer_details).execute()
        buyer_id = buyer_resp.data[0]["id"]
        
        invoice_payload = {
            "invoice_no": invoice_no, "invoice_date": normalize_date(invoice_date),
            "invoice_url": storage_url, "buyer_id": buyer_id,
            "seller_id": seller_details["id"], "user_id": user_id,
        }
        invoice_resp = supabase.table("invoices_record").insert(invoice_payload).execute()
        invoice_id = invoice_resp.data[0]["id"]

        # --- FIX: Map agent data... (this logic is fine) ---
        items_to_insert = []
        for item in item_list:
            items_to_insert.append({
                "product_id": invoice_id,
                "item_name": item.get("name") or item.get("description"), 
                "hsn_code": item.get("hsn"),
                "gst_rate": item.get("gst_rate"),
                "item_rate": item.get("rate") or item.get("price_per_unit"),
                "per_unit": item.get("unit", "pcs"),
                "qty": item.get("quantity") 
            })
        
        if items_to_insert:
            supabase.table("items_record").insert(items_to_insert).execute()

        embed_and_store_invoice(invoice_id, invoice_data)

        # --- MODIFIED: Return structured JSON on success ---
        return json.dumps({
            "status": "success",
            "invoice_number": invoice_no,
            "url": storage_url,
            "message": f"Invoice {invoice_no} was created successfully."
        })
    
    except Exception as e:
        # --- MODIFIED: Return JSON on exception ---
        return json.dumps({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        })
    
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)
            
def update_invoice(invoice_data: Dict[str, Any], user_id: str) -> str:
    """
    Updates an existing invoice. This is a destructive operation that replaces the old
    invoice PDF, items, and embeddings with the new data provided.
    """
    pdf_path = None
    try:
        # --- Step 1: Input Validation and Fetching Existing Invoice ---
        invoice_details_in = invoice_data.get("invoice", {})
        invoice_no = invoice_details_in.get("number")
        if not invoice_no:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": "Invoice number ('invoice.number') is required in the input data for an update."
            })

        # Find the existing invoice record
        invoice_resp = supabase.table("invoices_record").select("id, invoice_url, seller_id").eq("invoice_no", invoice_no).eq("user_id", user_id).single().execute()
        if not invoice_resp.data:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": f"No invoice found with number {invoice_no} for the current user."
            })

        invoice_id = invoice_resp.data["id"]
        old_url = invoice_resp.data.get("invoice_url")
        seller_id = invoice_resp.data.get("seller_id")

        # Fetch seller details needed for the PDF
        seller_resp = supabase.table("sellers_record").select("*").eq("id", seller_id).single().execute()
        if not seller_resp.data:
            # --- MODIFIED: Return JSON error ---
            return json.dumps({
                "status": "error",
                "message": "Could not find seller details for the invoice."
            })
        seller_details = seller_resp.data

        # --- Step 2: Clean Up Old Invoice Assets ---
        logging.info(f"Starting update for invoice ID {invoice_id}. Cleaning up old assets.")

        # Delete old PDF from storage
        if old_url:
            try:
                file_path = old_url.split(f"/invoices/")[-1].split("?")[0]
                supabase.storage.from_("invoices").remove([file_path])
                logging.info(f"Successfully deleted old PDF: {file_path}")
            except Exception as e:
                logging.warning(f"Could not delete old PDF from storage, it might not exist. Details: {e}")

        # Delete old embeddings and items
        supabase.table("invoice_embeddings").delete().eq("invoice_id", invoice_id).execute()
        supabase.table("items_record").delete().eq("product_id", invoice_id).execute()
        logging.info(f"Successfully deleted old items and embeddings for invoice ID {invoice_id}.")

        # --- Step 3: Prepare and Generate New Assets ---
        merged_data = {
            "company": seller_details,
            "buyer": invoice_data.get("buyer", {}),
            "invoice": invoice_details_in,
            "items": invoice_data.get("items", [])
        }
        formatted_pdf_data = format_data_for_pdf(merged_data)
        
        pdf_path = generate_invoice_pdf3(formatted_pdf_data)
        storage_result = asyncio.run(upload_file(pdf_path, "invoices", user_id, invoice_no))
        new_url = storage_result["url"]
        logging.info(f"Successfully generated and uploaded new PDF to {new_url}.")

        # --- Step 4: Update Database with New Information ---
        invoice_payload = {
            "invoice_date": normalize_date(invoice_details_in.get("date")),
            "invoice_url": new_url,
        }
        buyer_details = invoice_data.get("buyer", {})
        if buyer_details.get("id"):
             supabase.table("buyers_record").update(buyer_details).eq("id", buyer_details["id"]).execute()

        supabase.table("invoices_record").update(invoice_payload).eq("id", invoice_id).execute()

        # Insert the new list of items
        item_list = invoice_data.get("items", [])
        items_to_insert = []
        for item in item_list:
            items_to_insert.append({
                "product_id": invoice_id,
                "item_name": item.get("name") or item.get("description"),
                "hsn_code": item.get("hsn"), "gst_rate": item.get("gst_rate"),
                "item_rate": item.get("rate") or item.get("price_per_unit"),
                "per_unit": item.get("unit", "pcs"), "qty": item.get("quantity")
            })
        
        if items_to_insert:
            supabase.table("items_record").insert(items_to_insert).execute()
        logging.info(f"Successfully updated database records for invoice ID {invoice_id}.")

        # --- Step 5: Re-embed the Updated Invoice Data ---
        embed_and_store_invoice(invoice_id, merged_data)
        logging.info(f"Successfully re-embedded data for invoice ID {invoice_id}.")

        # --- MODIFIED: Return JSON success ---
        return json.dumps({
            "status": "success",
            "invoice_number": invoice_no,
            "url": new_url,
            "message": f"Invoice {invoice_no} was updated successfully."
        })

    except Exception as e:
        logging.error(f"An unexpected error occurred during invoice update: {e}")
        # --- MODIFIED: Return JSON exception ---
        return json.dumps({
            "status": "error",
            "message": f"An unexpected error occurred during invoice update. Details: {str(e)}"
        })
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)

