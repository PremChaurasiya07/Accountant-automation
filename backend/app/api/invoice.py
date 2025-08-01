from fastapi import HTTPException, Request, Form, File, UploadFile,APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from app.core.supabase import supabase
from app.services.embedding import embed_and_store_invoice
from utils.upload_to_storage import upload_file
from app.deps.auth import get_current_user
from datetime import datetime
from app.services.invoice_generator import generate_invoice_pdf1, generate_invoice_pdf2,generate_invoice_pdf3
from app.services.gemini import parsed_info
from app.services.invoice_parser import parse_invoice

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
    user = await get_current_user(request)
    user_id = user.id

    # 1. Delete from sellers_record
    supabase.table("sellers_record").delete().eq("user_id", user_id).execute()

    # TODO: Delete from other tables if needed
    supabase.table("invoices_record").delete().eq("user_id", user_id).execute()

    # 2. Delete user from Supabase Auth
    supabase.delete_user(user_id)

    return {"status": "deleted", "message": "User and associated data deleted"}

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
#     try:
#         data = await request.json()
#         template_no=data.get('template_id')
#         invoice_no = data.get("invoice_no")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required")
#         print('templateid',template_no)
#         redefined_data = parsed_info(data)
#         # parsed = parse_invoice(json.loads(redefined_data))
#         parsed=json.loads(redefined_data)
        

#         # 🛑 Check if invoice already exists
#         existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).execute()
#         if existing_invoice.data and len(existing_invoice.data) > 0:
#             return {
#                 "message": f"Invoice with number {invoice_no} already exists.",
#                 "invoice_id": existing_invoice.data[0]["id"]
#             }
#         print('start')
#         pdf_path=""
#         if not template_no:
#             return {
#                 'message':'template unknown'
#             }
#         # elif template_no=='temp1':
#         # # ✅ Proceed with creation
#         #     pdf_path = generate_invoice_pdf1(parsed)
#         #     print("PDF path:", pdf_path)
#         # elif template_no=='temp2':
#         # # ✅ Proceed with creation
#         #     pdf_path = generate_invoice_pdf2(parsed)
#         #     print("PDF path:", pdf_path)
#         elif template_no=='temp1':
#             # invoice_data = json.loads(redefined_data)
#             pdf_path = generate_invoice_pdf3(json.loads(redefined_data))
#             print("PDF path:", pdf_path)

#         def normalize_date(value):
#             try:
#                 if value and value.strip():
#                     return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#             except Exception:
#                 return None
#             return None

#         user = await get_current_user(request)
#         user_id = user.id
#         if not user_id:
#             raise HTTPException(status_code=401, detail="User not logged in")

#         storage_result = await upload_file(
#             pdf_path,
#             folder="invoices",
#             user_id=user_id,
#             invoice_no=invoice_no
#         )
#         storage_url = storage_result["url"]
#         # file_path = storage_result["filename"]

#         # Insert buyer
#         buyer_data = {
#             "name": parsed["buyer"]["name"],
#             "gst_no": parsed["buyer"]["gstin"],
#             "email": "",
#             "address": parsed["buyer"]["address"],
#             "phone_no": ""
#         }
#         buyer_response = supabase.table("buyers_record").insert(buyer_data).execute()

#         if not buyer_response.data or not isinstance(buyer_response.data, list):
#             raise HTTPException(status_code=500, detail="Failed to insert buyer")
#         buyer_id = buyer_response.data[0]["id"]

#         # Get seller ID
#         seller_response = supabase.table("sellers_record").select("id").eq("user_id", user_id).single().execute()
#         if not seller_response.data:
#             raise HTTPException(status_code=404, detail="Seller not found")
#         seller_id = seller_response.data["id"]

#         # Insert invoice
#         invoice_data = {
#             "challan_date": normalize_date(parsed.get("challan_date")),
#             "challan_no": parsed.get("challan_no"),
#             "invoice_date": normalize_date(parsed["invoice"]["date"]),
#             "invoice_no": invoice_no,
#             "purchase_date": normalize_date(parsed.get("purchase_date")),
#             "purchase_no": parsed.get("purchase_no"),
#             "vehicle_no": parsed.get("vehicle_no"),
#             "invoice_url": storage_url,
#             "buyer_id": buyer_id,
#             "seller_id": seller_id,
#             "template_no":parsed.get("template_id", template_no),
#             "user_id":user_id
#         }

