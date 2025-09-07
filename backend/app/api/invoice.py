import logging
from fastapi import HTTPException, Request, Form, File, UploadFile,APIRouter,Depends
from pydantic import BaseModel,EmailStr
from typing import List, Optional
import json
import os
from app.core.supabase import supabase, supabase_admin
from app.services.embedding import embed_and_store_invoice
from utils.upload_to_storage import upload_file
from app.deps.auth import get_current_user
from datetime import datetime
from app.services.invoice_generator import generate_invoice_pdf1, generate_invoice_pdf2,generate_invoice_pdf3,generate_final_invoice
from app.services.gemini import parsed_info
from app.services.invoice_parser import parse_invoice
from cryptography.fernet import Fernet
from app.tools.sql_query_tool import send_invoice_via_email


router = APIRouter(prefix="/invoice", tags=["INVOICE"])

@router.post("/seller")
async def save_seller_details(
    request: Request,
    company_name: str = Form(...),
    address: str = Form(""),
    gstin: str = Form(""),
    contact: str = Form(""),
    email: str = Form(""),

    bank_name: str = Form(""),
    account_no: str = Form(""),
    ifsc_code: str = Form(""),

    logo: UploadFile = File(None),
    signature: UploadFile = File(None),
    stamp: UploadFile = File(None),
):
    user = await get_current_user(request)
    user_id = user.id

    # Upload files (if provided)
    logo_url = await upload_file(logo, "logos", user_id=user_id) if logo else None
    signature_url = await upload_file(signature, "signatures", user_id=user_id) if signature else None
    stamp_url = await upload_file(stamp, "stamps", user_id=user_id) if stamp else None

    # Prepare data to insert
    data = {
        "user_id": user_id,
        "name": company_name,
        "address": address,
        "gst_no": gstin,
        "contact": contact,
        "email": email,
        "bank_name": bank_name,
        "account_no": account_no,
        "ifsc_code": ifsc_code,
        "logo": logo_url["url"] if logo_url else None,
        "sign": signature_url["url"] if signature_url else None,
        "stamp": stamp_url["url"] if stamp_url else None,
    }

    # Insert into DB
    res = supabase.table("sellers_record").insert(data).execute()

    return {"status": "success", "data": res.data}



@router.post("/seller/update")
async def update_seller_details(
    request: Request,
    company_name: str = Form(...),
    address: str = Form(""),
    gstin: str = Form(""),
    contact: str = Form(""),
    email: str = Form(""),

    bank_name: str = Form(""),
    account_no: str = Form(""),
    ifsc_code: str = Form(""),

    logo: UploadFile = File(None),
    signature: UploadFile = File(None),
    stamp: UploadFile = File(None),
):
    user = await get_current_user(request)
    user_id = user.id

    # Upload new files if provided
    logo_url = await upload_file(logo, "logos", user_id=user_id) if logo else None
    signature_url = await upload_file(signature, "signatures", user_id=user_id) if signature else None
    stamp_url = await upload_file(stamp, "stamps", user_id=user_id) if stamp else None

    # Prepare update fields
    update_data = {
        "name": company_name,
        "address": address,
        "gst_no": gstin,
        "contact": contact,
        "email": email,
        "bank_name": bank_name,
        "account_no": account_no,
        "ifsc_code": ifsc_code,
    }

    # Add only updated files
    if logo_url: update_data["logo"] = logo_url
    if signature_url: update_data["sign"] = signature_url
    if stamp_url: update_data["stamp"] = stamp_url

    # Run update
    res = supabase.table("sellers_record").update(update_data).eq("user_id", user_id).execute()

    return {"status": "updated", "data": res.data}

