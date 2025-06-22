from app.services.invoice_generator import generate_invoice_pdf1
from fastapi import FastAPI, HTTPException, Request, Form, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from fastapi.middleware.cors import CORSMiddleware
from app.core.supabase import supabase
from app.services.gemini import parsed_info
from app.services.invoice_parser import parse_invoice
from datetime import datetime
from app.deps.auth import get_current_user
from utils.upload_to_storage import upload_file
from app.services.invoice_generator import generate_invoice_pdf3
from datetime import datetime
from app.api import auth
from app.api import invoice
from app.api import product
from datetime import date

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://vyapari.vercel.app"],  # Or restrict to your frontend origin e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)


# auth routing
app.include_router(auth.router) 

# invoice routing
app.include_router(invoice.router)

# product routing
app.include_router(product.router, prefix="/api")



# route to save user_company info
def get_user_id_from_token(token: str = Form(...)) -> str:
    # decode Supabase JWT here (or use middleware)
    # simplified for example:
    user = supabase.auth.get_user(token)
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user.user.id


class InputData(BaseModel):
    input_value: str
    invoice_no:str
   

@app.post("/parse_invoice")
async def parse_invoice_endpoint(request:Request):
    sample_data =await request.json()
    # printed_data = json.loads(parsed_info(sample_data["input_value"]))  # ✅ No await
    # print(printed_data)
    pdf_file = generate_invoice_pdf3(sample_data, "sample_invoice.pdf")
    print(f"Invoice generated: {pdf_file}")