#         invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
#         invoice_id = invoice_response.data[0]["id"]
#         print("start")
#         # Insert items
#         records = []
#         for item in parsed.get("items", []):
#             records.append({
#                 "product_id": invoice_id,
#                 "item_name": f"{item['name']}",
#                 "hsn_code": item["hsn"],
#                 "gst_rate": item["gst_rate"],
#                 "item_rate": item["amount"],
#                 "per_unit": item["rate"],
#                 "qty": item["quantity"],
#             })

#         supabase.table("items_record").insert(records).execute()


#         if os.path.exists(pdf_path):
#             os.remove(pdf_path)

#         return {
#             "message": "Invoice created successfully",
#             "invoice_id": invoice_id,
#             "url": storage_url
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")


# @router.post("/edit")
# async def edit_invoice(request: Request):
#     try:
#         print('a')
#         data = await request.json()
#         print('b')
#         # Parse and validate invoice data
#         try:
#             redefined_data = parsed_info(data)
#             parsed=json.loads(redefined_data)
#             # parsed = parse_invoice(json.loads(redefined_data))
#         except Exception as parse_error:
#             raise HTTPException(status_code=400, detail=f"Parsing failed: {str(parse_error)}")
#         print('c')

#         invoice_no = data.get("invoice_no")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required")

#         user = await get_current_user(request)
#         user_id = user.id
#         if not user_id:
#             raise HTTPException(status_code=401, detail="User not logged in")

#         # Get existing invoice
#         invoice_resp = supabase.table("invoices_record").select("*").eq("invoice_no", invoice_no).single().execute()
#         if not invoice_resp.data:
#             raise HTTPException(status_code=404, detail="Invoice not found")

#         invoice_id = invoice_resp.data["id"]
#         old_url = invoice_resp.data.get("invoice_url")
#         template_no = invoice_resp.data.get("template_no")
#         if not template_no:
#             return 'templateid not found'

#         # Remove old invoice PDF if it exists
#         if old_url:
#             filename = old_url.split("/")[-1].split("?")[0]
#             supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])  # no await
#             print("Removed old invoice file:", filename)

#         # Generate new invoice PDF
#         try:
#             if template_no=='temp1':
#                 pdf_path = generate_invoice_pdf3(parsed)
#             # elif template_no=='temp2':
#             #     pdf_path = generate_invoice_pdf2(parsed)
#             # elif template_no=='temp3':
#             #     pdf_path = generate_invoice_pdf3(parsed)
#         except Exception as pdf_error:
#             raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(pdf_error)}")

#         # Upload new invoice PDF
#         storage_result = await upload_file(
#             pdf_path,
#             folder="invoices",
#             user_id=user_id,
#             invoice_no=invoice_no
#         )
#         new_url = storage_result["url"]

#         # Helper: normalize date values
#         def normalize_date(value):
#             try:
#                 if value and value.strip():
#                     return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#             except Exception:
#                 return None
#             return None

#         # Update invoice record
#         update_data = {
#             "challan_date": normalize_date(parsed.get("challan_date")),
#             "challan_no": parsed.get("challan_no"),
#             "invoice_date": normalize_date(parsed["invoice"]["date"]),
#             "purchase_date": normalize_date(parsed.get("purchase_date")),
#             "purchase_no": parsed.get("purchase_no"),
#             "vehicle_no": parsed.get("vehicle_no"),
#             "invoice_url": new_url,
#         }

#         supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()
#         print('end')
#         # Remove old items and insert new ones
#         supabase.table("items_record").delete().eq("product_id", invoice_id).execute()
#         new_items = []
#         for item in parsed.get("items", []):
#             new_items.append({
#                 "product_id": invoice_id,
#                 "item_name": f"{item['name']}",
#                 "hsn_code": item["hsn"],
#                 "gst_rate": item["gst_rate"],
#                 "item_rate": item["amount"],
#                 "per_unit": item["rate"],
#                 "qty": item["quantity"],
#             })
#         supabase.table("items_record").insert(new_items).execute()

#         # ✅ Update buyers_record if buyer_id is provided
#         buyer_id = parsed.get("buyer_id") or data.get("buyer_id")
#         if buyer_id:
#             # print("buyerid", buyer_id)
#             buyer_update_data = {
#                 "name": parsed["buyer"]["name"],
#                 "gst_no": parsed["buyer"]["gstin"],
#                 "email": "",
#                 "address": parsed["buyer"]["address"],
#                 "phone_no": ""
#             }
#             # print("buyer_update_data before filtering", buyer_update_data)
            