@router.delete("/delete-user")
async def delete_user_and_data(request: Request):
    try:
        user = await get_current_user(request)
        if not user or not user.id:
            raise HTTPException(status_code=401, detail="User not authenticated.")
            
        user_id = user.id

        # 1. Delete associated data first
        supabase.table("invoices_record").delete().eq("user_id", user_id).execute()
        supabase.table("sellers_record").delete().eq("user_id", user_id).execute()
        # Add any other table cleanups here

        # 2. Delete the user from Supabase Auth
        # The try/except block will automatically catch any errors from this call.
        supabase.auth.admin.delete_user(user_id)

        # The check for 'delete_response.error' has been removed.

        return {"status": "deleted", "message": "User and all associated data have been deleted successfully."}

    except HTTPException as e:
        # Re-raise HTTP exceptions to let FastAPI handle them
        raise e
    except Exception as e:
        # Catch any other unexpected errors from the database or auth calls
        error_message = f"An unexpected error occurred: {str(e)}"
        logging.error(error_message) # Good practice to log the actual error
        raise HTTPException(status_code=500, detail=error_message)

# Pydantic schema
class ProductItem(BaseModel):
    pcs_or_weight: str
    base_price: float
    gst_rate: Optional[float] = 18.0

class InvoiceRequest(BaseModel):
    company_name: str
    company_gst: str
    company_address: str
    product: List[ProductItem]
    challan_date: Optional[str] = None
    challan_no: Optional[str] = None
    invoice_date: str
    invoice_no: str
    purchase_date: Optional[str] = None
    purchase_no: Optional[str] = None
    vehicle_no: Optional[str] = None
    buyer_id: Optional[int] = None
    seller_id: Optional[int] = None


# @router.post("/create")
# async def create_invoice(request: Request):
    
#     pdf_path = None
#     storage_url = None # Initialize storage_url to None
#     try:
#         # --- STEP 1: AUTHENTICATE USER FIRST ---
#         try:
#             user = await get_current_user(request)
#             if not user or not user.id:
#                 raise HTTPException(status_code=401, detail="User not authenticated or session expired.")
#         except HTTPException as e:
#              # If get_current_user raises an exception (e.g., token expired), catch it
#              raise HTTPException(status_code=401, detail=f"Authentication failed: {e.detail}")
        
#         user_id = user.id

#         # --- STEP 2: PROCESS REQUEST DATA ---
#         data = await request.json()
#         print(data)
#         template_no = data.get('template_id')
#         invoice_no = data.get("invoice_no")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required")
        
#         redefined_data = parsed_info(data)
#         parsed = json.loads(redefined_data)

#         # --- STEP 3: CHECK FOR DUPLICATE INVOICE ---
#         existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).eq("user_id", user_id).execute()
#         if existing_invoice.data and len(existing_invoice.data) > 0:
#             return {
#                 "message": f"Invoice with number {invoice_no} already exists.",
#                 "invoice_id": existing_invoice.data[0]["id"]
#             }

#         # --- STEP 4: GENERATE PDF ---
#         if not template_no:
#             return {'message': 'template unknown'}
#         elif template_no == 'temp1':
#             pdf_path = generate_invoice_pdf3(parsed)
#             print("PDF path:", pdf_path)

#         def normalize_date(value):
#             try:
#                 if value and value.strip():
#                     return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#             except Exception:
#                 return None
#             return None

#         # --- STEP 5: UPLOAD PDF TO STORAGE ---
#         storage_result = await upload_file(
#             pdf_path,
#             folder="invoices",
#             user_id=user_id,
#             invoice_no=invoice_no
#         )
#         storage_url = storage_result["url"]

#         # --- STEP 6: DATABASE OPERATIONS (Wrapped in a try block for cleanup) ---
#         try:
#             # UPSERT BUYER RECORD
#             buyer_data = {
#                 "name": parsed["buyer"]["name"],
#                 "gst_no": parsed["buyer"]["gstin"],
#                 "email": "",
#                 "address": parsed["buyer"]["address"],
#                 "phone_no": ""
#             }
#             buyer_response = supabase.table("buyers_record").insert(buyer_data).execute()
#             buyer_id = buyer_response.data[0]["id"]

#             # GET SELLER ID
#             seller_response = supabase.table("sellers_record").select("id").eq("user_id", user_id).single().execute()
#             if not seller_response.data:
#                 raise HTTPException(status_code=404, detail="Seller not found for the current user.")
#             seller_id = seller_response.data["id"]