@app.post("/voice_bot")
async def voice_bot(data:InputData,request:Request):
    print(data.input_value)
    parsed_data = json.loads(parsed_info(data.input_value))  # ✅ No await
    print(parsed_data)

    if parsed_data.get('intent')!='create':
        return {
                "message": "Not able to do that, just able to create invoice",
            }

    if parsed_data.get('intent')=='create':
       
        try:
            # data = await request.json())
            # template_no=data.get('template_id')
            # print('templateid',template_no)
            # redefined_data = parsed_info(data)
            print('a')
            invoice_no = data.invoice_no
            if not invoice_no:
                raise HTTPException(status_code=400, detail="Invoice number is required")
            print('b')
            # 🛑 Check if invoice already exists
            existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).execute()
            if existing_invoice.data and len(existing_invoice.data) > 0:
                return {
                    "message": f"Invoice with number {invoice_no} already exists.",
                    "invoice_id": existing_invoice.data[0]["id"]
                }
            print('start')
            pdf_path=generate_invoice_pdf3(parsed_data)
            print("PDF path:", pdf_path)
            # if not template_no:
            #     return {
            #         'message':'template unknown'
            #     }
            # elif template_no=='temp1':
            # # ✅ Proceed with creation
            #     pdf_path = generate_invoice_pdf1(parsed)
            #     print("PDF path:", pdf_path)
            # elif template_no=='temp2':
            # # ✅ Proceed with creation
            #     pdf_path = generate_invoice_pdf2(parsed)
            #     print("PDF path:", pdf_path)

            def normalize_date(value):
                try:
                    if isinstance(value, datetime):
                        return value.date().isoformat()
                    if isinstance(value, date):
                        return value.isoformat()
                    if value and isinstance(value, str) and value.strip():
                        return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
                except Exception as e:
                    print("Date parse error:", e)
                return None


            user = await get_current_user(request)
            user_id = user.id
            if not user_id:
                raise HTTPException(status_code=401, detail="User not logged in")

            storage_result = await upload_file(
                pdf_path,
                folder="invoices",
                user_id=user_id,
                invoice_no=invoice_no
            )
            storage_url = storage_result["url"]
            file_path = storage_result["filename"]
            print('c')
            # Insert buyer
            buyer_data = {
                "name": parsed_data["buyer"]["name"],
                "gst_no": parsed_data["buyer"]["gstin"],
                "email": "",
                "address": parsed_data["buyer"]["address"],
                "phone_no": ""
            }
            print(buyer_data)
            buyer_response = supabase.table("buyers_record").insert(buyer_data).execute()
            print('d')
            if not buyer_response.data or not isinstance(buyer_response.data, list):
                raise HTTPException(status_code=500, detail="Failed to insert buyer")
            buyer_id = buyer_response.data[0]["id"]

            # Get seller ID
            seller_response = supabase.table("sellers_record").select("id").eq("user_id", user_id).single().execute()
            if not seller_response.data:
                raise HTTPException(status_code=404, detail="Seller not found")
            seller_id = seller_response.data["id"]

            

            today = date.today()
            print(today)  # e.g. 2025-06-21

            # Insert invoice
            invoice_data = {
                "challan_date": normalize_date(parsed_data.get("challan_date")),
                "challan_no": parsed_data.get("challan_no"),
                "invoice_date": normalize_date(parsed_data.get("invoice", {}).get("date")) or today.isoformat(),
                "invoice_no": invoice_no,
                "purchase_date": normalize_date(parsed_data.get("purchase_date")),
                "purchase_no": parsed_data.get("purchase_no"),
                "vehicle_no": parsed_data.get("vehicle_no"),
                "invoice_url": storage_url,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                # "template_no":parsed_data.get("template_id", template_no),
                "user_id":user_id
            }

            invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
            invoice_id = invoice_response.data[0]["id"]

            # Insert items
            records = []
            for item in parsed_data.get("items", []):
                records.append({
                    "product_id": invoice_id,
                    "item_name": f"{item['name']}",
                    "hsn_code": item["hsn"],
                    "gst_rate": item["gst_rate"],
                    "item_rate": item["amount"],
                    "per_unit": item["rate"],
                    "qty": item["quantity"],
            })
            supabase.table("items_record").insert(records).execute()

            if os.path.exists(pdf_path):
                os.remove(pdf_path)

            return {
                "message": "Invoice created successfully",
                "invoice_id": invoice_id,
                "url": storage_url
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")





# @app.post("/seller")
# async def save_seller_details(
#     request: Request,
#     company_name: str = Form(...),
#     address: str = Form(""),
#     gstin: str = Form(""),
#     contact: str = Form(""),
#     email: str = Form(""),

#     logo: UploadFile = File(None),
#     signature: UploadFile = File(None),
#     stamp: UploadFile = File(None),
# ):
#     user = await get_current_user(request)
#     user_id = user.id  # Or `user.id` depending on Supabase response structure

#     # Upload files
#     logo_url =await upload_file(logo, "logos", user_id=user_id) if logo else None
#     signature_url =await upload_file(signature, "signatures", user_id=user_id) if signature else None
#     stamp_url =await upload_file(stamp, "stamps", user_id=user_id) if stamp else None

#     # Insert into DB
#     data = {
#         "user_id": user_id,
#         "name": company_name,
#         "address": address,
#         "gst_no": gstin,
#         "contact": contact,
#         "email": email,
#         "logo": logo_url,
#         "sign": signature_url,
#         "stamp": stamp_url,
#     }

#     res = supabase.table("sellers_record").insert(data).execute()
#     return {"status": "success", "data": res.data}





# # Pydantic schema
# class ProductItem(BaseModel):
#     pcs_or_weight: str
#     base_price: float
#     gst_rate: Optional[float] = 18.0

# class InvoiceRequest(BaseModel):
#     company_name: str
#     company_gst: str
#     company_address: str
#     product: List[ProductItem]
#     challan_date: Optional[str] = None
#     challan_no: Optional[str] = None
#     invoice_date: str
#     invoice_no: str
#     purchase_date: Optional[str] = None
#     purchase_no: Optional[str] = None
#     vehicle_no: Optional[str] = None
#     buyer_id: Optional[int] = None
#     seller_id: Optional[int] = None


# @app.post("/invoice/create")
# async def create_invoice(request: Request):
#     try:
#         data = await request.json()
#         redefined_data = parsed_info(data)
#         parsed = parse_invoice(json.loads(redefined_data))

#         invoice_no = parsed.get("invoice_no")
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required")

#         # 🛑 Check if invoice already exists
#         existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).execute()
#         if existing_invoice.data and len(existing_invoice.data) > 0:
#             return {
#                 "message": f"Invoice with number {invoice_no} already exists.",
#                 "invoice_id": existing_invoice.data[0]["id"]
#             }

#         # ✅ Proceed with creation
#         pdf_path = generate_invoice_pdf(parsed)
#         print("PDF path:", pdf_path)

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
#         file_path = storage_result["filename"]

#         # Insert buyer
#         buyer_data = {
#             "name": parsed.get("buyer_name"),
#             "gst_no": parsed.get("buyer_gstin"),
#             "email": parsed.get("buyer_email"),
#             "address": parsed.get("buyer_address"),
#             "phone_no": parsed.get("buyer_mobile")
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
#             "invoice_date": normalize_date(parsed.get("invoice_date")),
#             "invoice_no": invoice_no,
#             "purchase_date": normalize_date(parsed.get("purchase_date")),
#             "purchase_no": parsed.get("purchase_no"),
#             "vehicle_no": parsed.get("vehicle_no"),
#             "invoice_url": storage_url,
#             "buyer_id": buyer_id,
#             "seller_id": seller_id,
#         }

#         invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
#         invoice_id = invoice_response.data[0]["id"]

#         # Insert items
#         records = []
#         for item in parsed.get("product", []):
#             records.append({
#                 "product_id": invoice_id,
#                 "item_name": item.get("description"),
#                 "hsn_code": item.get("hsn", "0000"),
#                 "gst_rate": item.get("gst_rate", 0),
#                 "item_rate": item.get("rate", 0),
#                 "per_unit": item.get("per", "pcs"),
#                 "qty": item.get("pcs_or_weight", 0),
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


# @app.post("/invoice/edit")
# async def edit_invoice(request: Request):
#     try:
#         data = await request.json()

#         # Parse and validate invoice data
#         try:
#             redefined_data = parsed_info(data)
#             parsed = parse_invoice(json.loads(redefined_data))
#         except Exception as parse_error:
#             raise HTTPException(status_code=400, detail=f"Parsing failed: {str(parse_error)}")

#         invoice_no = parsed.get("invoice_no")
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

#         # Remove old invoice PDF if it exists
#         if old_url:
#             filename = old_url.split("/")[-1].split("?")[0]
#             supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])  # no await
#             print("Removed old invoice file:", filename)

#         # Generate new invoice PDF
#         try:
#             pdf_path = generate_invoice_pdf(parsed)
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
#             "invoice_date": normalize_date(parsed.get("invoice_date")),
#             "purchase_date": normalize_date(parsed.get("purchase_date")),
#             "purchase_no": parsed.get("purchase_no"),
#             "vehicle_no": parsed.get("vehicle_no"),
#             "invoice_url": new_url,
#         }

#         supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()

#         # Remove old items and insert new ones
#         supabase.table("items_record").delete().eq("product_id", invoice_id).execute()
#         new_items = []
#         for item in parsed.get("product", []):
#             new_items.append({
#                 "product_id": invoice_id,
#                 "item_name": item.get("description"),
#                 "hsn_code": item.get("hsn", "0000"),
#                 "gst_rate": item.get("gst_rate", 0),
#                 "item_rate": item.get("rate", 0),
#                 "per_unit": item.get("per", "pcs"),
#                 "qty": item.get("pcs_or_weight", 0),
#             })
#         supabase.table("items_record").insert(new_items).execute()

#         # ✅ Update buyers_record if buyer_id is provided
#         buyer_id = parsed.get("buyer_id") or data.get("buyer_id")
#         if buyer_id:
#             # print("buyerid", buyer_id)
#             buyer_update_data = {
#                 "name": parsed.get("buyer_name"),
#                 "address": parsed.get("buyer_address"),
#                 "gst_no": parsed.get("buyer_gstin"),
#                 "phone_no": parsed.get("buyer_mobile")
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