#             buyer_update_data = {k: v for k, v in buyer_update_data.items() if v is not None}
#             # print("buyer_update_data", buyer_update_data)
#             supabase.table("buyers_record").update(buyer_update_data).eq("id", buyer_id).execute()
#             # print('buyer updated')

#         # Clean up temp PDF file
#         if os.path.exists(pdf_path):
#             os.remove(pdf_path)

#         return {
#             "message": "Invoice updated successfully",
#             "invoice_id": invoice_id,
#             "url": new_url
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error editing invoice: {str(e)}")



@router.post("/create")
async def create_invoice(request: Request):
    pdf_path = None
    storage_url = None # Initialize storage_url to None
    try:
        # --- STEP 1: AUTHENTICATE USER FIRST ---
        try:
            user = await get_current_user(request)
            if not user or not user.id:
                raise HTTPException(status_code=401, detail="User not authenticated or session expired.")
        except HTTPException as e:
             # If get_current_user raises an exception (e.g., token expired), catch it
             raise HTTPException(status_code=401, detail=f"Authentication failed: {e.detail}")
        
        user_id = user.id

        # --- STEP 2: PROCESS REQUEST DATA ---
        data = await request.json()
        template_no = data.get('template_id')
        invoice_no = data.get("invoice_no")
        if not invoice_no:
            raise HTTPException(status_code=400, detail="Invoice number is required")
        
        redefined_data = parsed_info(data)
        parsed = json.loads(redefined_data)

        # --- STEP 3: CHECK FOR DUPLICATE INVOICE ---
        existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).eq("user_id", user_id).execute()
        if existing_invoice.data and len(existing_invoice.data) > 0:
            return {
                "message": f"Invoice with number {invoice_no} already exists.",
                "invoice_id": existing_invoice.data[0]["id"]
            }

        # --- STEP 4: GENERATE PDF ---
        if not template_no:
            return {'message': 'template unknown'}
        elif template_no == 'temp1':
            pdf_path = generate_invoice_pdf3(parsed)
            print("PDF path:", pdf_path)

        def normalize_date(value):
            try:
                if value and value.strip():
                    return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
            except Exception:
                return None
            return None

        # --- STEP 5: UPLOAD PDF TO STORAGE ---
        storage_result = await upload_file(
            pdf_path,
            folder="invoices",
            user_id=user_id,
            invoice_no=invoice_no
        )
        storage_url = storage_result["url"]

        # --- STEP 6: DATABASE OPERATIONS (Wrapped in a try block for cleanup) ---
        try:
            # UPSERT BUYER RECORD
            buyer_data = {
                "name": parsed["buyer"]["name"],
                "gst_no": parsed["buyer"]["gstin"],
                "email": "",
                "address": parsed["buyer"]["address"],
                "phone_no": ""
            }
            buyer_response = supabase.table("buyers_record").insert(buyer_data).execute()
            buyer_id = buyer_response.data[0]["id"]

            # GET SELLER ID
            seller_response = supabase.table("sellers_record").select("id").eq("user_id", user_id).single().execute()
            if not seller_response.data:
                raise HTTPException(status_code=404, detail="Seller not found for the current user.")
            seller_id = seller_response.data["id"]

            # INSERT INVOICE & ITEM RECORDS
            invoice_data = {
                "challan_date": normalize_date(parsed.get("challan_date")),
                "challan_no": parsed.get("challan_no"),
                "invoice_date": normalize_date(parsed["invoice"]["date"]),
                "invoice_no": invoice_no,
                "purchase_date": normalize_date(parsed.get("purchase_date")),
                "purchase_no": parsed.get("purchase_no"),
                "vehicle_no": parsed.get("vehicle_no"),
                "invoice_url": storage_url,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                "template_no": parsed.get("template_id", template_no),
                "user_id": user_id
            }
            invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
            invoice_id = invoice_response.data[0]["id"]

            records = []
            for item in parsed.get("items", []):
                records.append({
                    "product_id": invoice_id,
                    "item_name": item.get('name') or item.get('description'),
                    "hsn_code": item.get("hsn"),
                    "gst_rate": item.get("gst_rate"),
                    "item_rate": item.get("amount"),
                    "per_unit": item.get("rate") or item.get("price_per_unit"),
                    "qty": item.get("quantity"),
                })
            supabase.table("items_record").insert(records).execute()

            # EMBED AND STORE INVOICE DATA
            embed_and_store_invoice(invoice_id, parsed)

        except Exception as db_error:
            # --- CLEANUP ON FAILURE ---
            print(f"Database operation failed: {db_error}. Cleaning up uploaded file.")
            if storage_url:
                # Extract filename from URL to delete from bucket
                filename = storage_url.split("/")[-1].split("?")[0]
                supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])
                print(f"Successfully deleted orphaned file from bucket: {filename}")
            # Re-raise the error to send a 500 response
            raise db_error

        return {
            "message": "Invoice created successfully",
            "invoice_id": invoice_id,
            "url": storage_url
        }
    except HTTPException as he:
        # Re-raise HTTP exceptions to be handled by FastAPI
        raise he
    except Exception as e:
        # Catch any other unexpected errors
        print(f"An unexpected error occurred in /create: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")
    finally:
        # --- FINAL CLEANUP ---
        # Always remove the local temporary PDF file if it was created
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)