#             # INSERT INVOICE & ITEM RECORDS
#             invoice_data = {
#                 "challan_date": normalize_date(parsed.get("challan_date")),
#                 "challan_no": parsed.get("challan_no"),
#                 "invoice_date": normalize_date(parsed["invoice"]["date"]),
#                 "invoice_no": invoice_no,
#                 "purchase_date": normalize_date(parsed.get("purchase_date")),
#                 "purchase_no": parsed.get("purchase_no"),
#                 "vehicle_no": parsed.get("vehicle_no"),
#                 "invoice_url": storage_url,
#                 "buyer_id": buyer_id,
#                 "seller_id": seller_id,
#                 "template_no": parsed.get("template_id", template_no),
#                 "user_id": user_id
#             }
#             invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
#             invoice_id = invoice_response.data[0]["id"]

#             records = []
#             for item in parsed.get("items", []):
#                 records.append({
#                     "product_id": invoice_id,
#                     "item_name": item.get('name') or item.get('description'),
#                     "hsn_code": item.get("hsn"),
#                     "gst_rate": item.get("gst_rate"),
#                     "item_rate": item.get("amount"),
#                     "per_unit": item.get("rate") or item.get("price_per_unit"),
#                     "qty": item.get("quantity"),
#                 })
#             supabase.table("items_record").insert(records).execute()

#             # EMBED AND STORE INVOICE DATA
#             embed_and_store_invoice(invoice_id, parsed)

#         except Exception as db_error:
#             # --- CLEANUP ON FAILURE ---
#             print(f"Database operation failed: {db_error}. Cleaning up uploaded file.")
#             if storage_url:
#                 # Extract filename from URL to delete from bucket
#                 filename = storage_url.split("/")[-1].split("?")[0]
#                 supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])
#                 print(f"Successfully deleted orphaned file from bucket: {filename}")
#             # Re-raise the error to send a 500 response
#             raise db_error

#         return {
#             "message": "Invoice created successfully",
#             "invoice_id": invoice_id,
#             "url": storage_url
#         }
#     except HTTPException as he:
#         # Re-raise HTTP exceptions to be handled by FastAPI
#         raise he
#     except Exception as e:
#         # Catch any other unexpected errors
#         print(f"An unexpected error occurred in /create: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")
#     finally:
#         # --- FINAL CLEANUP ---
#         # Always remove the local temporary PDF file if it was created
#         if pdf_path and os.path.exists(pdf_path):
#             os.remove(pdf_path)


# @router.post("/create")
# async def create_invoice(request: Request):
#     pdf_path = None
#     storage_url = None
#     try:
#         # Steps 1-6 remain the same
#         user = await get_current_user(request)
#         user_id = user.id
#         data = await request.json()
#         invoice_no = data.get("invoice", {}).get("number")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required.")
#         print(user_id)
#         seller_response = supabase.table("sellers_record").select("*").eq("user_id", user_id).single().execute()
#         print(seller_response)
#         if not seller_response.data:
#             raise HTTPException(status_code=404, detail="Seller not found for the current user.")
#         seller_id = seller_response.data["id"]
#         existing_invoice = supabase.table("invoices_record").select("id").eq("number", invoice_no).eq("seller_id", seller_id).execute()
#         if existing_invoice.data:
#             raise HTTPException(status_code=409, detail=f"Invoice with number {invoice_no} already exists.")

#         pdf_path = generate_final_invoice(data, filename=f"temp_invoice_{invoice_no.replace('/', '_')}.pdf")
        
#         storage_result = await upload_file(pdf_path, folder="invoices", user_id=user_id, invoice_no=invoice_no)
#         storage_url = storage_result["url"]

#         # --- STEP 7: DATABASE OPERATIONS (WITH MORE ROBUST CHECKS) ---
#         try:
#             # UPSERT BUYER: Check if buyer exists, if not, create them.
#             buyer_payload = data.get("buyer", {})
#             buyer_name = buyer_payload.get("name")
            
#             print("--- DEBUG: Checking for existing buyer...")
#             existing_buyer_response = supabase.table("buyers_record").select("id").eq("name", buyer_name).eq("user_id", user_id).maybe_single().execute()
#             print(f"--- DEBUG: existing_buyer response: {existing_buyer_response}")

#             # ADDED: Check if the response object itself is valid before accessing .data
#             if existing_buyer_response and existing_buyer_response.data:
#                 buyer_id = existing_buyer_response.data["id"]
#                 print(f"--- DEBUG: Found existing buyer_id: {buyer_id}")
#             else:
#                 print("--- DEBUG: No existing buyer found. Inserting new buyer...")
#                 buyer_data_to_insert = { "user_id": user_id, "name": buyer_name, "address": buyer_payload.get("address"), "state": buyer_payload.get("state"), "gstin": buyer_payload.get("gstin") }
#                 buyer_response = supabase.table("buyers_record").insert(buyer_data_to_insert, returning="representation").execute()
                
#                 if not buyer_response or not buyer_response.data:
#                     raise Exception("Failed to create buyer record. Please check RLS policies on 'buyers_record' table.")
#                 buyer_id = buyer_response.data[0]["id"]
#                 print(f"--- DEBUG: Created new buyer_id: {buyer_id}")

#             # (The rest of the code for inserting the invoice and items remains the same)
#             invoice_payload = data.get("invoice", {})
#             terms_payload = data.get("terms_and_conditions", [])
#             invoice_data_to_insert = { "user_id": user_id, "seller_id": seller_id, "buyer_id": buyer_id, "title": invoice_payload.get("title"), "number": invoice_no, "date": invoice_payload.get("date"), "due_date": invoice_payload.get("due_date"), "terms_and_conditions": terms_payload, "invoice_url": storage_url }
#             invoice_response = supabase.table("invoices_record").insert(invoice_data_to_insert, returning="representation").execute()
#             if not invoice_response or not invoice_response.data:
#                 raise Exception("Failed to create invoice record. Check RLS policies on 'invoices_record' table.")
#             invoice_id = invoice_response.data[0]["id"]

#             items_to_insert = []
#             for item in data.get("items", []):
#                 items_to_insert.append({ "invoice_id": invoice_id, "name": item.get("name"), "hsn": item.get("hsn"), "quantity": item.get("quantity"), "unit": item.get("unit"), "rate": item.get("rate"), "gst_rate": item.get("gst_rate") })
#             if items_to_insert:
#                 supabase.table("items_record").insert(items_to_insert).execute()

#             embed_and_store_invoice(invoice_id, data)

#         except Exception as db_error:
#             print(f"Database operation failed: {db_error}. Cleaning up uploaded file.")
#             if storage_url:
#                 filename_to_delete = storage_url.split("/")[-1].split("?")[0]
#                 file_path_in_bucket = f"{user_id}/{invoice_no.replace('/', '-')}/{filename_to_delete}"
#                 supabase.storage.from_("invoices").remove([file_path_in_bucket])
#                 print(f"Successfully deleted orphaned file: {filename_to_delete}")
#             raise db_error

#         return { "message": "Invoice created successfully", "invoice_id": invoice_id, "url": storage_url }
        
#     except Exception as e:
#         print(f"An unexpected error occurred in /create: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
#     finally:
#         if pdf_path and os.path.exists(pdf_path):
#             os.remove(pdf_path)


from fastapi import BackgroundTasks, HTTPException, Request
import asyncio
import os
import logging

# --- INVENTORY UPDATE (background task) ---
async def background_update_inventory(user_id: str, items_payload: list):
    for item in items_payload:
        product_name = item.get("name")
        invoiced_quantity = item.get("quantity", 0)

        if not product_name or not isinstance(invoiced_quantity, (int, float)) or invoiced_quantity <= 0:
            continue

        print(f"Searching for Name: '{product_name}'")
        print(f"Searching for User ID: '{user_id}'")
        try:
            product_response = supabase.table("products") \
                .select("id, stock") \
                .eq("name", product_name) \
                .eq("user_id", user_id) \
                .maybe_single() \
                .execute()

            # --- FIX: Check if the response object itself is valid before accessing .data ---
            if not product_response:
                logging.error(f"⚠️ Failed to get a response from Supabase for product '{product_name}'.")
                continue # Skip to the next item

            print(f"--- DEBUG: Product lookup for '{product_name}': {product_response.data}")

            if product_response.data:
                product_data = product_response.data
                product_id = product_data["id"]
                current_stock = product_data.get("stock")

                if current_stock is not None:
                    new_stock = current_stock - invoiced_quantity
                    supabase.table("products").update({"stock": new_stock}).eq("id", product_id).execute()
                    print(f"--- INFO: Stock updated for '{product_name}': {current_stock} → {new_stock}")
                else:
                    print(f"--- INFO: Product '{product_name}' found but has no stock value. Skipping.")
            else:
                print(f"--- INFO: Product '{product_name}' not found. Skipping.")

        except Exception as e:
            logging.exception(f"⚠️ An unexpected error occurred while updating stock for {product_name}: {e}")

            