@router.post("/edit")
async def edit_invoice(request: Request):
    try:
        # --- AUTHENTICATE USER FIRST ---
        try:
            user = await get_current_user(request)
            if not user or not user.id:
                raise HTTPException(status_code=401, detail="User not authenticated or session expired.")
        except HTTPException as e:
             raise HTTPException(status_code=401, detail=f"Authentication failed: {e.detail}")
        
        user_id = user.id

        data = await request.json()
        redefined_data = parsed_info(data)
        parsed = json.loads(redefined_data)

        invoice_no = data.get("invoice_no")
        if not invoice_no:
            raise HTTPException(status_code=400, detail="Invoice number is required")

        # Get existing invoice
        invoice_resp = supabase.table("invoices_record").select("*").eq("invoice_no", invoice_no).eq("user_id", user_id).single().execute()
        if not invoice_resp.data:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice_id = invoice_resp.data["id"]
        old_url = invoice_resp.data.get("invoice_url")
        template_no = invoice_resp.data.get("template_no")
        if not template_no:
            return 'templateid not found'

        # Remove old invoice PDF
        if old_url:
            filename = old_url.split("/")[-1].split("?")[0]
            supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])
            print("Removed old invoice file:", filename)

        # Generate new invoice PDF
        pdf_path = generate_invoice_pdf3(parsed)

        # Upload new invoice PDF
        storage_result = await upload_file(pdf_path, "invoices", user_id, invoice_no)
        new_url = storage_result["url"]

        def normalize_date(value):
            try:
                if value and value.strip():
                    return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
            except Exception:
                return None
            return None

        # Update invoice record
        update_data = {
            "challan_date": normalize_date(parsed.get("challan_date")),
            "challan_no": parsed.get("challan_no"),
            "invoice_date": normalize_date(parsed["invoice"]["date"]),
            "purchase_date": normalize_date(parsed.get("purchase_date")),
            "purchase_no": parsed.get("purchase_no"),
            "vehicle_no": parsed.get("vehicle_no"),
            "invoice_url": new_url,
        }
        supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()

        # Remove old items and insert new ones
        supabase.table("items_record").delete().eq("product_id", invoice_id).execute()
        new_items = []
        for item in parsed.get("items", []):
            new_items.append({
                "product_id": invoice_id,
                "item_name": item.get('name') or item.get('description'),
                "hsn_code": item.get("hsn"),
                "gst_rate": item.get("gst_rate"),
                "item_rate": item.get("amount"),
                "per_unit": item.get("rate") or item.get('price_per_unit'),
                "qty": item.get("quantity"),
            })
        supabase.table("items_record").insert(new_items).execute()

        # Update buyers_record
        buyer_id = parsed.get("buyer_id") or data.get("buyer_id")
        if buyer_id:
            buyer_update_data = {
                "name": parsed["buyer"]["name"],
                "gst_no": parsed["buyer"].get("gstin"),
                "address": parsed["buyer"]["address"],
            }
            buyer_update_data = {k: v for k, v in buyer_update_data.items() if v is not None}
            supabase.table("buyers_record").update(buyer_update_data).eq("id", buyer_id).execute()

        # --- NEW: Delete old embeddings and create new ones ---
        supabase.table("invoice_embeddings").delete().eq("invoice_id", invoice_id).execute()
        embed_and_store_invoice(invoice_id, parsed)

        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        return {
            "message": "Invoice updated successfully",
            "invoice_id": invoice_id,
            "url": new_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing invoice: {str(e)}")