# --- EMAIL SENDING (background task wrapper) ---
def background_send_invoice_email(user_id: str, email_details: dict):
    try:
        status = send_invoice_via_email(
            user_id=user_id,
            invoice_no=email_details["invoice_no"],
            email_address=email_details.get("buyer_email")
        )
        print(f"--- INFO: Background email status: {status}")
    except Exception as e:
        logging.error(f"⚠️ Background email sending failed: {e}")


# --- MAIN ENDPOINT ---
@router.post("/create")
async def create_invoice(request: Request, background_tasks: BackgroundTasks):
    pdf_path = None
    storage_url = None
    try:
        # --- AUTH ---
        user = await get_current_user(request)
        user_id = user.id
        data = await request.json()

        invoice_no = data.get("invoice", {}).get("number")
        if not invoice_no:
            raise HTTPException(status_code=400, detail="Invoice number is required.")

        # --- SELLER ---
        seller_response = supabase.table("sellers_record").select("id, name").eq("user_id", user_id).single().execute()
        if not seller_response or not getattr(seller_response, "data", None):
            raise HTTPException(status_code=404, detail="Seller not found for the current user.")

        seller_id = seller_response.data["id"]
        seller_name = seller_response.data.get("name", "Your Company")

        # --- DUPLICATE INVOICE CHECK ---
        existing_invoice = supabase.table("invoices_record").select("id").eq("number", invoice_no).eq("seller_id", seller_id).execute()
        if existing_invoice and getattr(existing_invoice, "data", None):
            raise HTTPException(status_code=409, detail=f"Invoice with number {invoice_no} already exists.")

        # --- PDF GEN + UPLOAD ---
        pdf_path = generate_final_invoice(data, filename=f"temp_invoice_{invoice_no.replace('/', '_')}.pdf")
        storage_result = await upload_file(pdf_path, folder="invoices", user_id=user_id, invoice_no=invoice_no)
        storage_url = storage_result.get("url")

        # --- BUYER ---
        buyer_payload = data.get("buyer", {})
        buyer_name = buyer_payload.get("name")

        existing_buyer_response = supabase.table("buyers_record").select("id").eq("name", buyer_name).eq("user_id", user_id).maybe_single().execute()
        if existing_buyer_response and getattr(existing_buyer_response, "data", None):
            buyer_id = existing_buyer_response.data["id"]
        else:
            buyer_data_to_insert = {
                "user_id": user_id,
                "name": buyer_name,
                "address": buyer_payload.get("address"),
                "state": buyer_payload.get("state"),
                "gstin": buyer_payload.get("gstin")
            }
            buyer_response = supabase.table("buyers_record").insert(buyer_data_to_insert, returning="representation").execute()
            if not buyer_response or not getattr(buyer_response, "data", None):
                raise Exception("Failed to create buyer record.")
            buyer_id = buyer_response.data[0]["id"]

        # --- INVOICE ---
        invoice_payload = data.get("invoice", {})
        terms_payload = data.get("terms_and_conditions", [])

        invoice_data_to_insert = {
            "user_id": user_id,
            "seller_id": seller_id,
            "buyer_id": buyer_id,
            "title": invoice_payload.get("title"),
            "number": invoice_no,
            "date": invoice_payload.get("date"),
            "due_date": invoice_payload.get("due_date"),
            "terms_and_conditions": terms_payload,
            "invoice_url": storage_url
        }
        invoice_response = supabase.table("invoices_record").insert(invoice_data_to_insert, returning="representation").execute()
        if not invoice_response or not getattr(invoice_response, "data", None):
            raise Exception("Failed to create invoice record.")

        invoice_id = invoice_response.data[0]["id"]

        # --- ITEMS ---
        items_payload = data.get("items", [])
        if items_payload:
            items_to_insert = [
                {
                    "invoice_id": invoice_id,
                    "name": item.get("name"),
                    "hsn": item.get("hsn"),
                    "quantity": item.get("quantity"),
                    "unit": item.get("unit"),
                    "rate": item.get("rate"),
                    "gst_rate": item.get("gst_rate")
                }
                for item in items_payload
            ]
            supabase.table("items_record").insert(items_to_insert).execute()

        # --- BACKGROUND TASKS ---
        if items_payload:
            background_tasks.add_task(background_update_inventory, user_id, items_payload)

        if data.get("auto_send_email", False):
            email_details = {
                "invoice_no": invoice_no,
                "buyer_name": buyer_payload.get("name"),
                "buyer_email": buyer_payload.get("email"),
                "company_name": seller_name,
                "invoice_url": storage_url
            }
            background_tasks.add_task(background_send_invoice_email, user_id, email_details)

        # --- EMBEDDINGS ---
        embed_and_store_invoice(invoice_id, data)

        return {"message": "Invoice created successfully", "invoice_id": invoice_id, "url": storage_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)


            
@router.put("/edit/{invoice_id}")
async def edit_invoice(invoice_id: int, request: Request, background_tasks: BackgroundTasks):
    """
    Updates an existing invoice based on its unique ID.
    """
    pdf_path = None
    try:
        # --- 1. AUTHENTICATION ---
        user = await get_current_user(request)
        user_id = user.id
        data = await request.json()

        # --- 2. FETCH EXISTING INVOICE ---
        invoice_resp = supabase.table("invoices_record").select("seller_id, invoice_url").eq("id", invoice_id).eq("user_id", user_id).single().execute()
        if not invoice_resp.data:
            raise HTTPException(status_code=404, detail="Invoice not found or you do not have permission to edit it.")

        seller_id = invoice_resp.data["seller_id"]
        old_storage_url = invoice_resp.data.get("invoice_url")
        
        # --- 3. CHECK FOR INVOICE NUMBER CONFLICT ---
        new_invoice_no = data.get("invoice", {}).get("number")
        if not new_invoice_no:
            raise HTTPException(status_code=400, detail="Invoice number is required.")

        # Check if ANOTHER invoice (with a different ID) already uses this number for the same seller
        conflict_check = supabase.table("invoices_record").select("id").eq("number", new_invoice_no).eq("seller_id", seller_id).not_.eq("id", invoice_id).execute()
        if conflict_check.data:
            raise HTTPException(status_code=409, detail=f"Another invoice with number '{new_invoice_no}' already exists.")

        # --- 4. DELETE OLD PDF, GENERATE & UPLOAD NEW ONE ---
        if old_storage_url:
            try:
                # Extract the path from the URL for deletion
                # e.g., from '.../storage/v1/object/public/invoices/user_id/file.pdf' -> 'user_id/file.pdf'
                path_parts = old_storage_url.split('/invoices/')
                if len(path_parts) > 1:
                    file_path_in_bucket = path_parts[1].split('?')[0] # Remove any query params
                    supabase.storage.from_("invoices").remove([file_path_in_bucket])
            except Exception as e:
                print(f"Warning: Could not delete old file from storage, proceeding anyway. Error: {e}")

        pdf_path = generate_final_invoice(data, filename=f"temp_invoice_{new_invoice_no.replace('/', '_')}.pdf")
        storage_result = await upload_file(pdf_path, folder="invoices", user_id=user_id, invoice_no=new_invoice_no)
        new_storage_url = storage_result.get("url")

        # --- 5. UPSERT BUYER RECORD ---
        buyer_payload = data.get("buyer", {})
        buyer_name = buyer_payload.get("name")
        
        buyer_data_to_upsert = {
            "user_id": str(user_id), "name": buyer_name, "address": buyer_payload.get("address"),
            "state": buyer_payload.get("state"), "gstin": buyer_payload.get("gstin"),
            "phone_no": buyer_payload.get("phone_no"), "email": buyer_payload.get("email")
        }
        # Use upsert to either update an existing buyer or create a new one
        buyer_response = supabase.table("buyers_record").upsert(buyer_data_to_upsert, on_conflict="user_id, name", returning="representation").execute()
        if not buyer_response.data:
            raise Exception("Failed to upsert buyer record.")
        buyer_id = buyer_response.data[0]["id"]
            
        # --- 6. UPDATE INVOICE RECORD ---
        invoice_payload = data.get("invoice", {})
        invoice_data_to_update = {
            "buyer_id": buyer_id,
            "title": invoice_payload.get("title"),
            "number": new_invoice_no, 
            "date": invoice_payload.get("date"),
            "due_date": invoice_payload.get("due_date"), 
            "terms_and_conditions": data.get("terms_and_conditions", []),
            "invoice_url": new_storage_url, 
            "payment_reminder_enabled": data.get("set_payment_reminder", False)
        }
        supabase.table("invoices_record").update(invoice_data_to_update).eq("id", invoice_id).execute()

        # --- 7. UPDATE ITEMS (DELETE ALL AND RE-INSERT) ---
        supabase.table("items_record").delete().eq("invoice_id", invoice_id).execute()
        items_payload = data.get("items", [])
        if items_payload:
            items_to_insert = [
                {**item, "invoice_id": invoice_id} for item in items_payload
            ]
            supabase.table("items_record").insert(items_to_insert).execute()
        
        # --- 8. HANDLE BACKGROUND TASKS & EMBEDDINGS ---
        if items_payload:
            background_tasks.add_task(background_update_inventory, user_id, items_payload)

        if data.get("auto_send_email", False):
            seller_info = supabase.table("sellers_record").select("name").eq("id", seller_id).single().execute()
            seller_name = seller_info.data.get("name", "Your Company") if seller_info.data else "Your Company"
            email_details = {
                "invoice_no": new_invoice_no, "buyer_name": buyer_name, "buyer_email": buyer_payload.get("email"),
                "company_name": seller_name, "invoice_url": new_storage_url
            }
            background_tasks.add_task(background_send_invoice_email, user_id, email_details)
        
        supabase.table("invoice_embeddings").delete().eq("invoice_id", invoice_id).execute()
        embed_and_store_invoice(invoice_id, data)

        return {"message": "Invoice updated successfully", "invoice_id": invoice_id, "url": new_storage_url}

    except HTTPException as e:
        raise e # Re-raise known HTTP exceptions
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        # --- 9. CLEANUP TEMP FILE ---
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)

# --- Pydantic Model for Validation ---
class SellerProfile(BaseModel):
    name: str
    address: Optional[str] = None
    gst_no: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    bank_name: Optional[str] = None
    account_no: Optional[str] = None
    ifsc_code: Optional[str] = None
    logo: Optional[str] = None
    sign: Optional[str] = None
    stamp: Optional[str] = None
    sender_email: Optional[EmailStr] = None
    sender_password: Optional[str] = None # Received in plaintext, encrypted before saving

@router.post("/update-seller-profile")
async def update_seller_profile(profile_data: SellerProfile, user: dict = Depends(get_current_user)):
    user_id = user.id
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        raise HTTPException(status_code=500, detail="Encryption key not configured.")

    cipher_suite = Fernet(encryption_key.encode())
    
    db_payload = profile_data.dict(exclude_unset=True)
    db_payload['user_id'] = user_id

    if profile_data.sender_password:
        encrypted_password = cipher_suite.encrypt(profile_data.sender_password.encode()).decode()
        db_payload['encrypted_sender_password'] = encrypted_password
    
    db_payload.pop('sender_password', None)
    
    try:
        response = supabase_admin.table("sellers_record") \
            .upsert(db_payload, on_conflict='user_id', returning='representation') \
            .execute()
        
        saved_data = response.data[0] if response.data else None
        if not saved_data:
            raise HTTPException(status_code=400, detail="Failed to save profile.")
            
        return saved_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")